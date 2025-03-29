import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { User, Award, Calendar, Loader } from "lucide-react";
import { toast } from "sonner";
import { blockchainService } from "@/utils/blockchain";

interface UserProfileData {
  name: string;
  wallet_address: string;
  certificates: any[];
}

// Define a blockchain certificate interface
interface BlockchainCertificate {
  name: string;
  issuer: string;
  recipient: string;
  ipfsHash: string;
  issueDate: number;
  isValid: boolean;
  certId: string;
}

const UserProfile = () => {
  const { id } = useParams();
  const { user, isIssuer } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingBlockchain, setIsLoadingBlockchain] = useState(false);

  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (profileError) throw profileError;

        // First fetch certificates from database
        const { data: certificates, error: certError } = await supabase
          .from("certificates")
          .select("*")
          .eq("recipient_address", profileData.wallet_address);

        if (certError) throw certError;

        // Set initial profile with database certificates
        setProfile({
          ...profileData,
          certificates: certificates || [],
        });
        console.log("Profile data:", profileData);
        
        // Now try to fetch blockchain certificates
        setIsLoadingBlockchain(true);
        
        try {
          // Connect to wallet and set the provider
          await blockchainService.setupProvider();
          
          // Try to get certificates from blockchain for this wallet address
          const blockchainCerts = await fetchBlockchainCertificates(profileData.wallet_address);
          
          if (blockchainCerts.length > 0) {
            // Convert blockchain certificates to match the database certificate format
            const formattedBlockchainCerts = blockchainCerts.map((cert, index) => {
              // Check if this certificate already exists in the database certificates
              const existingCert = certificates?.find(
                c => c.blockchain_cert_id === cert.certId || 
                     c.recipient_address?.toLowerCase() === cert.recipient?.toLowerCase()
              );
              
              // If it exists in the database, skip it to avoid duplicates
              if (existingCert) return null;
              
              // Otherwise, create a new certificate object
              return {
                id: `blockchain-${index}`,
                title: cert.name || `Certificate #${index + 1}`,
                description: `Blockchain certificate issued to ${cert.recipient.substring(0, 6)}...${cert.recipient.substring(cert.recipient.length - 4)}`,
                created_at: cert.issueDate ? new Date(cert.issueDate * 1000).toISOString() : new Date().toISOString(),
                issuer_id: cert.issuer || 'Unknown Issuer',
                recipient_address: cert.recipient,
                blockchain_cert_id: cert.certId,
                status: 'issued',
                is_blockchain_only: true // Flag to identify blockchain-only certificates
              };
            }).filter(Boolean); // Remove null entries (duplicates)
            
            // Merge blockchain certificates with database certificates
            if (formattedBlockchainCerts.length > 0) {
              setProfile(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  certificates: [...prev.certificates, ...formattedBlockchainCerts]
                };
              });
            }
          }
        } catch (blockchainError) {
          console.error("Error fetching blockchain certificates:", blockchainError);
          // Don't show toast for blockchain errors to avoid confusion
        } finally {
          setIsLoadingBlockchain(false);
        }
        
        console.log("Profile data:", profileData);
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id]);

  // Fetch certificates from blockchain for a specific wallet address
  const fetchBlockchainCertificates = async (walletAddress: string): Promise<BlockchainCertificate[]> => {
    try {
      // For the profile view, we need to get certificates by recipient address
      // This is a custom call that might need to be implemented in the blockchain service
      const certificates = await blockchainService.getCertificatesByRecipient(walletAddress);
      return certificates;
    } catch (error) {
      console.error("Error fetching blockchain certificates:", error);
      return []; // Return empty array on error
    }
  };

  // Determine access rights: allow if the current user is HR or owns the profile.
  const allowed = user && (isIssuer || user.id === id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <div className="text-xl text-gray-600">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return <div>Access denied</div>;
  }

  if (!profile) {
    return <div>Profile not found. Try logging in again...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6 mb-8"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-gray-500">Wallet: {profile.wallet_address}</p>
          </div>
        </div>

        {!isIssuer && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Certificates</h2>
            {isLoadingBlockchain && (
              <div className="text-sm text-gray-500 flex items-center">
                <Loader className="w-3 h-3 animate-spin mr-1" />
                Loading blockchain certificates...
              </div>
            )}
          </div>
          <div className="grid gap-4">
            {profile.certificates.map((cert) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`border rounded-lg p-4 hover:border-blue-500 transition-colors ${cert.is_blockchain_only ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Award className={`h-5 w-5 ${cert.is_blockchain_only ? 'text-blue-700' : 'text-blue-600'}`} />
                    <div>
                      <h3 className="font-medium">{cert.title}</h3>
                      {/* <p className="text-sm text-gray-500">{cert.description}</p> */}
                      {cert.is_blockchain_only && (
                        <span className="mt-1 inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Blockchain Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(cert.created_at).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {profile.certificates.length === 0 && (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <Award className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No certificates found for this profile</p>
              </div>
            )}
          </div>
        </div>
        )}
      </motion.div>
    </div>
  );
};

export default UserProfile;
