
import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { 
  Award, 
  ExternalLink, 
  ArrowUpDown,
  Pin,
  Calendar,
  Building,
  Plus,
  GripVertical,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

interface Certificate {
  id: string;
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
  const navigate = useNavigate();

  // On mount, load showcase certificates from localStorage
  useEffect(() => {
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

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*');
      if (error) throw error;
      
      // Sort certificates based on priority and date
      const sortedData = [...(data || [])].sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // pinned (1) first
        }
        return sortOrder === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Remove certificates that are already in the showcase
      const storedShowcase = localStorage.getItem("showcaseCertificates");
      let showcaseIds: string[] = [];
      if (storedShowcase) {
        try {
          const parsed = JSON.parse(storedShowcase) as Certificate[];
          showcaseIds = parsed.map(cert => cert.id);
        } catch (error) {
          console.error("Error parsing showcaseCertificates from localStorage", error);
        }
      }
      const filteredData = sortedData.filter(cert => !showcaseIds.includes(cert.id));
      setCertificates(filteredData);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [sortOrder]);

  const togglePriority = async (id: string, currentPriority: number) => {
    try {
      const newPriority = currentPriority === 1 ? 0 : 1;
      const { error } = await supabase
        .from('certificates')
        .update({ priority: newPriority })
        .eq('id', id);
      if (error) throw error;
      
      toast.success(newPriority === 1 ? 'Certificate pinned' : 'Certificate unpinned');
      // Refetch certificates to update ordering
      await fetchCertificates();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update certificate priority');
    }
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
    if (!showcaseCertificates.find(c => c.id === draggedCert.id)) {
      const newShowcase = [...showcaseCertificates, draggedCert];
      setShowcaseCertificates(newShowcase);
      localStorage.setItem("showcaseCertificates", JSON.stringify(newShowcase));
      toast.success('Certificate added to showcase');
      // Also remove from main certificates list
      setCertificates(prev => prev.filter(cert => cert.id !== draggedCert.id));
    }
    setDraggedCert(null);
  };

  const removeFromShowcase = (certId: string) => {
    const newShowcase = showcaseCertificates.filter(c => c.id !== certId);
    setShowcaseCertificates(newShowcase);
    localStorage.setItem("showcaseCertificates", JSON.stringify(newShowcase));
    // Re-fetch main certificates (or add the removed cert manually)
    fetchCertificates();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading certificates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Profile Showcase Container */}
        <div className="mb-12">
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
                    key={cert.id} 
                    className="p-4 bg-gray-50 cursor-move"
                    draggable
                    onDragStart={() => handleDragStart(cert)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedCert) {
                        const fromIndex = showcaseCertificates.findIndex(c => c.id === draggedCert.id);
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
                        onClick={() => removeFromShowcase(cert.id)}
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
          <h1 className="text-3xl font-bold">My Certificates</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort by {sortOrder === 'desc' ? 'Oldest First' : 'Newest First'}
          </Button>
        </div>

        <div className="grid gap-6">
          {certificates.map((cert) => (
            <Card 
              key={cert.id} 
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              draggable
              onDragStart={() => handleDragStart(cert)}
              onClick={() => viewCertificate(cert.public_url)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Award className={`w-10 h-10 ${cert.priority === 1 ? 'text-yellow-500' : 'text-blue-500'}`} />
                  <div>
                    <h2 className="text-xl font-semibold">{cert.title}</h2>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Building className="w-4 h-4" />
                      <span>Issued by: {cert.issuer_id}</span>
                      <Calendar className="w-4 h-4 ml-2" />
                      <span>{new Date(cert.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePriority(cert.id, cert.priority);
                    }}
                    className={cert.priority === 1 ? "text-yellow-500" : ""}
                  >
                    <Pin className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewCertificate(cert.public_url);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={(e) =>{e.stopPropagation(); shareUrl(cert.public_url)}}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {certificates.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">No Certificates Yet</h3>
              <p className="text-gray-500 mt-2">Your earned certificates will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
