
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Award, Building, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Certificate {
  id: string;
  title: string;
  issuer_id: string;
  created_at: string;
  description?: string;
}

const ProfileView = () => {
  const { certificates: certificateUrls } = useParams();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (certificateUrls) {
      fetchCertificates(certificateUrls.split(','));
    }
  }, [certificateUrls]);

  const fetchCertificates = async (urls: string[]) => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .in('public_url', urls);

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Certificate Showcase</h1>
        
        <div className="grid gap-6">
          {certificates.map((cert) => (
            <Card key={cert.id} className="p-6">
              <div className="flex items-center space-x-4">
                <Award className="w-10 h-10 text-blue-500" />
                <div>
                  <h2 className="text-xl font-semibold">{cert.title}</h2>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Building className="w-4 h-4" />
                    <span>Issued by: {cert.issuer_id}</span>
                    <Calendar className="w-4 h-4 ml-2" />
                    <span>{new Date(cert.created_at).toLocaleDateString()}</span>
                  </div>
                  {cert.description && (
                    <p className="mt-2 text-gray-600">{cert.description}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {certificates.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">No Certificates in Showcase</h3>
              <p className="text-gray-500 mt-2">This profile has no certificates to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
