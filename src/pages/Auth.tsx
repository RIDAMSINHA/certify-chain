
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Key, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    isIssuer: false,
    name: "",
  });

  useEffect(() => {
    if (user) {
      toast.info("You are already signed in");
      navigate("/");
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              is_issuer: formData.isIssuer,
            },
          },
        });
        
        if (signUpError) throw signUpError;

        toast.success("Check your email to confirm your account");
      } else {
        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (signInError) throw signInError;

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("No active session found");
        }

        const userId = session.user.id;

        const { data: profile, error: profileSelectError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (profileSelectError) {
          console.error("Error checking profile:", profileSelectError);
          toast.error("Error checking profile");
          return;
        }

        if (!profile) {
          const { error: profileUpsertError } = await supabase
            .from("profiles")
            .upsert([
              {
                id: userId,
                name: formData.name || session.user.email,
                is_issuer: formData.isIssuer,
                wallet_address: null,
              },
            ]);
          if (profileUpsertError) {
            console.error("Profile creation error:", profileUpsertError);
            toast.error("Failed to create or update profile");
            return;
          }
        }
        toast.success("Signed in successfully");
        navigate("/");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(isSignUp ? "Failed to sign up" : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/register`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast.error("Failed to sign in with Google");
    }
  };

  const handleMetaMaskSignIn = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        
        if (accounts[0]) {
          const message = "Sign this message to verify your identity";
          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, accounts[0]],
          });

          // Check if wallet address already exists in profiles
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('wallet_address', accounts[0])
            .maybeSingle();

          if (!existingProfile) {
            // Generate a random password for the new account
            const randomPassword = crypto.randomUUID();
            
            // Create new auth user with placeholder email
            const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
              email: `${accounts[0].toLowerCase()}@placeholder.com`,
              password: randomPassword
            });

            if (signUpError) throw signUpError;

            if (newUser) {
              // Create profile for the new user
              const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                  {
                    id: newUser.id,
                    wallet_address: accounts[0],
                    name: `Wallet (${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)})`,
                  }
                ]);

              if (profileError) throw profileError;
            }
          } else {
            // If profile exists, sign in with placeholder email
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: `${accounts[0].toLowerCase()}@placeholder.com`,
              // Use a new random password in case the old one is not available
              password: crypto.randomUUID()
            });

            if (signInError) throw signInError;
          }

          toast.success("Signed in with MetaMask successfully");
          navigate("/");
        }
      } else {
        toast.error("Please install MetaMask");
      }
    } catch (error) {
      console.error("Error signing in with MetaMask:", error);
      toast.error("Failed to sign in with MetaMask");
    }
  };

  if (user) {
    return null;
  }

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
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="confirm-password" className="sr-only">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id="is-issuer"
                    name="is-issuer"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.isIssuer}
                    onChange={(e) =>
                      setFormData({ ...formData, isIssuer: e.target.checked })
                    }
                  />
                  <label
                    htmlFor="is-issuer"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Register as HR/Issuer
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isSignUp ? "Sign up with Email" : "Sign in with Email"}
            </button>

            {!isSignUp && (
              <>
                <button
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
                </button>

                <button
                  type="button"
                  onClick={handleMetaMaskSignIn}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Connect Wallet
                </button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Auth;
