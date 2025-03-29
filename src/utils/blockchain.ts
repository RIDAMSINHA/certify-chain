import { ethers } from 'ethers';
import { toast } from 'sonner';

// Import the deployed contract configuration
import contractConfig from '../contract-config.json';

// Define CertifyChain ABI manually instead of importing from artifacts
const certifyChainABI = [
  // User registration
  "function signup(string memory _name, bool _isHR) external returns (string memory)",
  "function users(address) external view returns (string name, bool isHR, bool isRegistered)",
  
  // Certificate management
  "function issueCertificate(address _recipient, string memory _name, string memory _ipfsHash) external returns (string memory)",
  "function verifyCertificate(bytes32 certId) external view returns (string memory)",
  "function getUserCertificates() external view returns (tuple(string name, address issuer, address recipient, string ipfsHash, uint256 issueDate, bool isValid)[] memory, string memory)",
  "function revokeCertificate(bytes32 certId) external returns (string memory)",
  "function certificates(bytes32) external view returns (string name, address issuer, address recipient, string ipfsHash, uint256 issueDate, bool isValid)",
  
  // Events
  "event UserRegistered(address user, string name, bool isHR)",
  "event CertificateIssued(address indexed issuer, address indexed recipient, bytes32 certId, string name)",
  "event CertificateRevoked(bytes32 certId)"
];

// Smart contract ABI for the CertifyChain
const CONTRACT_ADDRESS = contractConfig.contractAddress;
console.log('Contract address:', CONTRACT_ADDRESS);
console.log('Using manually defined ABI for CertifyChain');

export interface Certificate {
  name: string;
  issuer: string;
  recipient: string;
  ipfsHash: string;
  issueDate: number;
  isValid: boolean;
}

export class BlockchainService {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private currentAccount: string | null = null;
  private userInfo: { name: string; isHR: boolean; isRegistered: boolean } | null = null;
  private userRole: string | null = null;
  private isRegisteredFlag: boolean = false;

  constructor() {
    this.initialize();
  }

