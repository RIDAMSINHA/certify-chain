import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  Award,
  Building,
  Calendar,
  Lock,
  User,
  MapPin,
  Briefcase,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { analyzeCertificateValue } from "@/utils/ai";

interface Certificate {
  id: string;
  title: string;
  issuer_id: string;
  public_url: string;
  created_at: string;
  description?: string;
}

interface CertificateInsight {
  industryDemand: string;
  careerOpportunities: string[];
  salaryImpact: string;
  futureRelevance: string;
}

interface UserProfile {
  id: string;
  name: string;
  wallet_address: string;
}

const ProfileView = () => {
  const { certificates: certificateUrls } = useParams();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const location = useLocation();
  const [profileAnalysis, setProfileAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (certificateUrls) {
      fetchCertificates(certificateUrls.split(","));
    }
  }, [certificateUrls]);

  const fetchCertificates = async (urls: string[]) => {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .in("public_url", urls);

      if (error) throw error;
      setCertificates(data || []);

      // Fetch user profile information using the recipient_address from the first certificate
      if (data && data.length > 0) {
        setCertificates(data);

        // Fetch user profile information using the recipient_address from the first certificate
        const recipientAddress = data[0].recipient_address;
        await fetchUserProfile(recipientAddress);

        // Generate portfolio analysis
        generatePortfolioAnalysis(data);
      } else {
        setCertificates([]);
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (walletAddress: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const generatePortfolioAnalysis = async (certificates: Certificate[]) => {
    if (certificates.length === 0) return;

    setIsAnalyzing(true);
    try {
      // Create a combined prompt with all certificates
      const combinedTitles = certificates.map((cert) => cert.title).join(", ");
      const combinedDescriptions = certificates
        .map((cert) => cert.description || "")
        .filter((desc) => desc.length > 0)
        .join(". ");

      // Get market insights for the combined portfolio
      const insights = await analyzeCertificateValue(
        combinedTitles,
        combinedDescriptions
      );

      // Format the analysis into readable text
      const analysis = `
        This candidate has ${certificates.length} verified certificate${
        certificates.length > 1 ? "s" : ""
      }.

        **Industry Demand:**
        ${insights.industryDemand}

        **Career Opportunities:**
        ${insights.careerOpportunities.map((opp) => `- ${opp}`).join("\n")}

        **Salary Impact:**
        ${insights.salaryImpact}

        **Future Relevance:**
        ${insights.futureRelevance}

        **Summary:** This portfolio demonstrates expertise in ${combinedTitles}. All certificates are blockchain-verified and authentic.
      `;

      setProfileAnalysis(analysis);
    } catch (error) {
      console.error("Error generating portfolio analysis:", error);
      setProfileAnalysis("Unable to generate portfolio analysis at this time.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewCertificateDetails = (publicUrl: string | undefined) => {
    if (!publicUrl) {
      toast.error("Certificate link is not available");
      return;
    }

    if (user) {
      // If user is logged in, navigate directly to certificate view
      navigate(`/certificates/${publicUrl}`);
    } else {
      // If not logged in, show toast and navigate to auth page
      toast.info("Please log in to view certificate details");
      // Store the intended redirect URL in session storage
      sessionStorage.setItem(
        "redirectAfterLogin",
        `/certificates/${publicUrl}`
      );
      navigate("/auth");
    }
  };

  const handleGoBack = () => {
    navigate(-1); // Navigate to previous page in history
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 flex items-center gap-2"
          onClick={handleGoBack}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        {userProfile && (
          <Card className="p-6 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{userProfile.name}</h1>
                <p className="text-gray-500 truncate max-w-md">
                  Wallet: {userProfile.wallet_address}
                </p>
              </div>
            </div>
          </Card>
        )}

        <h1 className="text-3xl font-bold mb-8">Certificate Showcase</h1>

        {/* AI Portfolio Analysis */}
        {isAnalyzing ? (
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
              <p>Analyzing certificate portfolio...</p>
            </div>
          </Card>
        ) : (
          profileAnalysis && (
            <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Award className="w-5 h-5 text-blue-600 mr-2" />
                AI Portfolio Analysis
              </h2>
              <div className="prose prose-blue max-w-none">
                {profileAnalysis.split("\n\n").map((paragraph, idx) => {
                  if (paragraph.startsWith("**")) {
                    // This is a section header
                    const [header, content] = paragraph.split(":\n");
                    return (
                      <div key={idx} className="mb-4">
                        <h3 className="text-md font-semibold text-blue-700">
                          {header.replace(/\*\*/g, "")}
                        </h3>
                        {content && <p className="text-gray-700">{content}</p>}
                      </div>
                    );
                  } else if (paragraph.includes("- ")) {
                    // This is a list
                    return (
                      <ul
                        key={idx}
                        className="list-disc list-inside text-gray-700 mb-4"
                      >
                        {paragraph.split("\n").map((item, i) => (
                          <li key={i}>{item.replace("- ", "")}</li>
                        ))}
                      </ul>
                    );
                  } else {
                    // Regular paragraph
                    return (
                      <p key={idx} className="text-gray-700 mb-4">
                        {paragraph}
                      </p>
                    );
                  }
                })}
              </div>
            </Card>
          )
        )}

        <div className="grid gap-6">
          {certificates.map((cert) => (
            <Card
              key={cert.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <Award className="w-10 h-10 text-blue-500" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{cert.title}</h2>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Building className="w-4 h-4" />
                    <span>Issued by: {cert.issuer_id}</span>
                    <Calendar className="w-4 h-4 ml-2" />
                    <span>
                      {new Date(cert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {cert.description && (
                    <p className="mt-2 text-gray-600">{cert.description}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => handleViewCertificateDetails(cert.public_url)}
                >
                  <Lock className="w-4 h-4" />
                  View Details
                </Button>
              </div>
            </Card>
          ))}

          {certificates.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">
                No Certificates in Showcase
              </h3>
              <p className="text-gray-500 mt-2">
                This profile has no certificates to display
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
