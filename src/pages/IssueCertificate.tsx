
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FilePlus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Calendar, ExternalLink, Eye } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

interface Certificate {
  id: string;
  title: string;
  recipient_address: string;
  description: string;
  status: string;
  created_at: string;
  public_url: string;
}

const IssueCertificate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    recipient_address: "",
  });
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssuedCertificates();
  }, []);

  const fetchIssuedCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load issued certificates");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate Ethereum address
      if (!formData.recipient_address.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error("Invalid Ethereum address");
      }

      const { error } = await supabase
        .from("certificates")
        .insert([
          {
            ...formData,
            issuer_id: user?.id,
            status: "public",
          },
        ]);

      if (error) throw error;

      toast.success("Certificate issued successfully!");
      setFormData({ title: "", recipient_address: "", description: "" });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error issuing certificate:", error);
      toast.error(error.message || "Failed to issue certificate");
    } finally {
      setIsLoading(false);
    }
  };

  const viewCertificate = (publicUrl: string) => {
    navigate(`/certificates/${publicUrl}`);
  };

  const shareUrl = (publicUrl: string) => {
    const shareableUrl = `${window.location.origin}/certificates/${publicUrl}`;
    navigator.clipboard.writeText(shareableUrl);
    toast.success("Share link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <FilePlus className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold">Issue New Certificate</h1>
            <p className="text-gray-500 mt-2">
              Create a new NFT certificate for a recipient
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificate Title
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Web Development Certification"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Enter certificate description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Wallet Address
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0x..."
                value={formData.recipient_address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recipient_address: e.target.value,
                  })
                }
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                "Issuing..."
              ) : (
                <>
                  <span>Issue Certificate</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mt-16 mb-6">Issued Certificates</h2>
        <div className="grid gap-6">
          {certificates.map((cert) => (
            <Card
              key={cert.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => viewCertificate(cert.public_url)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Award className="w-10 h-10 text-blue-500" />
                  <div>
                    <h3 className="text-xl font-semibold">{cert.title}</h3>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(cert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">
                      Recipient: {cert.recipient_address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewCertificate(cert.public_url);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      shareUrl(cert.public_url);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {certificates.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">
                No Certificates Issued
              </h3>
              <p className="text-gray-500 mt-2">
                Start issuing certificates to see them here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueCertificate;
