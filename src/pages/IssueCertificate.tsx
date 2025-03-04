import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FilePlus,
  ArrowRight,
  Wand2,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Calendar, ExternalLink, Eye, Building } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import {
  generateCertificateDescription,
  validateCertificateContent,
} from "@/utils/ai";
import { blockchainService } from "@/utils/blockchain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Certificate {
  blockchain_cert_id: string;
  title: string;
  recipient_address: string;
  description: string;
  status: string;
  created_at: string;
  public_url: string;
  priority: number;
  issuer_id: string;
}

const IssueCertificate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    recipient_address: "",
    recipient_name: "",
    ipfshash: "",
  });
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  useEffect(() => {
    checkWalletConnection();
    fetchIssuedCertificates();

    // Listen for account changes in MetaMask
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          setIsWalletConnected(true);
          toast.success("Wallet account changed");
        } else {
          setCurrentAccount(null);
          setIsWalletConnected(false);
          toast.error("Wallet disconnected");
        }
      });
    }
  }, []);

  const checkWalletConnection = async () => {
    const isConnected = blockchainService.isConnected();
    setIsWalletConnected(isConnected);
    
    if (isConnected) {
      const account = blockchainService.getCurrentAccount();
      setCurrentAccount(account);
    }
  };

  const connectWallet = async () => {
    try {
      const address = await blockchainService.connectWallet();
      if (address) {
        setIsWalletConnected(true);
        setCurrentAccount(address);
        toast.success("Wallet connected successfully");
      }
    } catch (error) {
      toast.error("Failed to connect wallet");
    }
  };

  const switchAccount = async () => {
    setIsSwitchingAccount(true);
    try {
      const newAccount = await blockchainService.switchAccount();
      if (newAccount) {
        setCurrentAccount(newAccount);
      }
    } catch (error) {
      console.error("Error switching accounts:", error);
      toast.error("Failed to switch account");
    } finally {
      setIsSwitchingAccount(false);
    }
  };
  
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

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const description = await generateCertificateDescription(formData.title);
      setFormData({ ...formData, description });
      toast.success("Description generated successfully");
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Failed to generate description");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const validateCertificate = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateCertificateContent(
        formData.title,
        formData.description
      );
      setValidationResult(result);

      if (result.isValid) {
        toast.success(`Certificate content validated (Score: ${result.score})`);
      } else {
        toast.warning("Certificate content needs improvement");
      }
    } catch (error) {
      console.error("Error validating certificate:", error);
      toast.error("Failed to validate certificate");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.recipient_address.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error("Invalid Ethereum address");
      }

      let blockchainCertId = null;

      // Issue certificate on blockchain if wallet is connected
      if (isWalletConnected) {
        console.log(
          "IPFS hash:",
          formData.ipfshash,
          formData.recipient_name,
          formData.recipient_address
        );
        const blockchainResult = await blockchainService.issueCertificate(
          formData.recipient_name,
          formData.recipient_address,
          formData.ipfshash
        );
        console.log("Blockchain result:", blockchainResult);
        if (blockchainResult) {
          blockchainCertId = blockchainResult.certId;
          await blockchainResult.tx.wait();
          toast.success("Certificate issued on blockchain");
        }
      }

      const data = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user?.id)
        .maybeSingle();

      // Save to Supabase
      const { error } = await supabase.from("certificates").insert([
        {
          title: formData.title,
          description: formData.description,
          recipient_address: formData.recipient_address,
          issuer_id: data.data.wallet_address,
          status: "issued",
          blockchain_cert_id: blockchainCertId,
          metadata_uri: formData.ipfshash,
        },
      ]);

      if (error) throw error;

      toast.success("Certificate issued successfully!");
      setFormData({
        title: "",
        description: "",
        recipient_address: "",
        recipient_name: "",
        ipfshash: "",
      });
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
              Create a new certificate for a recipient
            </p>
          </motion.div>
        </div>

        {/* Wallet connection alert */}
        {!isWalletConnected ? (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle>Blockchain Integration Available</AlertTitle>
            <AlertDescription>
              Connect your wallet to issue certificates on the blockchain for
              enhanced security and verification. <br />
              <Button
                onClick={connectWallet}
                variant="outline"
                size="sm"
                className="mt-2 border-yellow-400 text-yellow-700 hover:bg-yellow-100"
              >
                Connect Wallet
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-green-50 border-green-200">
            <div className="flex justify-between items-center w-full">
              <div>
                <AlertTitle className="text-green-700">Wallet Connected</AlertTitle>
                <AlertDescription className="text-green-600">
                  Current account: {blockchainService.shortenAddress(currentAccount || '')}
                </AlertDescription>
              </div>
              <Button
                onClick={switchAccount}
                variant="outline"
                size="sm"
                className="border-green-400 text-green-700 hover:bg-green-100"
                disabled={isSwitchingAccount}
              >
                {isSwitchingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Switch Account
                  </>
                )}
              </Button>
            </div>
          </Alert>
        )}

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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription || !formData.title}
                >
                  {isGeneratingDescription ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
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
                IPFS Hash
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter IPFS hash"
                value={formData.ipfshash}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ipfshash: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Name (for Blockchain)
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter recipient's full name"
                value={formData.recipient_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recipient_name: e.target.value,
                  })
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

            {validationResult && (
              <div
                className={`p-4 rounded-lg ${
                  validationResult.isValid ? "bg-green-50" : "bg-yellow-50"
                }`}
              >
                <h4 className="font-medium mb-2">AI Validation Results</h4>
                <p className="text-sm mb-2">
                  Score: {validationResult.score}/100
                </p>
                <p className="text-sm mb-2">{validationResult.feedback}</p>
                {validationResult.suggestedImprovements.length > 0 && (
                  <ul className="text-sm list-disc list-inside">
                    {validationResult.suggestedImprovements.map(
                      (improvement: string, index: number) => (
                        <li key={index}>{improvement}</li>
                      )
                    )}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={validateCertificate}
                disabled={
                  isValidating || !formData.title || !formData.description
                }
                className="flex-1 flex items-center justify-center space-x-2 py-6 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate Content"
                )}
              </Button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Issuing...
                  </>
                ) : (
                  <>
                    <span>Issue Certificate</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mt-16 mb-6">Issued Certificates</h2>
        <div className="grid gap-6">
          {certificates.map((cert) => (
            <Card
              key={cert.blockchain_cert_id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => viewCertificate(cert.public_url)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Award
                    className={`w-10 h-10 ${
                      cert.priority === 1 ? "text-yellow-500" : "text-blue-500"
                    }`}
                  />
                  <div>
                    <h2 className="text-xl font-semibold">{cert.title}</h2>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Building className="w-4 h-4" />
                      <span>Issued by: {cert.issuer_id}</span>
                      <Calendar className="w-4 h-4 ml-2" />
                      <span>
                        {new Date(cert.created_at).toLocaleDateString()}
                      </span>
                    </div>
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
