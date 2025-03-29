
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Key } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { MetaMaskAuth } from "@/components/auth/MetaMaskAuth";
import { log } from "console";
import initializeAuth from "./Auth";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isIssuer, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isMetaMaskLogin, setIsMetaMaskLogin] = useState(false);

  useEffect(() => {
    if (user) {
      // If user is logged in but doesn't have a name, redirect to register
      if (!user.user_metadata?.name) {
        navigate('/register');
      } else {
        // Otherwise redirect based on role
        navigate(isIssuer ? '/issue' : '/user');
      }
    }
  }, [user, isIssuer, navigate]);

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
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-2xl shadow-gray-800"
      >
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {isSignUp ? "Create Your Account" : "Welcome Back!"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {!isMetaMaskLogin && (
              <>
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setIsMetaMaskLogin(false);
                  }}
                  className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
                >
                  {isSignUp ? "Sign in" : "Create one"}
                </button>
              </>
            )}
          </p>
        </div>

        <div className="space-y-6">
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
                  <button
                    type="button"
                    onClick={() => setIsMetaMaskLogin(true)}
                    className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition duration-200"
                  >
                    <Key className="w-5 h-5 mr-2" />
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
