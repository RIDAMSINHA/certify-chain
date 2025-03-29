import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ethers } from 'ethers';
import { 
  Award, 
  ExternalLink, 
  ArrowUpDown,
  Pin,
  Calendar,
  Building,
  Plus,
  GripVertical,
  Eye,
  Loader
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { blockchainService } from "@/utils/blockchain";

// Define a new interface for blockchain certificates
interface BlockchainCertificate {
  name: string;
  issuer: string;
  recipient: string;
  ipfsHash: string;
  issueDate: number;
  isValid: boolean;
}

// Extended certificate interface combining blockchain data with UI display needs
interface Certificate {
  blockchain_cert_id: string;
  title: string;
  issuer_id: string;
  status: string;
  priority: number;
  public_url: string;
  created_at: string;
  description?: string;
}

const Dashboard = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [showcaseCertificates, setShowcaseCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [draggedCert, setDraggedCert] = useState<Certificate | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  // On mount, load showcase certificates from localStorage and check wallet connection
  useEffect(() => {
    checkWalletConnection();
    const storedShowcase = localStorage.getItem("showcaseCertificates");
    if (storedShowcase) {
      try {
        const parsed = JSON.parse(storedShowcase) as Certificate[];
        setShowcaseCertificates(parsed);
      } catch (error) {
        console.error("Error parsing showcaseCertificates from localStorage", error);
      }
    }
  }, []);

  // Check if wallet is connected
  const checkWalletConnection = async () => {
    const isConnected = blockchainService.isConnected();
    setIsWalletConnected(isConnected);
    
    if (isConnected) {
      const isUserRegistered = blockchainService.isUserRegistered();
      setIsRegistered(isUserRegistered);
      if (isUserRegistered) {
        fetchCertificatesFromBlockchain();
      }
    }
  };

  // Connect wallet and register if needed
  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const address = await blockchainService.connectWallet();
      if (address) {
        setIsWalletConnected(true);
        const isUserRegistered = blockchainService.isUserRegistered();
        setIsRegistered(isUserRegistered);
        
        if (isUserRegistered) {
          fetchCertificatesFromBlockchain();
        } else {
          toast.warning("Please register your account to view your certificates");
          // Could navigate to registration page here
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch certificates from blockchain
  const fetchCertificatesFromBlockchain = async () => {
    setLoading(true);
    try {
      // Get certificate identifiers from blockchain
      const blockchainCertIds = await blockchainService.getUserCertificates();
      console.log("Blockchain certificate IDs:", blockchainCertIds);
      
      if (blockchainCertIds.length === 0) {
        setCertificates([]);
        setLoading(false);
        return;
      }
      
      // Extract recipient addresses from blockchain certificates
      const recipientAddresses = blockchainCertIds.map(cert => cert.recipient);
      
      // Fetch certificate details from Supabase using recipient addresses
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .in('recipient_address', recipientAddresses);
      
      if (error) {
        console.error('Error fetching certificates from database:', error);
        toast.error('Failed to fetch certificates from database');
        setCertificates([]);
        return;
      }
      
      console.log('Certificates fetched from database:', data);
      
      if (!data || data.length === 0) {
        // No certificates found in database matching the blockchain recipient addresses
        // Create minimal certificates from blockchain data
        const minimalCerts = blockchainCertIds.map((cert, index) => {
          return {
            blockchain_cert_id: cert.certId,
            title: cert.name || `Certificate #${index + 1}`,
            issuer_id: 'Unknown Issuer',
            recipient_address: cert.recipient,
            status: 'issued',
            priority: 0,
            public_url: cert.ipfsHash,
            created_at: new Date().toISOString(),
            description: `Certificate for ${cert.recipient.substring(0, 6)}...${cert.recipient.substring(cert.recipient.length - 4)}`
          };
        });
        
        // Sort certificates based on date (even though they're all the same here)
        const sortedCerts = [...minimalCerts].sort((a, b) => {
          return sortOrder === 'desc'
            ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        // Remove certificates that are already in the showcase
        const showcaseIds = showcaseCertificates.map(cert => cert.blockchain_cert_id);
        const filteredCerts = sortedCerts.filter(cert => !showcaseIds.includes(cert.blockchain_cert_id));
        
        setCertificates(filteredCerts);
        return;
      }
      
      // Enhance database certificates with blockchain identifiers if needed
      const enhancedCerts = data.map(dbCert => {
        // Find matching blockchain cert by recipient address
        const matchingBlockchainCert = blockchainCertIds.find(
          bc => bc.recipient.toLowerCase() === dbCert.recipient_address.toLowerCase()
        );
        
        // If there's a match and we don't have a blockchain_cert_id yet, add it
        if (matchingBlockchainCert && !dbCert.blockchain_cert_id) {
          return {
            ...dbCert,
            blockchain_cert_id: matchingBlockchainCert.certId
          };
        }
        
        return dbCert;
      });
      
      // Sort certificates based on date
      const sortedCerts = [...enhancedCerts].sort((a, b) => {
        return sortOrder === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      // Remove certificates that are already in the showcase
      const showcaseIds = showcaseCertificates.map(cert => cert.blockchain_cert_id);
      const filteredCerts = sortedCerts.filter(cert => !showcaseIds.includes(cert.blockchain_cert_id));
      
      setCertificates(filteredCerts);
    } catch (error) {
      console.error('Error fetching certificates from blockchain:', error);
      toast.error('Failed to load certificates from blockchain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRegistered) {
      fetchCertificatesFromBlockchain();
    }
  }, [sortOrder, isRegistered]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const shareProfileUrl = () => {
    const shareableUrl = `${window.location.origin}/userprofile/${encodeURIComponent(
      showcaseCertificates.map(cert => cert.public_url).join(',')
    )}`;
    navigator.clipboard.writeText(shareableUrl);
    toast.success('Profile link copied to clipboard');
  };

  const handleDragStart = (cert: Certificate) => {
    setDraggedCert(cert);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    if (!draggedCert) return;
    
    // If certificate is not already in showcase, add it
    if (!showcaseCertificates.find(c => c.blockchain_cert_id === draggedCert.blockchain_cert_id)) {
      const newShowcase = [...showcaseCertificates, draggedCert];
      setShowcaseCertificates(newShowcase);
      localStorage.setItem("showcaseCertificates", JSON.stringify(newShowcase));
      toast.success('Certificate added to showcase');
      // Also remove from main certificates list
      setCertificates(prev => prev.filter(cert => cert.blockchain_cert_id !== draggedCert.blockchain_cert_id));
    }
    setDraggedCert(null);
  };

  const removeFromShowcase = (certId: string) => {
    const newShowcase = showcaseCertificates.filter(c => c.blockchain_cert_id !== certId);
    setShowcaseCertificates(newShowcase);
    localStorage.setItem("showcaseCertificates", JSON.stringify(newShowcase));
    // Re-fetch certificates to add the removed one back to the main list
    if (isRegistered) {
      fetchCertificatesFromBlockchain();
    }
    toast.success('Certificate removed from showcase');
  };

  const reorderShowcase = (fromIndex: number, toIndex: number) => {
    const newOrder = [...showcaseCertificates];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    setShowcaseCertificates(newOrder);
    localStorage.setItem("showcaseCertificates", JSON.stringify(newOrder));
  };

  const viewCertificate = (publicUrl: string) => {
    navigate(`/certificates/${publicUrl}`);
  };

  const shareUrl = (publicUrl: string) => {
    const shareableUrl = `${window.location.origin}/certificates/${publicUrl}`;
    navigator.clipboard.writeText(shareableUrl);
    toast.success('Share link copied to clipboard');
  };

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <Award className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to view your blockchain certificates
          </p>
          <Button 
            onClick={connectWallet} 
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <Award className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Registration Required</h2>
          <p className="text-gray-600 mb-6">
            You need to register your account on the blockchain to view your certificates.
          </p>
          <Button 
            onClick={() => navigate('/register')}
            className="w-full"
          >
            Register Now
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <div className="text-xl text-gray-600">Loading certificates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Profile Showcase Container */}
        <div className="mt-10 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">My Profile Showcase</h2>
            <Button 
              variant="outline"
              onClick={shareProfileUrl}
              disabled={showcaseCertificates.length === 0}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Share Profile
            </Button>
          </div>
          <Card 
            className="p-6 bg-white border-2 border-dashed border-gray-300 min-h-[200px]"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {showcaseCertificates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[160px] text-gray-500">
                <Plus className="w-12 h-12 mb-2" />
                <p>Drag and drop certificates here to showcase in your profile</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {showcaseCertificates.map((cert, index) => (
                  <Card 
                    key={cert.blockchain_cert_id} 
                    className="p-4 bg-gray-50 cursor-move"
                    draggable
                    onDragStart={() => handleDragStart(cert)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedCert) {
                        const fromIndex = showcaseCertificates.findIndex(c => c.blockchain_cert_id === draggedCert.blockchain_cert_id);
                        if (fromIndex !== -1) {
                          reorderShowcase(fromIndex, index);
                        }
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <Award className="w-6 h-6 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{cert.title}</h3>
                          <p className="text-sm text-gray-500">{cert.issuer_id}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeFromShowcase(cert.blockchain_cert_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* All Certificates */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">
            My Certificates
            <span className="ml-3 text-sm bg-blue-100 text-blue-800 py-1 px-2 rounded-full">
              {certificates.length}
            </span>
          </h2>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={toggleSortOrder}
              className="gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </Button>
          </div>
        </div>

        {certificates.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No Certificates Found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              You don't have any certificates on the blockchain yet. When you receive certificates, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card 
                key={cert.blockchain_cert_id} 
                className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
                draggable
                onDragStart={() => handleDragStart(cert)}
              >
                <div className="p-6 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <Award className="w-10 h-10 text-blue-500" />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => viewCertificate(cert.public_url)}
                        title="View Certificate"
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => shareUrl(cert.public_url)}
                        title="Share Certificate"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1 text-gray-800">{cert.title}</h3>
                  {/* <div className="text-sm text-gray-500 mb-4">
                    {cert.description}
                  </div> */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(cert.created_at).toLocaleDateString()}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        cert.status === "issued"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {cert.status}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 px-6 py-3 text-xs text-gray-600 flex justify-between items-center">
                  <div className="flex items-center">
                    <Building className="w-3 h-3 mr-1" />
                    <span className="truncate max-w-[120px]">{cert.issuer_id}</span>
                  </div>
                  <span className="text-blue-600 font-medium">Drag to showcase</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
