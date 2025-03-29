import { ethers } from 'ethers';
import { toast } from 'sonner';

// Import the deployed contract configuration
import contractConfig from '../contract-config.json';

// Define CertifyChain ABI manually instead of importing from artifacts
const certifyChainABI = [
  // User registration
  "function signup(string memory _name, bool _isHR) external returns (string memory)",
  "function users(address) external view returns (string, bool, bool, bytes32[])",
  
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
      console.log("Fetching user info for account:", this.currentAccount);
      const userInfo = await this.contract.users(this.currentAccount);
      console.log("Raw user info response:", userInfo);
      
      // Check if the userInfo is an array or tuple
      if (userInfo && Array.isArray(userInfo)) {
        this.userInfo = {
          name: userInfo[0] || '',
          isHR: Boolean(userInfo[1]),
          isRegistered: Boolean(userInfo[2])
        };
        console.log('Parsed user info:', this.userInfo);
      } else if (userInfo && typeof userInfo === 'object') {
        // Handle object format if returned
        this.userInfo = {
          name: userInfo.name || userInfo[0] || '',
          isHR: Boolean(userInfo.isHR || userInfo[1]),
          isRegistered: Boolean(userInfo.isRegistered || userInfo[2])
        };
        console.log('Parsed user info:', this.userInfo);
      } else {
        console.warn('Invalid user info format received:', userInfo);
        this.userInfo = {
          name: '',
          isHR: false,
          isRegistered: false
        };
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Reset user info on error
      this.userInfo = {
        name: '',
        isHR: false,
        isRegistered: false
      };
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
      // First check if the user is already registered
      await this.fetchUserInfo();
      
      if (this.userInfo?.isRegistered) {
        console.log('User is already registered:', this.userInfo);
        toast.success('You are already registered');
        return true;
      }
      
      console.log(`Signing up user: ${name}, isHR: ${isHR}`);
      const tx = await this.contract.signup(name, isHR);
      console.log('Signup transaction sent:', tx.hash);
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log('Signup transaction confirmed in block:', receipt.blockNumber);
      
      // Add a delay before fetching user info after signup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user info after signup
      try {
        await this.fetchUserInfo();
        
        // If the user info is still not showing as registered, try one more time
        if (!this.userInfo?.isRegistered) {
          console.log('User not showing as registered yet, retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          await this.fetchUserInfo();
        }
      } catch (error) {
        console.error('Error fetching user info after signup:', error);
      }
      
      // Even if fetchUserInfo fails, we consider the signup successful if the transaction was mined
      toast.success('Registration successful');
      return true;
    } catch (error: any) {
      console.error('Error signing up:', error);
      
      // Check if the error is "Already registered"
      if (error.reason === "Already registered" || 
          (error.message && error.message.includes("Already registered"))) {
        console.log('User is already registered (from error)');
        toast.success('You are already registered');
        
        // Update user info to reflect registration status
        if (this.userInfo) {
          this.userInfo.isRegistered = true;
          this.userInfo.name = name;
          this.userInfo.isHR = isHR;
        } else {
          this.userInfo = { name, isHR, isRegistered: true };
        }
        
        return true;
      }
      
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

    console.log(`Fetching certificates for recipient: ${recipientAddress}`);
    
    try {
      // First try direct contract method if available
      try {
        console.log("Trying direct contract call...");
        if (recipientAddress.toLowerCase() === this.currentAccount?.toLowerCase()) {
          // If fetching for the current user, use getUserCertificates
          const userCerts = await this.getUserCertificates();
          console.log("User certificates from contract:", userCerts);
          
          // Return early if we got certificates
          if (userCerts.length > 0) {
            const formatted = userCerts.map(cert => ({
              certId: cert.certId,
              ipfsHash: cert.ipfsHash || '',
              recipient: cert.recipient,
              name: cert.name,
              issuer: 'Unknown', // Not provided by getUserCertificates
              issueDate: 0,      // Not provided by getUserCertificates
              isValid: true      // Assume valid for now
            }));
            return formatted;
          }
        }
      } catch (directError) {
        console.error("Error calling direct contract method:", directError);
      }
      
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
      console.log("Contract address for logs:", contractAddress);
      
      // Define the event signature for CertificateIssued event - corrected to match the contract
      const eventSignature = "CertificateIssued(address,address,bytes32,string)";
      const eventTopic = ethers.id(eventSignature);
      console.log("Event signature:", eventSignature);
      console.log("Event topic:", eventTopic);
      
      // Format address for topic filtering
      const paddedAddress = ethers.zeroPadValue(recipientAddress.toLowerCase(), 32);
      console.log("Padded recipient address for filter:", paddedAddress);
      
      // Create a filter for logs where the recipient matches
      const filter = {
        address: contractAddress,
        topics: [
          eventTopic,
          null, // Issuer (any)
          paddedAddress // Recipient (specific)
        ]
      };
      
      console.log("Using filter:", JSON.stringify(filter));
      
      // Get the logs
      const logs = await this.provider.getLogs({
        ...filter,
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      console.log("Certificate logs for recipient:", logs);
      
      // Also try without recipient filter to see all events
      const allLogs = await this.provider.getLogs({
        address: contractAddress,
        topics: [eventTopic],
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      console.log("All certificate logs:", allLogs);
      console.log("Total events found:", allLogs.length);
      
      // If we have logs, parse them to get certificate data
      if (logs.length > 0) {
        // Parse the logs to extract certificate data
        const iface = new ethers.Interface(certifyChainABI);
        
        // Process each log to extract certificate data
        const certificatePromises = logs.map(async (log) => {
          try {
            console.log("Processing log:", log);
            const parsedLog = iface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            
            if (!parsedLog || !parsedLog.args) {
              console.error("Failed to parse log:", log);
              return null;
            }
            
            console.log("Parsed log:", parsedLog);
            console.log("Log args:", parsedLog.args);
            
            // Extract data from the event - updated for correct event signature
            const { issuer, recipient, certId, name } = parsedLog.args;
            
            console.log(`Certificate found: ${name} (${certId})`);
            console.log(`  Issuer: ${issuer}`);
            console.log(`  Recipient: ${recipient}`);
            
            try {
              // Get full certificate details from the contract
              const certDetails = await this.contract?.certificates(certId);
              
              if (certDetails) {
                console.log("Certificate details from contract:", certDetails);
                return {
                  certId,
                  ipfsHash: certDetails.ipfsHash,
                  recipient: certDetails.recipient,
                  name: certDetails.name,
                  issuer: certDetails.issuer,
                  issueDate: Number(certDetails.issueDate),
                  isValid: certDetails.isValid
                };
              }
              
              // Fallback to event data if contract lookup fails
              return {
                certId,
                ipfsHash: '', // Not available in event
                recipient,
                name,
                issuer,
                issueDate: 0, // Not available in event
                isValid: true // Assume valid (will be checked separately)
              };
            } catch (certError) {
              console.error("Error getting certificate details:", certError);
              
              // Use basic info from the event
              return {
                certId,
                ipfsHash: '',
                recipient,
                name,
                issuer,
                issueDate: 0,
                isValid: true
              };
            }
          } catch (error) {
            console.error("Error parsing certificate log:", error);
            return null;
          }
        });
        
        // Wait for all certificate verifications to complete
        const certificates = await Promise.all(certificatePromises);
        
        // Filter out any null results and log the final list
        const result = certificates.filter(cert => cert !== null) as {
          certId: string,
          ipfsHash: string,
          recipient: string,
          name: string,
          issuer: string,
          issueDate: number,
          isValid: boolean
        }[];
        
        console.log("Final certificates list:", result);
        return result;
      } else {
        console.log("No certificate logs found for this recipient");
      }
      
      // If no certificates found through events
      console.log("No certificates found through any method");
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

  // Get certificate details directly from the blockchain by certId
  async getCertificateDetails(certId: string): Promise<{name: string, issuer: string, recipient: string, ipfsHash: string, issueDate: number, isValid: boolean} | null> {
    if (!this.contract) {
      await this.initialize();
      if (!this.contract) {
        console.error('Blockchain connection not available');
        return null;
      }
    }

    try {
      console.log(`Fetching certificate details for ID: ${certId}`);
      
      // Ensure the certId has 0x prefix
      if (!certId.startsWith('0x')) {
        certId = `0x${certId}`;
      }
      
      // Call the certificates mapping directly with the certId
      const certDetails = await this.contract.certificates(certId);
      console.log('Raw certificate details from blockchain:', certDetails);
      
      if (!certDetails || !certDetails.recipient) {
        console.log('Certificate not found on blockchain');
        return null;
      }
      
      // Format the result
      return {
        name: certDetails.name || '',
        issuer: certDetails.issuer || '',
        recipient: certDetails.recipient || '',
        ipfsHash: certDetails.ipfsHash || '',
        issueDate: certDetails.issueDate ? Number(certDetails.issueDate) : 0,
        isValid: Boolean(certDetails.isValid)
      };
    } catch (error) {
      console.error('Error fetching certificate details from blockchain:', error);
      return null;
    }
  }
}

// Create and export a singleton instance of the service
export const blockchainService = new BlockchainService();
