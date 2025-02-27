
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Building2, Briefcase } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

const Register = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.name || "",
    isIssuer: false,
  });

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (user.user_metadata && user.user_metadata.name) {
        // If the user already has a name set in their metadata, registration is complete.
        navigate("/");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        navigate("/");
      }
    };

    checkExistingProfile();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!user) throw new Error("No user found");

      // Update the user's metadata so that raw_user_meta_data includes name and is_issuer
      const { data, error } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          is_issuer: formData.isIssuer,
        },
      });

      if (error) throw error;

      console.log("Updated user metadata:", data);

      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            wallet_address: user.user_metadata.wallet_address,
            name: formData.name,
            is_issuer: formData.isIssuer,
          },
        ]);

      if (profileError) throw profileError;

      // Refresh the session to get the latest metadata.
      const { data: { session: newSession }, error: getSessionError } = await supabase.auth.getSession();
      if (getSessionError) throw getSessionError;
      if (newSession) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: newSession.access_token,
          refresh_token: newSession.refresh_token,
        });
        if (setSessionError) throw setSessionError;
      }
      
      toast.success("Profile created successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Failed to create profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please provide additional information to complete your registration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <input
                id="is-issuer"
                name="is-issuer"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.isIssuer}
                onChange={(e) => setFormData({ ...formData, isIssuer: e.target.checked })}
              />
              <label htmlFor="is-issuer" className="ml-2 block text-sm text-gray-900">
                Register as HR/Issuer
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? "Creating Profile..." : "Complete Registration"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;
