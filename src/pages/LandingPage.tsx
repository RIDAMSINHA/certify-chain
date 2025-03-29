
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { motion } from "framer-motion";
import { CheckCircle, FileText, Globe, ShieldAlert, Bot,Database } from "lucide-react";
import React from "react"


export default function LandingPage(){

  const navigate = useNavigate();

  const features = [
    {
      icon: CheckCircle,  
      title: "Instant Verification",
      description: "Issue and verify blockchain certificates instantly." 
    },
    {
      icon: FileText,  
      title: "Standardization Across Industries",
      description:
        "Issue unique, tamper-proof, non-transferable certificates." 
    },

    {
      icon: ShieldAlert,  
      title: "Fraud Prevention",
      description:  
        "Ensure authenticity with blockchain-powered certification." 
    },

  ];


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container px-4 py-16 mx-auto">
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
           Secure & Verified
          </motion.div>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Manage and Verify Certificates Seamlessly
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            A blockchain-powered platform to issue, manage, and verify certificates with ease.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/auth")}
            className="px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            {/* {isIssuer ? "Issue Certificate" : "View Certificates"} */}
            Get Started
          </motion.button>
        </motion.div>

        {/* <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
        </div> */}

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4 py-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.2 }}
                            className="bg-white shadow-lg rounded-xl p-6 border border-slate-300 hover:shadow-2xl transition-transform transform hover:scale-105"
                        >
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center mb-4">
                                {React.createElement(feature.icon, { size: 24 })}
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-slate-600">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
      </div>
    </div>
  );
}