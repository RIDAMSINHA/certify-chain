import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  isIssuer: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isIssuer: false,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isIssuer, setIsIssuer] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Helper: fetch additional profile info
  const checkIssuerStatus = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_issuer, name")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;
      return { isIssuer: profile?.is_issuer || false, name: profile?.name };
    } catch (error) {
      console.error("Error checking issuer status:", error);
      return { isIssuer: false, name: null };
    }
  };

  // Update state based on the current session
  const handleAuthStateChange = async (sessionUser: User | null) => {
    console.log("handleAuthStateChange invoked with:", sessionUser);
    if (!sessionUser) {
      setUser(null);
      setIsIssuer(false);
      if (location.pathname !== "/auth" && location.pathname !== "/register") {
        navigate("/auth");
      }
      return;
    }
    try {
      const { isIssuer: newIsIssuer, name } = await checkIssuerStatus(sessionUser.id);
      setUser(sessionUser);
      setIsIssuer(newIsIssuer);
      console.log("Profile details:", { name, isIssuer: newIsIssuer });
      if (!name && location.pathname !== "/register") {
        navigate("/register");
      } else if (name && location.pathname === "/auth") {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error handling auth state:", error);
    }
  };

  // Log user updates for debugging
  useEffect(() => {
    console.log("User updated:", user);
  }, [user]);

  // Rely on onAuthStateChange to update state once the session is rehydrated.
  useEffect(() => {
    let mounted = true;

    // You may still call getSession() to get an initial snapshot
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session);
      // Even if session is null, onAuthStateChange will update the state when ready.
      if (mounted && session?.user) {
        handleAuthStateChange(session.user);
      }
      if (mounted) setLoading(false);
    }).catch((error) => {
      console.error("Error initializing auth:", error);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);
      if (mounted) {
        // onAuthStateChange will be called when the session is restored or changes.
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          await handleAuthStateChange(session?.user || null);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setIsIssuer(false);
          if (location.pathname !== "/auth") {
            navigate("/auth");
          }
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setIsIssuer(false);
      navigate("/auth");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log("AuthProvider rendered", user, isIssuer, loading);
  return (
    <AuthContext.Provider value={{ user, isIssuer, loading, logout }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
