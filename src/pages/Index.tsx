
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { motion } from "framer-motion";
import { CheckCircle, FileText, Globe, ShieldAlert, Bot,Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


const Index = () => {
  const navigate = useNavigate();
  const { user, isIssuer, loading } = useAuth();

  useEffect(() => {
    async function checkProfile() {
      const userId = user?.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (!profile) {
        navigate("/auth");
      }else{
          if (!loading && !user) {
            navigate("/auth");
          }
        }
      }

    checkProfile();
  }, [user, loading, navigate]);

  if (loading || !user) {
    return null;
  }

  const features = [
    {
      icon: CheckCircle,  
      title: "Instant Verification",
      description: isIssuer 
        ? "Issue and verify blockchain certificates instantly." 
        : "Easily manage and verify your blockchain certificates."
    },
    {
      icon: FileText,  
      title: "Standardization Across Industries",
      description: isIssuer 
        ? "Issue unique, tamper-proof, non-transferable certificates." 
        : "Access and verify your industry-standard blockchain certificates."
    },
    {
      icon: Globe,  
      title: "Global Accessibility",
      description: isIssuer 
        ? "Verify applicant credentials from anywhere in the world." 
        : "Create a trusted and verifiable digital identity."
    },
    {
      icon: ShieldAlert,  
      title: "Fraud Prevention",
      description: isIssuer 
        ? "Ensure authenticity with blockchain-powered certification." 
        : "Access fraud-proof, verifiable certificates."
    },
    {
      icon: Bot,  
      title: "AI Assistance",
      description: isIssuer 
        ? "Leverage AI to streamline applicant verification." 
        : "Get AI-powered insights on your digital credentials."
    },
    {
      icon: Database,  
      title: "Immutable Record Keeping",
      description: isIssuer 
        ? "Store certificates on a tamper-proof blockchain ledger." 
        : "Access your certificates securely with immutable blockchain records."
    }
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
            {isIssuer ? "HR Dashboard" : "Certificate Management"}
          </motion.div>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            {isIssuer 
              ? "Issue and Verify Credentials" 
              : "Manage Your Digital Certificates"}
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            {isIssuer 
              ? "Issue, verify, and manage blockchain certificates for candidates" 
              : "Manage and share your blockchain-verified certificates"}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            // onClick={() => navigate(isIssuer ? "/issue" : "/userdashboard")}
            onClick={() => navigate("/auth")}
            className="px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            {/* {isIssuer ? "Issue Certificate" : "View Certificates"} */}
            Get Started
          </motion.button>
        </motion.div>

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
