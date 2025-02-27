
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useContract } from "@/hooks/useContract";
import { motion } from "framer-motion";
import type { Certificate } from "@/types/certificate";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const { contract } = useContract();

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const { data, error } = await supabase
          .from("certificates")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Validate and transform the status field to ensure it matches the expected type
        const validCertificates = (data || []).map(cert => ({
          ...cert,
          status: validateStatus(cert.status)
        }));
        
        setCertificates(validCertificates);
      } catch (error) {
        console.error("Error fetching certificates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  // Helper function to validate status
  const validateStatus = (status: string): Certificate['status'] => {
    if (status === 'pending' || status === 'issued' || status === 'revoked') {
      return status;
    }
    return 'pending'; // Default fallback if status is invalid
  };

  const stats = [
    {
      title: "Total Certificates",
      value: certificates.length,
      icon: Award,
      color: "bg-blue-500",
    },
    {
      title: "Active Certificates",
      value: certificates.filter(c => c.status === "issued").length,
      icon: Shield,
      color: "bg-green-500",
    },
    {
      title: "Recipients",
      value: new Set(certificates.map(c => c.recipient_address)).size,
      icon: User,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Certificates List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold">Recent Certificates</h2>
        </div>
        <div className="divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : certificates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No certificates found</div>
          ) : (
            certificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{cert.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {cert.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        cert.status === "issued"
                          ? "bg-green-100 text-green-700"
                          : cert.status === "revoked"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {cert.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
