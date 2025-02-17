
import { motion } from "framer-motion";
import { Shield, Scroll, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (typeof window.ethereum !== "undefined") {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        navigate("/dashboard");
      } else {
        throw new Error("Please install MetaMask");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Secure Verification",
      description: "Instant and tamper-proof verification of certificates on the blockchain"
    },
    {
      icon: Scroll,
      title: "NFT Certificates",
      description: "Unique, non-transferable certificates issued as Soulbound NFTs"
    },
    {
      icon: User,
      title: "Digital Identity",
      description: "Build your digital identity with verifiable credentials"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container px-4 py-16 mx-auto">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4 px-4 py-1.5 bg-slate-900 text-white text-sm rounded-full"
          >
            Decentralized Certification Platform
          </motion.div>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            The Future of Digital Credentials
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Issue, verify, and manage tamper-proof digital certificates powered by blockchain technology
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-75"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </motion.button>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="glass-card p-6 rounded-xl hover-lift"
            >
              <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center mb-4">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
