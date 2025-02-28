
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Calendar, Building, ExternalLink, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/providers/AuthProvider';
import { analyzeCertificateValue, generateShareableHighlights } from '@/utils/ai';

interface Certificate {
  id: string;
  title: string;
  issuer_id: string;
  recipient_address: string;
  description: string;
  status: string;
  created_at: string;
  public_url: string;
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
  const {isIssuer} = useAuth();

  useEffect(() => {
    fetchCertificate();
  }, [publicUrl]);

  const fetchCertificate = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('public_url', publicUrl)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast.error('Certificate not found');
        navigate('/');
        return;
      }

      if (data.status === 'private') {
        toast.error('This certificate is private');
        navigate('/');
        return;
      }

      setCertificate(data);

      // Load AI insights
      loadMarketInsights(data.title, data.description);
      loadShareableHighlights(data.title, data.description);

      const { data: userData, error: userError } = await supabase
        .from('certificates')
        .select('*')
        .eq('recipient_address', data.recipient_address)
        .eq('title', data.title)
        .maybeSingle();

      if (!userError && userData) {
        setUserCertificate(userData);
      }

    } catch (error) {
      console.error('Error fetching certificate:', error);
      toast.error('Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const loadMarketInsights = async (title: string, description: string) => {
    setIsLoadingInsights(true);
    try {
      const insights = await analyzeCertificateValue(title, description);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading certificate...</div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Certificate not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {userCertificate && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700">
              You also own this certificate! View it in your{' '}
              <Button 
                variant="link" 
                className="p-0 text-blue-700 underline"
                onClick={() => navigate(isIssuer ? '/dashboard' : '/userdashboard')}
              >
                dashboard
              </Button>
            </p>
          </div>
        )}

        <Card className="p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <Award className="w-20 h-20 text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold mb-2">{certificate.title}</h1>
            <p className="text-gray-600 max-w-2xl">{certificate.description}</p>
          </div>

          <div className="grid gap-6">
            <div className="flex items-center justify-center gap-4 text-gray-600">
              <Building className="w-5 h-5" />
              <span>Issued by: {certificate.issuer_id}</span>
              <Calendar className="w-5 h-5 ml-4" />
              <span>Issued on: {new Date(certificate.created_at).toLocaleDateString()}</span>
            </div>

            <div className="border-t pt-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">Verification Details</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 break-all">
                  Recipient Address: {certificate.recipient_address}
                </p>
              </div>
            </div>

            {isLoadingInsights ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading market insights...</span>
              </div>
            ) : marketInsights && (
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">Market Insights</h2>
                <div className="grid gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Industry Demand</h3>
                    <p className="text-gray-700">{marketInsights.industryDemand}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Career Opportunities</h3>
                    <ul className="list-disc list-inside">
                      {marketInsights.careerOpportunities.map((opportunity, index) => (
                        <li key={index} className="text-gray-700">{opportunity}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Salary Impact</h3>
                    <p className="text-gray-700">{marketInsights.salaryImpact}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Future Relevance</h3>
                    <p className="text-gray-700">{marketInsights.futureRelevance}</p>
                  </div>
                </div>
              </div>
            )}

            {shareableHighlights.length > 0 && (
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">Share These Highlights</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {shareableHighlights.map((highlight, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 mb-2 p-2 bg-white rounded border border-gray-200"
                    >
                      <p className="flex-1">{highlight}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(highlight);
                          toast.success("Copied to clipboard!");
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CertificateView;
