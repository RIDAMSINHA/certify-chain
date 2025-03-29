import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { motion } from "framer-motion";
import {
  CheckCircle,
  FileText,
  Globe,
  ShieldAlert,
  Bot,
  Database,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


import { userProfileAIAnalysis } from "@/utils/ai";



export default function UserLanding() {

  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [allCerts, setAllCerts] = useState({});
  const [minifiedCertificates, setMinifiedCertificates] = useState([{}]);
  const [isLoading, setIsLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState([]);
  const [jobRole, setJobRole] = useState("");
  const [promptSent, setPromptSent] = useState(false);
  const [receivedAnalysis, setReceivedAnalysis] = useState(false);

  function filterCertificateData(data) {
    let newData = [];
    for (var i = 0; i < data.length; i++) {
      if (i > 2) {
        break;
      }
      const ithCertificate = {
        title: data[i].title,
        timestamp: data[i].created_at.substring(0, 10),
      };

      newData.push(ithCertificate);
    }
    console.log(newData);
    setMinifiedCertificates(newData);
    return newData;
  }

  async function promptForAnalysis(allCerts, jobRole) {
    setPromptSent(true);
    const data = allCerts;
    let str = ""
    for (var i = 0; i < data.length; i++) {
      str += data[i].title;
      str += ", ";
    }
    var customPrompt = str;
    setPrompt(customPrompt.substring(0, customPrompt.length - 2));
    console.log("Certificates:", prompt);
    try {
      const temp = await userProfileAIAnalysis(prompt, jobRole);
      console.log("AI Analysis: ", temp);
      setAiAnalysis(temp);
      setReceivedAnalysis(true);
    } catch (error) {
      console.error(error);
    }
    return prompt;
  }



  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const { data, error } = await supabase
          .from("certificates")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Validate and transform the status field to ensure it matches the expected type
        setAllCerts(data);
        setCertificates(filterCertificateData(data));
        // setPrompt(promptForAnalysis(data));
        // console.log(data);
      } catch (error) {
        console.error("Error fetching certificates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, []);


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
            {"Certificate Management"}
          </motion.div>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            {"Manage Your Digital Certificates"}
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            {"Manage and share your blockchain-verified certificates"}
          </p>
        </motion.div>

        {/* certs & ai */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Certificates Section */}
          <div className="bg-white shadow-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Recent Certificates</h2>
            <div className="space-y-4">
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
                            {cert.timestamp}
                          </p>
                        </div>

                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
            <button
              className="text-blue-500 font-medium hover:underline"
              onClick={() => navigate("/userdashboard")}
            >
              View all Certificates
            </button>
          </div>

          {/* AI Analysis Section */}
          <div className="bg-white shadow-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Analyze your Profile with AI</h2>
            {
              (promptSent === false)
                ?
                <>
                  <input
                    placeholder="Job Role Applying For"
                    onChange={(e) => {
                      setJobRole(e.target.value)
                    }
                    }
                  />
                  <button onClick={() => { promptForAnalysis(allCerts, jobRole) }}>Analyze</button>
                </>


                :

                (receivedAnalysis === true) ?
                  <div className="bg-gray-100 p-6 rounded-lg shadow-md">
                    <ul className="list-disc pl-5 text-gray-700">
                      {aiAnalysis.map((item, index) => (
                        <li key={index} className="mb-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div> :
                  <p>Loading...</p>


            }



          </div>
        </div>
      </div>
    </div>
  );
}
