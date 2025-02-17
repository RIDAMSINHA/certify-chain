
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractABI from '../contracts/CertificateNFT.json';
import contractConfig from '../contract-config.json';
import { toast } from 'sonner';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useContract() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          setSigner(signer);
          
          const contract = new ethers.Contract(
            contractConfig.contractAddress,
            contractABI.abi,
            signer
          );
          setContract(contract);
        } catch (error) {
          console.error('Failed to initialize contract:', error);
          toast.error('Failed to connect to blockchain');
        }
      }
    };

    initContract();
  }, []);

  const issueCertificate = useCallback(
    async (recipient: string, tokenId: number, metadataUri: string) => {
      if (!contract) {
        toast.error('Contract not initialized');
        return;
      }
      try {
        const tx = await contract.issueCertificate(recipient, tokenId, metadataUri);
        await tx.wait();
        toast.success('Certificate issued successfully');
      } catch (error: any) {
        console.error('Failed to issue certificate:', error);
        toast.error(error.message || 'Failed to issue certificate');
      }
    },
    [contract]
  );

  const verifyCertificate = useCallback(
    async (tokenId: number) => {
      if (!contract) {
        toast.error('Contract not initialized');
        return false;
      }
      try {
        const isValid = await contract.verifyCertificate(tokenId);
        return isValid;
      } catch (error: any) {
        console.error('Failed to verify certificate:', error);
        toast.error(error.message || 'Failed to verify certificate');
        return false;
      }
    },
    [contract]
  );

  const revokeCertificate = useCallback(
    async (tokenId: number) => {
      if (!contract) {
        toast.error('Contract not initialized');
        return;
      }
      try {
        const tx = await contract.revokeCertificate(tokenId);
        await tx.wait();
        toast.success('Certificate revoked successfully');
      } catch (error: any) {
        console.error('Failed to revoke certificate:', error);
        toast.error(error.message || 'Failed to revoke certificate');
      }
    },
    [contract]
  );

  return {
    contract,
    signer,
    issueCertificate,
    verifyCertificate,
    revokeCertificate,
  };
}
