
import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Check, X, Loader2 } from "lucide-react";
import { blockchainService } from '@/utils/blockchain';
import { toast } from 'sonner';

export function VerifyBlockchainCertificate() {
  const [certId, setCertId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  const handleVerify = async () => {
    if (!certId) {
      toast.error('Please enter a certificate ID');
      return;
    }

    setVerifying(true);
    try {
      const result = await blockchainService.verifyCertificate(certId);
      setVerificationResult(result);
      if (result) {
        toast.success('Certificate verified on blockchain!');
      } else {
        toast.error('Certificate verification failed or certificate is not valid');
      }
    } catch (error) {
      console.error('Error verifying certificate:', error);
      toast.error('Verification failed. Please check the certificate ID and try again.');
      setVerificationResult(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Verify Blockchain Certificate</h2>
        <p className="text-gray-600">
          Enter the blockchain certificate ID to verify its authenticity and validity.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Enter certificate ID (0x...)"
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            className="flex-1"
            disabled={verifying}
          />
          <Button 
            onClick={handleVerify} 
            disabled={verifying || !certId}
            className="whitespace-nowrap"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Certificate'
            )}
          </Button>
        </div>

        {verificationResult !== null && (
          <div className={`mt-4 p-4 rounded-lg ${
            verificationResult ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="flex items-center">
              <Shield className={`w-5 h-5 mr-2 ${
                verificationResult ? 'text-green-600' : 'text-red-600'
              }`} />
              {verificationResult ? (
                <>
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Certificate is valid and authentic</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-red-600 mr-2" />
                  <span className="font-medium text-red-800">Certificate could not be verified</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
