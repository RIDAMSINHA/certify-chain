import { ethers } from 'ethers';
import { toast } from 'sonner';

// Import the generated artifact that contains the ABI
import certificateRegistryArtifact from '../../artifacts/src/contracts/CertificateRegistry.sol/CertificateRegistry.json';
// Import the deployed contract configuration
import contractConfig from '../contract-config.json';

// Smart contract ABI for the CertificateRegistry
const CONTRACT_ADDRESS = contractConfig.contractAddress;
const certificateRegistryABI = certificateRegistryArtifact.abi;
console.log('Contract address:', CONTRACT_ADDRESS);
console.log('ABI:', certificateRegistryABI);

export class BlockchainService {
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;
  private currentAccount: string | null = null;

  constructor() {
    this.initialize();
  }

  async initialize() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        this.currentAccount = await this.signer.getAddress();
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, certificateRegistryABI, this.signer);
        console.log('Contract initialized:', this.contract);
        console.log('Blockchain service initialized successfully');

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          console.log('Account changed to:', accounts[0]);
          this.handleAccountChange(accounts[0]);
        });
      } catch (error) {
        console.error('Failed to initialize blockchain service:', error);
      }
    } else {
      console.log('Ethereum provider not available');
    }
  }

  // Handle account changes from MetaMask
  private async handleAccountChange(newAccount: string) {
    try {
      this.currentAccount = newAccount;
      // Re-initialize with the new account
      if (this.provider) {
        this.signer = await this.provider.getSigner();
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, certificateRegistryABI, this.signer);
        toast.info(`Switched to account: ${this.shortenAddress(newAccount)}`);
      }
    } catch (error) {
      console.error('Error handling account change:', error);
    }
  }

  // Switch MetaMask account
  async switchAccount(): Promise<string | null> {
    if (!window.ethereum) {
      toast.error('MetaMask is not installed');
      return null;
    }

    try {
      // This will prompt the user to select an account in MetaMask
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      
      // Get the selected account
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0 && accounts[0] !== this.currentAccount) {
        this.handleAccountChange(accounts[0]);
        return accounts[0];
      }
      
      return this.currentAccount;
    } catch (error) {
      console.error('Error switching account:', error);
      toast.error('Failed to switch account');
      return null;
    }
  }

  // Get current connected account
  getCurrentAccount(): string | null {
    return this.currentAccount;
  }

  // Shorten address for display
  shortenAddress(address: string): string {
    return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
  }
  
  async issueCertificate(name: string, recipientAddress: string, ipfsHash: string): Promise<{ certId: string, tx: ethers.TransactionResponse } | null> {
    if (!this.contract || !this.signer) {
      await this.initialize();
      if (!this.contract || !this.signer) {
        toast.error('Blockchain connection not available');
        return null;
      }
    }

    try {
      // Issue the certificate on the blockchain
      const tx = await this.contract.issueCertificate(name, recipientAddress, ipfsHash);
      console.log('Transaction sent:', name, recipientAddress, ipfsHash);
      
      // Wait for the transaction to be mined and get the receipt
      const receipt = await tx.wait();
      console.log('Transaction receipt events:', receipt);

      // Extract the CertificateIssued event from the receipt
      // const event = receipt.events?.find((e: any) => e.fragment && e.fragment.name === "CertificateIssued");
      
      // If not found, you could optionally decode logs manually:
      const iface = new ethers.Interface(certificateRegistryABI);
      const event = receipt.logs.map((log: any) => {
        try {
          return iface.parseLog(log);
        } catch (e) {
          return null;
        }
      }).find(parsed => parsed && parsed.name === "CertificateIssued");

      if (!event || !event.args || !event.args.certId) {
        throw new Error("CertificateIssued event not found in transaction receipt");
      }
      const certId = event.args.certId;
      
      return { certId, tx };
    } catch (error: any) {
      console.error('Error issuing certificate on blockchain:', error);
      toast.error(`Blockchain error: ${error.message || 'Unknown error'}`);
      return null;
    }
  }

  async verifyCertificate(certId: string): Promise<boolean> {
    if (!this.contract) {
      await this.initialize();
      if (!this.contract) {
        toast.error('Blockchain connection not available');
        return false;
      }
    }

    try {
      const isValid = await this.contract.verifyCertificate(certId);
      return isValid;
    } catch (error) {
      console.error('Error verifying certificate on blockchain:', error);
      return false;
    }
  }

  async connectWallet(): Promise<string | null> {
    if (!window.ethereum) {
      toast.error('MetaMask is not installed');
      return null;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        await this.initialize(); // Re-initialize with the new account
        return accounts[0];
      }
      return null;
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      return null;
    }
  }

  isConnected(): boolean {
    return this.signer !== null;
  }
}

// Create and export a singleton instance of the service
export const blockchainService = new BlockchainService();
