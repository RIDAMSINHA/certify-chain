
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, AuthChangeEvent } from "@supabase/supabase-js";
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

  const checkIssuerStatus = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_issuer, name')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      return { isIssuer: profile?.is_issuer || false, name: profile?.name };
    } catch (error) {
      console.error('Error checking issuer status:', error);
      return { isIssuer: false, name: null };
    }
  };

  const handleAuthStateChange = async (sessionUser: User | null) => {
    console.log("handleAuthStateChange called with user:", sessionUser);
    
    if (!sessionUser) {
      setUser(null);
      setIsIssuer(false);
      if (location.pathname !== '/auth' && location.pathname !== '/register') {
        navigate('/auth');
      }
      return;
    }

    try {
      const { isIssuer: newIsIssuer, name } = await checkIssuerStatus(sessionUser.id);
      setUser(sessionUser);
      setIsIssuer(newIsIssuer);

      if (!name) {
        if (location.pathname !== '/register') {
          navigate('/register');
        }
      } else if (location.pathname === '/auth') {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error handling auth state:', error);
    }
  };

  // Single initialization effect that sets up auth state
  useEffect(() => {
    // Set up the auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await handleAuthStateChange(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsIssuer(false);
        navigate('/auth');
      }
    });

    // Then immediately check the session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Checking initial session:", session);
        
        if (session?.user) {
          await handleAuthStateChange(session.user);
        } else if (location.pathname !== '/auth' && location.pathname !== '/register') {
          navigate('/auth');
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setIsIssuer(false);
      navigate('/auth');
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log("AuthProvider state:", { user, isIssuer, loading });

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
