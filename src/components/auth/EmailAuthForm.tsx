import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";

interface EmailAuthFormProps {
  isSignUp: boolean;
  onSuccess: () => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  isIssuer: boolean;
  name: string;
}

export const EmailAuthForm = ({ isSignUp, onSuccess }: EmailAuthFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    isIssuer: false,
    name: "",
  });

  // Helper function to check if a profile exists, and if not, create it.
  const createProfileIfMissing = async (
    user: User,
    name?: string,
    isIssuer?: boolean
  ) => {
    const { data: profile, error: profileSelectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileSelectError) {
      throw new Error("Error checking profile");
    }
    if (!profile) {
      const { error: profileUpsertError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: name || user.email,
          is_issuer: isIssuer || false,
          wallet_address: null,
        });
      if (profileUpsertError) {
        throw new Error("Failed to create or update profile");
      }
    }
  };

  // Handle form submission for both sign-up and sign-in flows.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        // For new sign-ups, use emailRedirectTo so the user is redirected to /auth after clicking the email link.
        const { error: signUpError } = await supabase.auth.signUp({
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
        // For direct sign-in using email/password.
        const { error: signInError } = await supabase.auth.signInWithPassword({
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

        // Check if a profile exists; if not, create one using form data when available.
        await createProfileIfMissing(
          session.user,
          formData.name,
          formData.isIssuer
        );

        toast.success("Signed in successfully");
        navigate("/");
      }
      onSuccess();
    } catch (error) {
      console.error("Error:", error.message);
      toast.error(
        isSignUp
          ? `Failed to sign up: ${error.message}`
          : `Failed to sign in: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                setFormData({
                  ...formData,
                  confirmPassword: e.target.value,
                })
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
      <button
        type="submit"
        disabled={isLoading}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isSignUp ? "Signing up..." : "Signing in..."}
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 mr-2" />
            {isSignUp ? "Sign up with Email" : "Sign in with Email"}
          </>
        )}
      </button>
    </form>
  );
};
