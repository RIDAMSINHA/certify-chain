import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { VerifyBlockchainCertificate } from "@/components/VerifyBlockchainCertificate";

const VerifyCertificate = () => {
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

        {/* Removed the "Verify by Token ID" section */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <VerifyBlockchainCertificate />
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
