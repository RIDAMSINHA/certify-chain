import { Key, ArrowLeft, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface MetaMaskAuthProps {
  onBack: () => void;
}

export const MetaMaskAuth = ({ onBack }: MetaMaskAuthProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Generate a deterministic password from the wallet address
  const generateDeterministicPassword = async (
    address: string
  ): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(address);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleMetaMaskSignIn = async () => {
    try {
      setLoading(true);
      console.log("🚀 Starting MetaMask Sign-In...");

      if (!window.ethereum) {
        console.error("❌ MetaMask is not installed.");
        toast.error("Please install MetaMask");
        return;
      }

      // Request accounts from MetaMask
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!accounts.length) {
        console.error("❌ No MetaMask accounts found.");
        return;
      }

      const walletAddress = accounts[0].toLowerCase();
      console.log("🛠️ Wallet Address:", walletAddress);

      // The message to sign
      const message = "Sign this message to verify your identity";
      // Request the signature and capture the returned signature value
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      });
      console.log("✅ Signature received:", signature);

      // Generate deterministic password and pseudo‑email
      const password = await generateDeterministicPassword(walletAddress);
      const email = `wallet_${walletAddress}@example.com`;
      console.log(
        "🔑 Generated Credentials - Email:",
        email,
        "Password:",
        password
      );

      // First, check if a profile with this wallet address already exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("wallet_address", walletAddress)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error checking profile:", profileError);
      }

      if (profile) {
        console.log("Profile found. Logging in directly...", profile);

        if (profile.metamask_linked) {
          try {
            // Send all required parameters: walletAddress, signature, and message
            const body = JSON.stringify({ walletAddress, signature, message });
            console.log("Sending body:", body);
            const response = await fetch(
              "https://peatdsafjrwjoimjmugm.supabase.co/functions/v1/auth-metamask-login",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization:
                    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYXRkc2FmanJ3am9pbWptdWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4MTQ0ODYsImV4cCI6MjA1NTM5MDQ4Nn0.EzdiddAq24zmYWnFaBC2oORvrskqA3EWYpbdcNpKjjI",
                },
                body,
              }
            );
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.error || "Failed to log in via MetaMask"
              );
            }
            const responseData = await response.json();
            const { access_token, refresh_token } = responseData.session;
            console.log("✅ Received session data:", responseData.session);
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (setSessionError) throw new Error(setSessionError.message);
            toast.success("Signed in with MetaMask successfully");
            navigate("/user");
            return;
          } catch (error) {
            toast.error("Error logging in via MetaMask:", error.message);
            console.error("Error logging in via MetaMask:", error);
          }
        }

        // If the profile exists but is not metamask_linked, sign in using the deterministic credentials.
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw new Error(signInError.message);
        console.log("✅ Sign-in data:", signInData);
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: signInData.session?.access_token,
          refresh_token: signInData.session?.refresh_token,
        });
        if (setSessionError) throw new Error(setSessionError.message);
      } else {
        console.log(
          "No existing profile found. Creating new user via Edge Function..."
        );
        // Invoke your Edge Function to create a new MetaMask user.
        const response = await fetch(
          "https://peatdsafjrwjoimjmugm.supabase.co/functions/v1/auth-metamask",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYXRkc2FmanJ3am9pbWptdWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4MTQ0ODYsImV4cCI6MjA1NTM5MDQ4Nn0.EzdiddAq24zmYWnFaBC2oORvrskqA3EWYpbdcNpKjjI",
            },
            body: JSON.stringify({ email, password, walletAddress }),
          }
        );
        const text = await response.text();
        console.log("Edge Function Response:", text);
        const responseData = text ? JSON.parse(text) : {};
        if (!response.ok) {
          if (
            responseData.error &&
            responseData.error.includes("already been registered")
          ) {
            console.warn(
              "Edge Function indicates user is already registered. Signing in directly..."
            );
            const { data: signInData, error: signInError } =
              await supabase.auth.signInWithPassword({
                email,
                password,
              });
            if (signInError) throw new Error(signInError.message);
            console.log("✅ Sign-in data:", signInData);
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: signInData.session?.access_token,
              refresh_token: signInData.session?.refresh_token,
            });
            if (setSessionError) throw new Error(setSessionError.message);
          } else {
            throw new Error(
              responseData.error || "Failed to create MetaMask user"
            );
          }
        } else {
          console.log(
            "✅ Received session data from Edge Function:",
            responseData.session
          );
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: responseData.session.access_token,
            refresh_token: responseData.session.refresh_token,
          });
          if (setSessionError) throw new Error(setSessionError.message);
        }
      }

      // Now, check the user's metadata to decide where to navigate.
      const {
        data: { user: currentUser },
        error: getUserError,
      } = await supabase.auth.getUser();
      if (getUserError) throw getUserError;
      console.log("Current user metadata:", currentUser?.user_metadata);

      if (currentUser && currentUser.user_metadata) {
        if (
          currentUser.user_metadata.wallet_address === walletAddress &&
          currentUser.user_metadata.name
        ) {
          navigate("/");
        } else {
          navigate("/register");
        }
      } else {
        navigate("/register");
      }

      toast.success("Signed in with MetaMask successfully");
    } catch (error) {
      console.error("🚨 Error signing in with MetaMask:", error);
      toast.error("Failed to sign in with MetaMask", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center"></div>
      <button
        type="button"
        onClick={handleMetaMaskSignIn}
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[rgb(15,23,42)] hover:bg-[rgb(30,41,59)]"
                >
        {loading ? (
          <Loader className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Key className="w-4 h-4 mr-2" />
        )}
        {loading ? "Connecting..." : "Connect with MetaMask"}
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
