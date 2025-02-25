
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Key } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { MetaMaskAuth } from "@/components/auth/MetaMaskAuth";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isMetaMaskLogin, setIsMetaMaskLogin] = useState(false);

  useEffect(() => {
    if (user && user.user_metadata.profile) {
      toast.info("You are already signed in");
      navigate("/");
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/register`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast.error("Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {!isMetaMaskLogin && (
              <>
                {isSignUp
                  ? "Already have an account? "
                  : "Don't have an account? "}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setIsMetaMaskLogin(false);
                  }}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  {isSignUp ? "Sign in" : "Create one"}
                </button>
              </>
            )}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {isMetaMaskLogin ? (
            <MetaMaskAuth onBack={() => setIsMetaMaskLogin(false)} />
          ) : (
            <>
              <EmailAuthForm
                isSignUp={isSignUp}
                onSuccess={() => {
                  if (!isSignUp) {
                    navigate("/");
                  }
                }}
              />

              {!isSignUp && (
                <div className="space-y-4">
                  {/* <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <img
                      src="https://www.google.com/favicon.ico"
                      alt="Google"
                      className="w-4 h-4 mr-2"
                    />
                    Sign in with Google
                  </button> */}

                  <button
                    type="button"
                    onClick={() => setIsMetaMaskLogin(true)}
                    className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
