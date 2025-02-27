
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Check, X } from "lucide-react";
import { useContract } from "@/hooks/useContract";
import { toast } from "sonner";

const VerifyCertificate = () => {
  const { verifyCertificate } = useContract();
  const [tokenId, setTokenId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    owner: string;
    uri: string;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setVerificationResult(null);

    try {
      const result = await verifyCertificate(parseInt(tokenId));
      setVerificationResult({
        isValid: !result.isRevoked,
        owner: result.owner,
        uri: result.uri,
      });
    } catch (error) {
      console.error("Error verifying certificate:", error);
      toast.error("Failed to verify certificate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">Verify Certificate</h1>
          <p className="text-gray-500 mt-2">
            Check the authenticity of an NFT certificate
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
      >
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate Token ID
            </label>
            <input
              type="number"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Enter token ID..."
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify Certificate"}
          </button>
        </form>

        {verificationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-100"
          >
            <div className="flex items-center space-x-4">
              {verificationResult.isValid ? (
                <div className="bg-green-100 p-3 rounded-full">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="bg-red-100 p-3 rounded-full">
                  <X className="h-6 w-6 text-red-600" />
                </div>
              )}
              <div>
                <h3 className="font-medium">
                  Certificate is {verificationResult.isValid ? "Valid" : "Invalid"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Owner: {verificationResult.owner}
                </p>
                <a
                  href={verificationResult.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-1 block"
                >
                  View Metadata
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyCertificate;
