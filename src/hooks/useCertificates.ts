
import { useState } from 'react';
import { useContract } from './useContract';
import { supabase } from '@/integrations/supabase/client';

interface CertificateMetadata {
  title: string;
  description: string;
}

export function useCertificates() {
  const { contract, signer } = useContract();
  const [isLoading, setIsLoading] = useState(false);

  const issueCertificateWithMetadata = async (
    recipientAddress: string,
    metadata: CertificateMetadata
  ) => {
    if (!contract || !signer) {
      throw new Error('Contract not initialized');
    }

    setIsLoading(true);
    try {
      // Upload metadata to IPFS via Supabase Edge Function
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'uploadMetadata',
        {
          body: {
            metadata: {
              ...metadata,
              recipientAddress,
            },
            issuerAddress: await signer.getAddress(),
          },
        }
      );

      if (uploadError) throw uploadError;

      // Issue certificate on blockchain
      const tx = await contract.issueCertificate(
        recipientAddress,
        uploadData.metadataUri
      );
      await tx.wait();

      return uploadData;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    issueCertificateWithMetadata,
    isLoading,
  };
}
