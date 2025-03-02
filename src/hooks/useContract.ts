import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
// Import the compiled artifact (update the path if necessary)
import contractArtifact from '../../artifacts/src/contracts/CertificateRegistry.sol/CertificateRegistry.json';
// Import the deployed contract configuration
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

          const contractInstance = new ethers.Contract(
            contractConfig.contractAddress,
            contractArtifact.abi,
            signer
          );
          setContract(contractInstance);
          console.log('Contract initialized:', contractInstance);
        } catch (error) {
          console.error('Failed to initialize contract:', error);
          toast.error('Failed to connect to blockchain');
        }
      }
    };

    initContract();
  }, []);

  const issueCertificate = useCallback(
    async (name: string, recipient: string, ipfsHash: string) => {
      if (!contract) {
        toast.error('Contract not initialized');
        return;
      }
      try {
        // Call issueCertificate(name, recipient, ipfsHash) from your contract
        const tx = await contract.issueCertificate(name, recipient, ipfsHash);
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
    async (certId: string) => {
      if (!contract) {
        toast.error('Contract not initialized');
        return false;
      }
      try {
        const isValid = await contract.verifyCertificate(certId);
        return isValid;
      } catch (error: any) {
        console.error('Failed to verify certificate:', error);
        toast.error(error.message || 'Failed to verify certificate');
        return false;
      }
    },
    [contract]
  );

  return {
    contract,
    signer,
    issueCertificate,
    verifyCertificate,
  };
}
