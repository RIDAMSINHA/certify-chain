import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Award, 
  Calendar, 
  Building, 
  ExternalLink, 
  Lock, 
  Loader2, 
  ArrowLeft, 
  Shield, 
  Check, 
  FileText, 
  Eye, 
  EyeOff, 
  File,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/providers/AuthProvider';
import { analyzeCertificateValue, analyzeCertificateValueForHR, generateShareableHighlights } from '@/utils/ai';
import { blockchainService } from '@/utils/blockchain';
import { motion } from "framer-motion";

interface Certificate {
  blockchain_cert_id: string;
  title: string;
  issuer_id: string;
  recipient_address: string;
  description: string;
  status: string;
  created_at: string;
  public_url: string;
  metadata_uri?: string;
  is_blockchain_only?: boolean;
}

interface MarketInsights {
  industryDemand: string;
  careerOpportunities: string[];
  salaryImpact: string;
  futureRelevance: string;
  relatedCertifications: string[];
}

const CertificateView = () => {
  const { publicUrl } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCertificate, setUserCertificate] = useState<Certificate | null>(null);
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [shareableHighlights, setShareableHighlights] = useState<string[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const {user, isIssuer} = useAuth();
  const location = useLocation();
  const [cameFromProfile, setCameFromProfile] = useState(false);
  const [verifyingOnBlockchain, setVerifyingOnBlockchain] = useState(false);
  const [blockchainVerified, setBlockchainVerified] = useState<boolean | null>(null);
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState<string | null>(null);
  const [isLoadingCertificatePreview, setIsLoadingCertificatePreview] = useState(false);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'preview'>('details');
  const [isHRView, setIsHRView] = useState(false);

  useEffect(() => {
    const referrer = document.referrer;
    if (referrer && referrer.includes('/userprofile/')) {
      setCameFromProfile(true);
    }

    fetchCertificate();
  }, [publicUrl]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && !publicUrl?.includes('-public')) {
      toast.info("Please log in to view certificate details");
      // Store the intended redirect URL in session storage
      sessionStorage.setItem('redirectAfterLogin', `/certificates/${publicUrl}`);
      navigate('/auth');
    }
  }, [user, loading, navigate, publicUrl]);

  // Check if the current user is an HR viewer
  useEffect(() => {
    const checkIfHR = async () => {
      try {
        if (user) {
          console.log("USER:", user);
          const userData = user.user_metadata.is_issuer;
          console.log("USERDATA:", userData);
          
          // If userData is 'true' or true, set HR view
          if (userData === 'true' || userData === true) {
            console.log('HR user detected');
            setIsHRView(true);
          } else {
            setIsHRView(false);
          }
        }
      } catch (error) {
        console.error('Error checking if user is HR:', error);
        setIsHRView(false);
      }
    };
    
    checkIfHR();
  }, [user]);

  const fetchCertificate = async () => {
    try {
      if (!publicUrl) {
        throw new Error('No certificate ID provided');
      }

      console.log('Fetching certificate with ID:', publicUrl);

      // Determine if the provided ID is a blockchain hash
      const isBlockchainHash = /^(0x)?[0-9a-f]{64}$/i.test(publicUrl);
      
      if (isBlockchainHash) {
        // Ensure it has 0x prefix for blockchain operations
        const formattedId = publicUrl.startsWith('0x') ? publicUrl : `0x${publicUrl}`;
        console.log('Detected blockchain hash, formatted as:', formattedId);
        
        // First directly check if this ID exists in our database
        const { data: certByBlockchainId, error: blockchainIdError } = await supabase
          .from('certificates')
          .select('*')
          .eq('blockchain_cert_id', formattedId)
          .maybeSingle();
          
        if (!blockchainIdError && certByBlockchainId) {
          console.log('Certificate found in database by blockchain_cert_id:', certByBlockchainId);
          setCertificate(certByBlockchainId);
          
          // Verify on blockchain
          verifyOnBlockchain(formattedId);
          
          // Load additional data if authenticated
          if (user) {
            loadMarketInsights(certByBlockchainId.title, certByBlockchainId.description);
            loadShareableHighlights(certByBlockchainId.title, certByBlockchainId.description);
            checkUserOwnership(certByBlockchainId);
          }
          
          setLoading(false);
          return;
        }
        
        // If not found in database, try to get it directly from blockchain
        console.log("Certificate not found in database, trying blockchain directly");
        await blockchainService.setupProvider();
        const blockchainCertificate = await blockchainService.getCertificateDetails(formattedId);
        
        if (blockchainCertificate) {
          console.log('Certificate data from blockchain:', blockchainCertificate);
          
          // Create a minimal certificate object from blockchain data
          const minimalCertificate: Certificate = {
            blockchain_cert_id: formattedId,
            title: blockchainCertificate.name || 'Unnamed Certificate',
            issuer_id: blockchainCertificate.issuer || 'Unknown Issuer',
            recipient_address: blockchainCertificate.recipient || '',
            description: `Blockchain certificate issued by ${blockchainCertificate.issuer?.substring(0, 6) || 'Unknown'}... to ${blockchainCertificate.recipient?.substring(0, 6)}...`,
            status: blockchainCertificate.isValid ? 'issued' : 'revoked',
            created_at: blockchainCertificate.issueDate ? new Date(blockchainCertificate.issueDate * 1000).toISOString() : new Date().toISOString(),
            public_url: blockchainCertificate.ipfsHash || '',
            metadata_uri: blockchainCertificate.ipfsHash || '',
            is_blockchain_only: true
          };
          
          setCertificate(minimalCertificate);
          setBlockchainVerified(blockchainCertificate.isValid);
          
          // Try to find matching certificate in database using recipient and name
          if (blockchainCertificate.recipient && blockchainCertificate.name) {
            console.log("Looking for matching certificate in database by recipient and name");
            const { data: certByDetails, error: detailsError } = await supabase
              .from('certificates')
              .select('*')
              .eq('recipient_address', blockchainCertificate.recipient)
              .eq('title', blockchainCertificate.name)
              .maybeSingle();
              
            if (!detailsError && certByDetails) {
              console.log('Matched certificate in database by recipient and name:', certByDetails);
              
              // If the matched certificate doesn't have blockchain_cert_id, update it
              if (!certByDetails.blockchain_cert_id) {
                console.log("Updating database certificate with blockchain ID");
                const { error: updateError } = await supabase
                  .from('certificates')
                  .update({ blockchain_cert_id: formattedId })
                  .eq('id', certByDetails.id);
                  
                if (updateError) {
                  console.error('Error updating certificate with blockchain ID:', updateError);
                } else {
                  console.log("Database certificate updated with blockchain ID");
                }
              }
              
              // Use the database certificate with full details
              setCertificate({
                ...certByDetails,
                blockchain_cert_id: formattedId
              });
              
              // Load AI insights
              if (user) {
                loadMarketInsights(certByDetails.title, certByDetails.description);
                loadShareableHighlights(certByDetails.title, certByDetails.description);
                checkUserOwnership(certByDetails);
              }
            }
          }
          
          setLoading(false);
          return;
        } else {
          console.log('Certificate not found on blockchain');
          toast.error('Certificate not found on blockchain');
          setLoading(false);
          return;
        }
      }

      // If not a blockchain hash, try to find certificate by public_url or metadata_uri
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicUrl);
      
      let certData = null;
      let certError = null;
      
      if (isUuid) {
        // If it's a UUID format, query by public_url directly
        const result = await supabase
          .from('certificates')
          .select('*')
          .eq('public_url', publicUrl)
          .maybeSingle();
          
        certData = result.data;
        certError = result.error;
      } else {
        // Try by metadata_uri
        const result = await supabase
          .from('certificates')
          .select('*')
          .eq('metadata_uri', publicUrl)
          .maybeSingle();
          
        certData = result.data;
        certError = result.error;
      }

      if (certError) {
        console.error('Error fetching certificate by UUID/IPFS:', certError);
        
        // If still not found, try checking if it might be an Ethereum address
        if (publicUrl.startsWith('0x') && publicUrl.length === 42) {
          // It might be a recipient address
          const { data: certByRecipient, error: recipientError } = await supabase
            .from('certificates')
            .select('*')
            .eq('recipient_address', publicUrl)
            .limit(1);
            
          if (!recipientError && certByRecipient && certByRecipient.length > 0) {
            setCertificate(certByRecipient[0]);
            
            // Verify on blockchain if certificate has blockchain_cert_id
            if (certByRecipient[0].blockchain_cert_id) {
              verifyOnBlockchain(certByRecipient[0].blockchain_cert_id);
            }
            
            // Only load AI insights if user is authenticated
            if (user) {
              loadMarketInsights(certByRecipient[0].title, certByRecipient[0].description);
              loadShareableHighlights(certByRecipient[0].title, certByRecipient[0].description);
              
              // Check if this is the user's certificate
              checkUserOwnership(certByRecipient[0]);
            }
            
            setLoading(false);
            return;
          }
        }
        
        toast.error('Certificate not found in database');
        setLoading(false);
        return;
      }
      
      if (!certData) {
        toast.error('Certificate not found');
        navigate('/');
        return;
      }

      setCertificate(certData);

      // Verify on blockchain if certificate has blockchain_cert_id
      if (certData.blockchain_cert_id) {
        verifyOnBlockchain(certData.blockchain_cert_id);
      }

      // Only load AI insights if user is authenticated
      if (user) {
        // Load AI insights
        loadMarketInsights(certData.title, certData.description);
        loadShareableHighlights(certData.title, certData.description);
        
        // Check if this is the user's certificate
        checkUserOwnership(certData);
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
      toast.error('Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to check if the certificate belongs to the current user
  const checkUserOwnership = async (cert: Certificate) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('certificates')
        .select('*')
        .eq('recipient_address', cert.recipient_address)
        .eq('title', cert.title)
        .maybeSingle();

      if (!userError && userData) {
        setUserCertificate(userData);
      }
    } catch (error) {
      console.error('Error checking certificate ownership:', error);
    }
  };

  const fetchCertificateFromIPFS = async (ipfsUri: string) => {
    setIsLoadingCertificatePreview(true);
    try {
      // Handle different IPFS URI formats
      let ipfsUrl = ipfsUri;
      
      // Convert ipfs:// protocol to https
      if (ipfsUri.startsWith('ipfs://')) {
        // Use either Pinata or IPFS gateway
        const cid = ipfsUri.replace('ipfs://', '').split('/')[0];
        ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        // Alternative gateway: `https://ipfs.io/ipfs/${cid}`
      }

      // Determine file type (can be enhanced with server-side detection)
      const extension = ipfsUri.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
        setPreviewType('image');
      } else if (extension === 'pdf') {
        setPreviewType('pdf');
      } else {
        // Default to image if unknown
        setPreviewType('image');
      }

      setCertificatePreviewUrl(ipfsUrl);
    } catch (error) {
      console.error('Error fetching certificate from IPFS:', error);
      toast.error('Failed to load certificate preview');
    } finally {
      setIsLoadingCertificatePreview(false);
    }
  };

  const verifyOnBlockchain = async (certId: string) => {
    setVerifyingOnBlockchain(true);
    try {
      // Ensure we have the provider set up
      await blockchainService.setupProvider();
      
      // Format the certificate ID if needed
      const formattedCertId = certId.startsWith('0x') ? certId : `0x${certId}`;
      console.log(`Verifying certificate on blockchain with ID: ${formattedCertId}`);
      
      // Get certificate details directly from blockchain
      const blockchainCertificate = await blockchainService.getCertificateDetails(formattedCertId);
      
      if (blockchainCertificate) {
        console.log('Certificate found on blockchain:', blockchainCertificate);
        setBlockchainVerified(blockchainCertificate.isValid);
        
        if (blockchainCertificate.isValid) {
          toast.success("Certificate successfully verified on blockchain");
        } else {
          toast.warning("Certificate is revoked on the blockchain");
        }
      } else {
        console.log('Certificate not found on blockchain');
        setBlockchainVerified(false);
        toast.warning("Certificate not found on blockchain");
      }
    } catch (error) {
      console.error('Error verifying on blockchain:', error);
      setBlockchainVerified(false);
      toast.error("Error verifying certificate on blockchain");
    } finally {
      setVerifyingOnBlockchain(false);
    }
  };

  const loadMarketInsights = async (title: string, description: string) => {
    setIsLoadingInsights(true);
    try {
      // Use different analysis function based on user type
      const insights = isHRView 
        ? await analyzeCertificateValueForHR(title, description)
        : await analyzeCertificateValue(title, description);
      
      setMarketInsights(insights);
    } catch (error) {
      console.error('Error loading market insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const loadShareableHighlights = async (title: string, description: string) => {
    try {
      const highlights = await generateShareableHighlights(title, description);
      setShareableHighlights(highlights);
    } catch (error) {
      console.error('Error loading shareable highlights:', error);
    }
  };

  const handleGoBack = () => {
    if (cameFromProfile && certificate) {
      navigate(`/userprofile/${certificate.blockchain_cert_id}`);
    } else {
      navigate(-1);
    }
  };

  // Switch to preview tab and load preview if needed
  const switchToPreview = () => {
    if (certificate?.metadata_uri && !certificatePreviewUrl) {
      fetchCertificateFromIPFS(certificate.metadata_uri);
    }
    setActiveTab('preview');
  };

  // Switch to details tab
  const switchToDetails = () => {
    setActiveTab('details');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <div className="text-xl text-gray-700 font-medium">Loading certificate...</div>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-700 p-8 bg-white rounded-lg shadow-md border border-gray-200">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-center">Certificate not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6 flex items-center gap-2 hover:bg-white/80 transition-colors"
          onClick={handleGoBack}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        {userCertificate && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm"
          >
            <p className="text-blue-700 flex items-center gap-2">
              <Check className="w-5 h-5 text-blue-500" />
              You also own this certificate! View it in your{' '}
              <Button 
                variant="link" 
                className="p-0 text-blue-700 underline hover:text-blue-800"
                onClick={() => navigate(isIssuer ? '/dashboard' : '/userdashboard')}
              >
                dashboard
              </Button>
            </p>
          </motion.div>
        )}

        <Card className="overflow-hidden border border-gray-200 shadow-lg rounded-xl">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-full shadow-md mb-5">
              <Award className="w-16 h-16 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-gray-800">{certificate.title}</h1>
            {/* <p className="text-gray-600 max-w-2xl">{certificate.description}</p> */}
          </div>

          {/* Tab Navigation */}
          {certificate.metadata_uri && (
            <div className="flex bg-white justify-center px-4 pt-4 border-b">
              <Button
                variant="ghost"
                className={`rounded-t-lg border-b-2 transition-all duration-200 ${
                  activeTab === 'details' 
                    ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-medium' 
                    : 'border-transparent hover:border-gray-300 hover:bg-gray-50/50'
                } px-6 py-3`}
                onClick={switchToDetails}
              >
                <File className="w-4 h-4 mr-2" />
                Certificate Details
              </Button>
              <Button
                variant="ghost"
                className={`rounded-t-lg border-b-2 transition-all duration-200 ${
                  activeTab === 'preview' 
                    ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-medium' 
                    : 'border-transparent hover:border-gray-300 hover:bg-gray-50/50'
                } px-6 py-3`}
                onClick={switchToPreview}
              >
                <Eye className="w-4 h-4 mr-2" />
                Certificate Preview
              </Button>
            </div>
          )}

          <div className="p-6">
            {/* Preview View - Only shown when preview tab is active */}
            {activeTab === 'preview' && certificate.metadata_uri && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="py-4"
              >
                {isLoadingCertificatePreview ? (
                  <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-lg border border-gray-200">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-600 font-medium">Loading certificate preview...</p>
                  </div>
                ) : certificatePreviewUrl ? (
                  <div className="flex justify-center">
                    {previewType === 'image' ? (
                      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 max-w-full">
                        <div className="overflow-hidden rounded-lg">
                          <img
                            src={certificatePreviewUrl}
                            alt="Certificate"
                            className="max-w-full max-h-[600px] object-contain"
                          />
                        </div>
                        <div className="flex justify-end mt-4">
                          <a 
                            href={certificatePreviewUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            download
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Download Certificate
                          </a>
                        </div>
                      </div>
                    ) : previewType === 'pdf' ? (
                      <div className="w-full">
                        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="bg-blue-100 p-2 rounded-md mr-3">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-gray-700 font-medium">Certificate Document</span>
                          </div>
                          <div className="flex gap-3">
                            <a 
                              href={certificatePreviewUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium bg-blue-50 px-3 py-1.5 rounded-md transition-colors hover:bg-blue-100"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open in New Tab
                            </a>
                            <a 
                              href={certificatePreviewUrl} 
                              download
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium bg-blue-50 px-3 py-1.5 rounded-md transition-colors hover:bg-blue-100"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </a>
                          </div>
                        </div>
                        <div className="rounded-lg overflow-hidden shadow-md border border-gray-200">
                          <iframe
                            src={`${certificatePreviewUrl}#toolbar=0`}
                            className="w-full h-[600px]"
                            title="Certificate PDF"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg w-full border border-gray-200 p-8">
                        <FileText className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-gray-600 font-medium">Certificate preview not available</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200 p-8">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium">No certificate preview available</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Details View - Only shown when details tab is active */}
            {activeTab === 'details' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {certificate.blockchain_cert_id && (
                  <div className="mb-8">
                    {verifyingOnBlockchain ? (
                      <div className="flex items-center justify-center bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin mr-3" />
                        <span className="text-amber-700 font-medium">Verifying on blockchain...</span>
                      </div>
                    ) : blockchainVerified === true ? (
                      <div className="flex items-center justify-center bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="bg-green-100 p-1.5 rounded-full mr-3">
                          <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-green-700 font-medium">Blockchain Verified ✓</span>
                      </div>
                    ) : blockchainVerified === false ? (
                      <div className="flex items-center justify-center bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="bg-red-100 p-1.5 rounded-full mr-3">
                          <Shield className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="text-red-700 font-medium">Not verified on blockchain</span>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="grid gap-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-6 text-gray-700 bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 p-1.5 rounded-full">
                        <Building className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="font-medium">Issued by:</span>
                      <span>{certificate.issuer_id}</span>
                    </div>
                    <div className="h-10 border-l border-gray-300 hidden md:block"></div>
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 p-1.5 rounded-full">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="font-medium">Issued on:</span>
                      <span>{new Date(certificate.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      Verification Details
                    </h2>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500 mb-1">Recipient Address</p>
                        <p className="text-gray-700 break-all font-mono text-sm bg-white p-2 rounded border border-gray-200">
                          {certificate.recipient_address}
                        </p>
                      </div>

                      {certificate.blockchain_cert_id && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-500 mb-1">Blockchain Certificate ID</p>
                          <p className="text-gray-700 break-all font-mono text-sm bg-white p-2 rounded border border-gray-200">
                            {certificate.blockchain_cert_id}
                          </p>
                        </div>
                      )}

                      {certificate.metadata_uri && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-500 mb-1">IPFS Reference</p>
                          <p className="text-gray-700 break-all font-mono text-sm bg-white p-2 rounded border border-gray-200">
                            {certificate.metadata_uri}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {isLoadingInsights ? (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-3" />
                      <span className="text-gray-600 font-medium">Loading market insights...</span>
                    </div>
                  ) : marketInsights && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                        <Building className="w-5 h-5 text-blue-500" />
                        {isHRView ? "HR Certificate Analysis" : "Market Insights"}
                      </h2>
                      
                      {isHRView ? (
                        // HR View - Only show Industry Demand and Future Relevance
                        <div className="grid gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="font-medium mb-2 text-blue-700">Industry Demand</h3>
                            <p className="text-gray-700">{marketInsights.industryDemand}</p>
                          </div>
                          
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <h3 className="font-medium mb-2 text-orange-700">Future Relevance</h3>
                            <p className="text-gray-700">{marketInsights.futureRelevance}</p>
                          </div>
                        </div>
                      ) : (
                        // Regular User View - Show Full Market Insights
                        <div className="grid gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="font-medium mb-2 text-blue-700">Industry Demand</h3>
                            <p className="text-gray-700">{marketInsights.industryDemand}</p>
                          </div>
                          
                          {marketInsights.careerOpportunities && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                              <h3 className="font-medium mb-2 text-green-700">Career Opportunities</h3>
                              <ul className="list-disc list-inside space-y-1">
                                {marketInsights.careerOpportunities.map((opportunity, index) => (
                                  <li key={index} className="text-gray-700">{opportunity}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {marketInsights.salaryImpact && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                              <h3 className="font-medium mb-2 text-purple-700">Salary Impact</h3>
                              <p className="text-gray-700">{marketInsights.salaryImpact}</p>
                            </div>
                          )}
                          
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <h3 className="font-medium mb-2 text-orange-700">Future Relevance</h3>
                            <p className="text-gray-700">{marketInsights.futureRelevance}</p>
                          </div>
                          
                          {marketInsights.relatedCertifications && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                              <h3 className="font-medium mb-2 text-indigo-700">Related Certifications</h3>
                              <ul className="list-disc list-inside space-y-1">
                                {marketInsights.relatedCertifications.map((cert, index) => (
                                  <li key={index} className="text-gray-700">{cert}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Commented out section for shareable highlights */}
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CertificateView;