  async initialize() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        this.currentAccount = await this.signer.getAddress();
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, certifyChainABI, this.signer);
        console.log('Contract initialized:', this.contract);
        console.log('Blockchain service initialized successfully');

        // Fetch user info if available
        await this.fetchUserInfo();

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

  // Fetch user information from the contract
  private async fetchUserInfo() {
    if (!this.contract || !this.currentAccount) return;
    
    try {
      const userInfo = await this.contract.users(this.currentAccount);
      if (userInfo) {
        this.userInfo = {
          name: userInfo.name,
          isHR: userInfo.isHR,
          isRegistered: userInfo.isRegistered
        };
        console.log('User info:', this.userInfo);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }

  // Handle account changes from MetaMask
  private async handleAccountChange(newAccount: string) {
    try {
      this.currentAccount = newAccount;
      // Re-initialize with the new account
      if (this.provider) {
        this.signer = await this.provider.getSigner();
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, certifyChainABI, this.signer);
        toast.info(`Switched to account: ${this.shortenAddress(newAccount)}`);
        
        // Update user info for the new account
        await this.fetchUserInfo();
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

  // Sign up user (new method for CertifyChain)
  async signup(name: string, isHR: boolean): Promise<boolean> {
    if (!this.contract || !this.signer) {
      await this.initialize();
      if (!this.contract || !this.signer) {
        toast.error('Blockchain connection not available');
        return false;
      }
    }

    try {
      const tx = await this.contract.signup(name, isHR);
      await tx.wait();
      
      // Update user info after signup
      await this.fetchUserInfo();
      
      toast.success('Registration successful');
      return true;
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast.error(`Signup error: ${error.message || 'Unknown error'}`);
      return false;
    }
  }

  // Check if user is registered
  isUserRegistered(): boolean {
    return this.userInfo?.isRegistered || false;
  }

  // Check if user is HR
  isUserHR(): boolean {
    return this.userInfo?.isHR || false;
  }

  // Get user name
  getUserName(): string {
    return this.userInfo?.name || '';
  }
  
  // Issue certificate method (updated for CertifyChain)
  async issueCertificate(name: string, recipientAddress: string, ipfsHash: string): Promise<{ certId: string, tx: ethers.TransactionResponse } | null> {
    if (!this.contract || !this.signer) {
      await this.initialize();
      if (!this.contract || !this.signer) {
        toast.error('Blockchain connection not available');
        return null;
      }
    }

    // Check if the user is registered and is HR
    if (!this.isUserRegistered()) {
      toast.error('You need to register first');
      return null;
    }

    if (!this.isUserHR()) {
      toast.error('Only HR users can issue certificates');
      return null;
    }

    try {
      // Issue the certificate on the blockchain
      const tx = await this.contract.issueCertificate(recipientAddress, name, ipfsHash);
      console.log('Transaction sent:', recipientAddress, name, ipfsHash);
      
      // Wait for the transaction to be mined and get the receipt
      const receipt = await tx.wait();
      console.log('Transaction receipt events:', receipt);

      // Extract the CertificateIssued event from the receipt
      const iface = new ethers.Interface(certifyChainABI);
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

  // Verify certificate method (updated for CertifyChain)
  async verifyCertificate(certId: string): Promise<boolean> {
    if (!this.contract) {
      await this.initialize();
      if (!this.contract) {
        toast.error('Blockchain connection not available');
        return false;
      }
    }

    // Check if user is registered
    if (!this.isUserRegistered()) {
      toast.error('You need to register first to verify certificates');
      return false;
    }

    try {
      // Format certId if needed
      if (!certId.startsWith('0x')) {
        certId = '0x' + certId;
      }
      
      // Call the contract's verifyCertificate method
      const result = await this.contract.verifyCertificate(certId);
      
      // The new contract returns a string instead of a boolean
      return result.includes("valid");
    } catch (error) {
      console.error('Error verifying certificate on blockchain:', error);
      return false;
    }
  }

  // Get user certificates (new method for CertifyChain)
  async getUserCertificates(): Promise<{certId: string, ipfsHash: string, recipient: string, name: string}[]> {
    if (!this.contract) {
      await this.initialize();
      if (!this.contract) {
        toast.error('Blockchain connection not available');
        return [];
      }
    }

    // Check if user is registered
    if (!this.isUserRegistered()) {
      toast.error('You need to register first to view certificates');
      return [];
    }

    try {
      const result = await this.contract.getUserCertificates();
      const certificates = result[0];
      
      // Return certificate IDs, IPFS hashes, and recipient addresses
      return certificates.map((cert: any) => ({
        certId: ethers.keccak256(
          ethers.toUtf8Bytes(
            `${cert.name}-${cert.recipient}-${cert.ipfsHash}-${cert.issueDate}`
          )
        ),
        ipfsHash: cert.ipfsHash,
        recipient: cert.recipient,
        name: cert.name
      }));
    } catch (error) {
      console.error('Error getting user certificates:', error);
      toast.error('Failed to fetch certificates');
      return [];
    }
  }

  // Get certificates by recipient address
  async getCertificatesByRecipient(recipientAddress: string): Promise<{certId: string, ipfsHash: string, recipient: string, name: string, issuer: string, issueDate: number, isValid: boolean}[]> {
    if (!this.contract) {
      await this.initialize();
      if (!this.contract) {
        console.error('Blockchain connection not available');
        return [];
      }
    }

    try {
      // We need to query all certificates issued to this recipient
      // Since there's no direct method, we'll use getLogs to find certificate issue events
      
      // First check if we have a provider
      if (!this.provider) {
        await this.setupProvider();
        if (!this.provider) {
          console.error('Blockchain provider not available');
          return [];
        }
      }

      // Get the contract address
      const contractAddress = this.contract.target;
      
      // Define the event signature for CertificateIssued event
      const eventSignature = "CertificateIssued(address,address,string,string,uint256,bytes32)";
      const eventTopic = ethers.id(eventSignature);
      
      // Create a filter for logs where the recipient matches
      const filter = {
        address: contractAddress,
        topics: [
          eventTopic,
          null, // Issuer (any)
          ethers.zeroPadValue(recipientAddress.toLowerCase(), 32) // Recipient (specific)
        ]
      };
      
      // Get the logs
      const logs = await this.provider.getLogs({
        ...filter,
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      console.log("Certificate logs for recipient:", logs);
      
      // If we have logs, parse them to get certificate data
      if (logs.length > 0) {
        // Parse the logs to extract certificate data
        const iface = new ethers.Interface(certifyChainABI);
        
        // Process each log to extract certificate data
        const certificatePromises = logs.map(async (log) => {
          try {
            const parsedLog = iface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            
            if (!parsedLog || !parsedLog.args) {
              return null;
            }
            
            // Extract data from the event
            const { issuer, recipient, name, ipfsHash, issueDate, certId } = parsedLog.args;
            
            // Verify the certificate is valid
            const isValid = await this.verifyCertificate(certId);
            
            return {
              certId,
              ipfsHash,
              recipient,
              name,
              issuer,
              issueDate: Number(issueDate),
              isValid
            };
          } catch (error) {
            console.error("Error parsing certificate log:", error);
            return null;
          }
        });
        
        // Wait for all certificate verifications to complete
        const certificates = await Promise.all(certificatePromises);
        
        // Filter out any null results
        return certificates.filter(cert => cert !== null) as {
          certId: string,
          ipfsHash: string,
          recipient: string,
          name: string,
          issuer: string,
          issueDate: number,
          isValid: boolean
        }[];
      }
      
      // Try alternative approach by getting all user certificates from different users
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting certificates by recipient:', error);
      return [];
    }
  }

  // Revoke certificate (new method for CertifyChain)
  async revokeCertificate(certId: string): Promise<boolean> {
    if (!this.contract) {
      await this.initialize();
      if (!this.contract) {
        toast.error('Blockchain connection not available');
        return false;
      }
    }

    // Check if user is HR
    if (!this.isUserHR()) {
      toast.error('Only HR users can revoke certificates');
      return false;
    }

    try {
      // Format certId if needed
      if (!certId.startsWith('0x')) {
        certId = '0x' + certId;
      }
      
      const tx = await this.contract.revokeCertificate(certId);
      await tx.wait();
      
      toast.success('Certificate revoked successfully');
      return true;
    } catch (error: any) {
      console.error('Error revoking certificate:', error);
      toast.error(`Revocation error: ${error.message || 'Unknown error'}`);
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

  // Setup provider method
  async setupProvider(): Promise<void> {
    if (this.provider) return; // Already initialized
    
    try {
      // Try to get the Ethereum provider from window.ethereum
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        this.provider = new ethers.BrowserProvider((window as any).ethereum);
      } else {
        // Use a fallback provider for read-only operations
        this.provider = new ethers.JsonRpcProvider('http://localhost:8545');
      }
    } catch (error) {
      console.error('Error setting up provider:', error);
    }
  }
}

// Create and export a singleton instance of the service
export const blockchainService = new BlockchainService();
