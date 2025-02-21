
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

          // Try to sign in first
          const { data: signInData, error: signInError } = 
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (signInError?.message?.includes("Email not confirmed")) {
            // If email is not confirmed, get user and check if they exist
            const { data: getUserData, error: getUserError } = await supabase.auth.admin.listUsers();
            if (getUserError) throw getUserError;

            const existingUser = getUserData?.users?.find((user: User) => user.email === email);

            if (existingUser) {
              // If user exists but email not confirmed, delete the user and recreate
              await supabase.auth.admin.deleteUser(existingUser.id);
            }

            // Create new user
            const { data: signUpData, error: signUpError } =
              await supabase.auth.signUp({
                email,
                password,
                options: {
                  emailRedirectTo: `${window.location.origin}/auth`,
                  data: {
                    is_issuer: isIssuer
                  }
                }
              });

            if (signUpError) throw signUpError;

            if (signUpData?.user) {
              // Check if profile already exists
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", signUpData.user.id)
                .maybeSingle();

              if (!existingProfile) {
                // Create profile only if it doesn't exist
                const { error: profileError } = await supabase
                  .from("profiles")
                  .insert([
                    {
                      id: signUpData.user.id,
                      wallet_address: walletAddress,
                      is_issuer: isIssuer
                    }
                  ]);

                if (profileError) throw profileError;
              }

              // Auto-confirm email for MetaMask users since we verify them through wallet signature
              const { data: session } = await supabase.auth.setSession({
                access_token: signUpData.session?.access_token || "",
                refresh_token: signUpData.session?.refresh_token || ""
              });

              if (session) {
                toast.success("Signed in with MetaMask successfully");
                navigate("/register");
                return;
              }
            }
          } else if (!signInError) {
            // Successfully signed in
            toast.success("Signed in with MetaMask successfully");
            navigate("/register");
            return;
          }

          throw new Error("Failed to authenticate with MetaMask");
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
