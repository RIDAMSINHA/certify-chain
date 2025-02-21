import { useState } from "react";
import { Key, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";

interface MetaMaskAuthProps {
  onBack: () => void;
}

export const MetaMaskAuth = ({ onBack }: MetaMaskAuthProps) => {
  const navigate = useNavigate();
  const [isIssuer, setIsIssuer] = useState(false);

  const generateDeterministicPassword = async (address: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(address);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleMetaMaskSignIn = async () => {
    try {
      console.log("🚀 Starting MetaMask Sign-In...");

      if (!window.ethereum) {
        console.error("❌ MetaMask is not installed.");
        toast.error("Please install MetaMask");
        return;
      }

      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!accounts.length) {
        console.error("❌ No MetaMask accounts found.");
        return;
      }

      const walletAddress = accounts[0].toLowerCase();
      console.log("🛠️ Wallet Address:", walletAddress);

      const message = "Sign this message to verify your identity";
      await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      });
      console.log("✅ Signature received.");

      // Generate a deterministic password based on wallet address
      const password = await generateDeterministicPassword(walletAddress);
      const email = `wallet_${walletAddress}@internal`;
      console.log("🔑 Generated Credentials - Email:", email, "Password:", password);

      // Invoke the Edge Function
      const response = await fetch(`https://peatdsafjrwjoimjmugm.supabase.co/functions/v1/auth-metamask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYXRkc2FmanJ3am9pbWptdWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4MTQ0ODYsImV4cCI6MjA1NTM5MDQ4Nn0.EzdiddAq24zmYWnFaBC2oORvrskqA3EWYpbdcNpKjjI"
         },
        body: JSON.stringify({ email, password, walletAddress }),
      });
      const text = await response.text();
      console.log("Edge Function Response:", text);
      const responseData = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create MetaMask user");
      }
      
      console.log("✅ Received session data from Edge Function:", responseData.session);

      // Set the session on the client using the returned tokens
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: responseData.session.access_token,
        refresh_token: responseData.session.refresh_token,
      });
      if (setSessionError) throw setSessionError;

      console.log("✅ Successfully authenticated with MetaMask.");
      toast.success("Signed in with MetaMask successfully");
      navigate("/dashboard");
    } catch (error) {
      console.error("🚨 Error signing in with MetaMask:", error);
      toast.error("Failed to sign in with MetaMask");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <input
          id="metamask-is-issuer"
          type="checkbox"
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          checked={isIssuer}
          onChange={(e) => setIsIssuer(e.target.checked)}
        />
        <label htmlFor="metamask-is-issuer" className="ml-2 text-sm text-gray-900">
          Register as HR/Issuer
        </label>
      </div>
      <button
        type="button"
        onClick={handleMetaMaskSignIn}
        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        <Key className="w-4 h-4 mr-2" />
        Connect with MetaMask
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Sign In
      </button>
    </div>
  );
};
