import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, User, Shield, Bell, Link, Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      toast.error("Error fetching profile");
      return;
    }

    setProfile(data);
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        
        if (accounts[0]) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('wallet_address', accounts[0])
            .neq('id', user?.id)
            .maybeSingle();

          if (existingProfile) {
            toast.error("This wallet is already linked to another account");
            return;
          }

          const { error } = await supabase
            .from("profiles")
            .update({ wallet_address: accounts[0] })
            .eq("id", user?.id)
            .select();

          if (error) throw error;
          toast.success("Wallet connected successfully!");
          fetchProfile();
        }
      } else {
        toast.error("Please install MetaMask");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet");
    }
  };

  const linkEmail = async () => {
    try {
      if (!email || !password) {
        toast.error("Please enter both email and password");
        return;
      }

      const userId = user?.id;
      const newEmail = email;
      const response = await fetch("https://peatdsafjrwjoimjmugm.supabase.co/functions/v1/updateEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYXRkc2FmanJ3am9pbWptdWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4MTQ0ODYsImV4cCI6MjA1NTM5MDQ4Nn0.EzdiddAq24zmYWnFaBC2oORvrskqA3EWYpbdcNpKjjI"
        },
        body: JSON.stringify({ userId, newEmail, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update user metadata");
      }
      console.log("Updated user:", data.user);

      // Re-fetch the session to get updated tokens and user data.
    const { data: { session: newSession }, error: getSessionError } = await supabase.auth.getSession();
    if (getSessionError) {
      throw getSessionError;
    }
    if (!newSession) {
      throw new Error("No new session found");
    }
    console.log("New session data:", newSession);

    // Set the session on the client so that the localStorage gets updated
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: newSession.access_token,
      refresh_token: newSession.refresh_token,
    });
    if (setSessionError) {
      throw setSessionError;
    }

    toast.success("Email linked and session updated successfully!");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Error linking email:", error);
      toast.error("Failed to link email");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-8 px-4"
    >
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Profile Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <p className="mt-1 text-gray-600">{user?.email}</p>
            </div>
            {profile?.wallet_address && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Connected Wallet
                </label>
                <p className="mt-1 text-gray-600">{profile.wallet_address}</p>
              </div>
            )}
          </div>
        </section>

        {/* Connect Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Connect Accounts</h2>
          </div>
          
          {!profile?.wallet_address && (
            <div className="mb-4">
              <button
                onClick={connectWallet}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </button>
            </div>
          )}

          {user?.email?.includes('placeholder') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Create a password"
                />
              </div>
              <button
                onClick={linkEmail}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Mail className="w-4 h-4 mr-2" />
                Link Email
              </button>
            </div>
          )}
        </section>

        {/* Security Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Security</h2>
          </div>
          <button
            onClick={() => toast.info("Password reset email sent")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Change Password
          </button>
        </section>

        {/* Notifications Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
            <label className="text-sm text-gray-600">
              Receive email notifications
            </label>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default Settings;
