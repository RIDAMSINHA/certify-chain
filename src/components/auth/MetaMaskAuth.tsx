
import { useState } from "react";
import { Key, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
      if (typeof window.ethereum !== "undefined") {
        const accounts: string[] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        if (accounts[0]) {
          const walletAddress = accounts[0];
          const message = "Sign this message to verify your identity";
          await window.ethereum.request({
            method: "personal_sign",
            params: [message, walletAddress],
          });
          
          const password = await generateDeterministicPassword(walletAddress);
          const email = `wallet_${walletAddress.toLowerCase()}@internal`;

          const { data: signInData, error: signInError } = 
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (signInError) {
            const { data: signUpData, error: signUpError } =
              await supabase.auth.signUp({
                email,
                password,
              });

            if (signUpError) throw signUpError;

            if (signUpData.user) {
              const { error: profileError } = await supabase
                .from("profiles")
                .insert([
                  {
                    id: signUpData.user.id,
                    wallet_address: walletAddress,
                    is_issuer: isIssuer
                  }
                ])
                .select()
                .single();

              if (profileError) throw profileError;

              const { error: newSignInError } = await supabase.auth.signInWithPassword({
                email,
                password,
              });

              if (newSignInError) throw newSignInError;
            }
          }

          toast.success("Signed in with MetaMask successfully");
          navigate("/register");
        }
      } else {
        toast.error("Please install MetaMask");
      }
    } catch (error) {
      console.error("Error signing in with MetaMask:", error);
      toast.error("Failed to sign in with MetaMask");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <input
          id="metamask-is-issuer"
          name="metamask-is-issuer"
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          checked={isIssuer}
          onChange={(e) => setIsIssuer(e.target.checked)}
        />
        <label
          htmlFor="metamask-is-issuer"
          className="ml-2 block text-sm text-gray-900"
        >
          Register as HR/Issuer
        </label>
      </div>

      <button
        type="button"
        onClick={handleMetaMaskSignIn}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Key className="w-4 h-4 mr-2" />
        Connect with MetaMask
      </button>

      <button
        type="button"
        onClick={onBack}
        className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Sign In
      </button>
    </div>
  );
};
