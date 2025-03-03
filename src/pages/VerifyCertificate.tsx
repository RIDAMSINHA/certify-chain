import { motion } from "framer-motion";
import { Shield, Search, Loader2, Users } from "lucide-react";
import { VerifyBlockchainCertificate } from "@/components/VerifyBlockchainCertificate";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Certificate {
  blockchain_cert_id: string;
  title: string;
  issuer_id: string;
  recipient_address: string;
  description: string;
  status: string;
  created_at: string;
  public_url: string;
  computedVerified: boolean;
}

const VerifyCertificate = () => {
  const [showcaseId, setShowcaseId] = useState("");
  const [showcaseVerifying, setShowcaseVerifying] = useState(false);
  const [showcaseCertificates, setShowcaseCertificates] = useState<
    Certificate[]
  >([]);
  const [showcaseVerified, setShowcaseVerified] = useState(false);

  const verifyShowcase = async () => {
    if (!showcaseId.trim()) {
      toast.error("Please enter a showcase ID");
      return;
    }

    setShowcaseVerifying(true);
    setShowcaseCertificates([]);
    setShowcaseVerified(false);

    try {
      // Parse showcase ID - could be a full URL or just the ID part.
      let parsedShowcaseId = showcaseId;
      // Check for both possible URL parts
      if (showcaseId.includes("/userprofile/")) {
        parsedShowcaseId = showcaseId.split("/userprofile/")[1];
      } else if (showcaseId.includes("/showcase/")) {
        parsedShowcaseId = showcaseId.split("/showcase/")[1];
      }
      // Decode URI component to convert %2C into commas
      parsedShowcaseId = decodeURIComponent(parsedShowcaseId);

      // Split the certificate IDs (assuming they are comma-separated)
      const certificateIds = parsedShowcaseId.split(",");

      // Fetch all certificates in the showcase (assuming comma-separated IDs)
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .in("public_url", certificateIds);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No certificates found in this showcase");
        return;
      }

      //consider a certificate valid if its status is "issued" and it has a blockchain_cert_id.
      const processedCertificates = data.map((cert) => {
        const isValid = cert.status === "issued" && !!cert.blockchain_cert_id;
        return { ...cert, computedVerified: isValid };
      });

      setShowcaseCertificates(processedCertificates);

      // Check if all certificates are verified
      const allVerified = processedCertificates.every(
        (cert) => cert.computedVerified
      );
      setShowcaseVerified(allVerified);

      if (allVerified) {
        toast.success("All certificates in showcase verified successfully!");
      } else {
        toast.warning(
          "Some certificates in the showcase could not be verified"
        );
      }
    } catch (error) {
      console.error("Error verifying showcase:", error);
      toast.error("Failed to verify showcase. Provide showcase URL or IDs");
    } finally {
      setShowcaseVerifying(false);
    }
  };

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
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold">Verify Certificate</h1>
            <p className="text-gray-500 mt-2 mb-8">
              Verify the authenticity of a certificate
            </p>
          </motion.div>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="single">Single Certificate</TabsTrigger>
            <TabsTrigger value="showcase">Certificate Showcase</TabsTrigger>
          </TabsList>

          {/* Render only the VerifyBlockchainCertificate component for single certificate */}
          <TabsContent value="single">
            <VerifyBlockchainCertificate />
          </TabsContent>

          {/* Render the certificate showcase UI */}
          <TabsContent value="showcase">
            <Card className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">
                Verify Certificate Showcase
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter showcase URL or IDs (comma-separated)"
                  value={showcaseId}
                  onChange={(e) => setShowcaseId(e.target.value)}
                  disabled={showcaseVerifying}
                />
                <Button
                  onClick={verifyShowcase}
                  disabled={showcaseVerifying}
                  className="whitespace-nowrap"
                >
                  {showcaseVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Verify All
                    </>
                  )}
                </Button>
              </div>

              {showcaseCertificates.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div
                    className={`p-4 rounded-lg ${
                      showcaseVerified
                        ? "bg-green-50 border border-green-100"
                        : "bg-amber-50 border border-amber-100"
                    }`}
                  >
                    <p
                      className={`font-medium ${
                        showcaseVerified ? "text-green-700" : "text-amber-700"
                      }`}
                    >
                      {showcaseVerified
                        ? "All certificates in this showcase are valid"
                        : "Some certificates in this showcase could not be verified"}
                    </p>
                  </div>

                  <h3 className="text-lg font-medium mt-4">
                    Certificate Details
                  </h3>
                  {showcaseCertificates.map((cert) => (
                    <div
                      key={cert.blockchain_cert_id}
                      className={`p-4 rounded-lg border ${
                        cert.computedVerified
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{cert.title}</h4>
                          <p className="text-sm text-gray-600">
                            Issued to: {cert.recipient_address}
                          </p>
                        </div>
                        <div
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            cert.computedVerified
                              ? "bg-green-200 text-green-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          {cert.computedVerified ? "Verified" : "Not Verified"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VerifyCertificate;
