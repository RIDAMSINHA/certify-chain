
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, User, Shield, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(false);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        
        if (accounts[0]) {
          const { error } = await supabase
            .from("profiles")
            .update({ wallet_address: accounts[0] })
            .eq("id", user?.id)
            .select();

          if (error) throw error;
          toast.success("Wallet connected successfully!");
        }
      } else {
        toast.error("Please install MetaMask");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet");
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
          </div>
        </section>

        {/* Wallet Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Wallet className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Web3 Wallet</h2>
          </div>
          <button
            onClick={connectWallet}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Connect Wallet
          </button>
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
