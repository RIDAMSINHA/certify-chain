import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Check, X, Loader2, AlertCircle, Clock, Award, File, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { blockchainService } from "@/utils/blockchain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function VerifyBlockchainCertificate() {
  const [certId, setCertId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null
  );
  const [certificateDetails, setCertificateDetails] = useState<any>(null);
  const [isUserRegistered, setIsUserRegistered] = useState(blockchainService.isUserRegistered());
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: "",
    isHR: false,
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleVerify = async () => {
    if (!certId) {
      toast.error("Please enter a certificate ID or URL");
      return;
    }

    // Check if user is registered
    if (!isUserRegistered) {
      toast.error("You need to register first to verify certificates");
      setShowRegistrationForm(true);
      return;
    }

    setVerifying(true);
    setVerificationResult(null);
    setCertificateDetails(null);

    try {
      let processedCertId = certId.trim();
      console.log("Processing certificate ID:", processedCertId);

      // Check if it's a URL, extract the certificate ID from the Supabase record
      if (processedCertId.includes("/") || !processedCertId.startsWith("0x")) {
        // Extract certificate ID from URL if possible
        const urlIdMatch = processedCertId.match(/\/([^\/]+)$/);
        const urlId = urlIdMatch ? urlIdMatch[1] : processedCertId; // Use the entire ID if no match

        try {
          // First try to directly verify if the ID is a blockchain ID in hex format
          if (/^[0-9a-f]{64}$/i.test(urlId)) {
            // It's already a valid blockchain hash, just add 0x prefix if missing
            processedCertId = urlId.startsWith('0x') ? urlId : `0x${urlId}`;
          } else {
            // Try to find certificate by blockchain_cert_id first
            let { data, error } = await supabase
              .from("certificates")
              .select("blockchain_cert_id")
              .eq("blockchain_cert_id", urlId)
              .maybeSingle();

            // If no results, try by public_url
            if (error || !data || !data.blockchain_cert_id) {
              // Query the certificate from Supabase by public_url
              const result = await supabase
                .from("certificates")
                .select("blockchain_cert_id")
                .eq("public_url", urlId)
                .maybeSingle();
              
              data = result.data;
              error = result.error;
            }

            if (error || !data || !data.blockchain_cert_id) {
              toast.error("No certificate found for the provided ID or URL");
              setVerifying(false);
              return;
            }
            
            // Use the blockchain certificate ID from the certificate record.
            processedCertId = data.blockchain_cert_id;
          }
        } catch (error) {
          console.error("Error processing certificate ID:", error);
          toast.error("Invalid certificate ID or URL format");
          setVerifying(false);
          return;
        }
      }
      
      console.log("Verifying certificate ID:", processedCertId);
      
      // Use getCertificateDetails instead of verifyCertificate for more accurate verification
      const certDetails = await blockchainService.getCertificateDetails(processedCertId);
      
      // Store the full certificate details
      setCertificateDetails(certDetails);
      
      if (certDetails && certDetails.recipient !== '0x0000000000000000000000000000000000000000') {
        // If we have valid certificate details and recipient is not zero address
        setVerificationResult(certDetails.isValid);
        
        if (certDetails.isValid) {
          toast.success("Certificate verified on blockchain!");
        } else {
          toast.warning("Certificate exists but has been revoked");
        }
      } else {
        // Certificate doesn't exist on the blockchain
        setVerificationResult(false);
        toast.error("Certificate not found on blockchain");
      }
    } catch (error) {
      console.error("Error verifying certificate:", error);
      toast.error(
        "Verification failed. Please check the certificate ID and try again."
      );
      setVerificationResult(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    
    try {
      const success = await blockchainService.signup(
        registrationData.name,
        registrationData.isHR
      );
      
      if (success) {
        setIsUserRegistered(true);
        setShowRegistrationForm(false);
        toast.success("Registration successful!");
      }
    } catch (error) {
      console.error("Error registering user:", error);
      toast.error("Failed to register user");
    } finally {
      setIsRegistering(false);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shortenAddress = (address: string) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') return "Unknown";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Verify Blockchain Certificate</h2>
        <p className="text-gray-600">
          Enter the blockchain certificate ID or full certificate URL to verify
          its authenticity and validity.
        </p>

        {!isUserRegistered && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle>Registration Required</AlertTitle>
            <AlertDescription>
              You need to register before verifying certificates on the blockchain.
              <br />
              <Button
                onClick={() => setShowRegistrationForm(true)}
                variant="outline"
                size="sm"
                className="mt-2 border-yellow-400 text-yellow-700 hover:bg-yellow-100"
              >
                Register Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Registration Form */}
        {showRegistrationForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">Register Your Account</h2>
            <form onSubmit={handleRegistration} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your full name"
                  value={registrationData.name}
                  onChange={(e) =>
                    setRegistrationData({ ...registrationData, name: e.target.value })
                  }
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isHR_verify"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={registrationData.isHR}
                  onChange={(e) =>
                    setRegistrationData({ ...registrationData, isHR: e.target.checked })
                  }
                />
                <label htmlFor="isHR_verify" className="ml-2 block text-sm text-gray-700">
                  Register as HR (optional for verification)
                </label>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="mr-2"
                  onClick={() => setShowRegistrationForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isRegistering || !registrationData.name}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Enter certificate ID (0x...) or URL"
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            className="flex-1"
            disabled={verifying}
          />
          <Button
            onClick={handleVerify}
            disabled={verifying || !certId || !isUserRegistered}
            className="whitespace-nowrap"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Certificate"
            )}
          </Button>
        </div>

        {verificationResult !== null && (
          <div className="mt-4">
            <div className={`p-6 rounded-lg ${
              verificationResult
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${
                  verificationResult
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {verificationResult ? (
                    <Shield className="w-6 h-6" />
                  ) : (
                    <X className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    verificationResult ? "text-green-800" : "text-red-800"
                  }`}>
                    {verificationResult
                      ? "Valid Certificate"
                      : certificateDetails && certificateDetails.recipient !== '0x0000000000000000000000000000000000000000'
                        ? "Revoked Certificate"
                        : "Certificate Not Found"
                    }
                  </h3>
                  <p className={`text-sm ${
                    verificationResult ? "text-green-600" : "text-red-600"
                  }`}>
                    {verificationResult
                      ? "This certificate is valid and has been verified on the blockchain."
                      : certificateDetails && certificateDetails.recipient !== '0x0000000000000000000000000000000000000000'
                        ? "This certificate exists but has been revoked."
                        : "This certificate was not found on the blockchain."
                    }
                  </p>
                </div>
              </div>

              {/* Display certificate details if found */}
              {certificateDetails && certificateDetails.recipient !== '0x0000000000000000000000000000000000000000' && (
                <div className="mt-4 space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Certificate Details</h4>
                    
                    <div className="space-y-3">
                      {certificateDetails.name && (
                        <div className="flex items-center">
                          <Award className="w-4 h-4 text-blue-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Name</p>
                            <p className="text-sm font-medium">{certificateDetails.name}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-blue-500 mr-2" />
                        <div>
                          <p className="text-xs text-gray-500">Issuer</p>
                          <p className="text-sm font-medium">{shortenAddress(certificateDetails.issuer)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <File className="w-4 h-4 text-blue-500 mr-2" />
                        <div>
                          <p className="text-xs text-gray-500">Recipient</p>
                          <p className="text-sm font-medium">{shortenAddress(certificateDetails.recipient)}</p>
                        </div>
                      </div>
                      
                      {certificateDetails.ipfsHash && (
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-blue-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">IPFS Hash</p>
                            <p className="text-sm font-medium overflow-hidden text-ellipsis">
                              {certificateDetails.ipfsHash?.substring(0, 20)}...
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {certificateDetails.issueDate > 0 && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-blue-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Issue Date</p>
                            <p className="text-sm font-medium">{formatDate(certificateDetails.issueDate)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
