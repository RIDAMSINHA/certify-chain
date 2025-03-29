import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Check, Loader, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { blockchainService } from "@/utils/blockchain";

const Register = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isConnected, setIsConnected] = useState(blockchainService.isConnected());
  const [isConnecting, setIsConnecting] = useState(false);
  const [name, setName] = useState("");
  const [isHR, setIsHR] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const address = await blockchainService.connectWallet();
      if (address) {
        setIsConnected(true);
        toast.success("Wallet connected successfully");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    setIsRegistering(true);
    try {
      const success = await blockchainService.signup(name, isHR);
      
      if (success) {
        setSuccessMessage("Registration successful!");
        toast.success("You've been registered successfully");
        
        // After a short delay, navigate to dashboard
        setTimeout(() => {
          navigate("/userdashboard");
        }, 2000);
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Error registering:", error);
      toast.error("An error occurred during registration");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">Register on Blockchain</h1>
          <p className="text-gray-500 mt-2">
            Register to access your certificates and verify them on the blockchain
          </p>
        </div>

        {!isConnected ? (
          <div className="space-y-6">
            <p className="text-center text-gray-600">
              Connect your wallet to register on the blockchain
            </p>
            <Button 
              onClick={connectWallet} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </Button>
          </div>
        ) : successMessage ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-700">{successMessage}</h2>
            <p className="text-gray-600">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="isHR"
                type="checkbox"
                checked={isHR}
                onChange={(e) => setIsHR(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isHR" className="ml-2 block text-sm text-gray-700">
                Register as HR (enables issuing certificates)
              </label>
            </div>
            
            <Button
              type="submit"
              disabled={isRegistering || !name.trim()}
              className="w-full"
            >
              {isRegistering ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              Registration will confirm a transaction on the blockchain. Please make sure you have enough ETH for gas fees.
            </p>
          </form>
        )}
      </Card>
    </div>
  );
};

export default Register;
