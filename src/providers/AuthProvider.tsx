
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

  const handleAuthStateChange = async (session: User | null) => {
    if (!session) {
      setUser(null);
      setIsIssuer(false);
      if (location.pathname !== '/auth') {
        navigate('/auth');
      }
      return;
    }

    try {
      const { isIssuer: newIsIssuer, name } = await checkIssuerStatus(session.id);
      setUser(session);
      setIsIssuer(newIsIssuer);

      // If we're on the register page, don't redirect
      if (location.pathname === '/register') {
        return;
      }

      // If profile is incomplete, redirect to register
      if (!name || newIsIssuer === null) {
        navigate('/register');
      } else if (location.pathname === '/auth') {
        navigate('/');
      }
    } catch (error) {
      console.error('Error handling auth state:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            await handleAuthStateChange(session.user);
          } else if (location.pathname !== '/auth') {
            navigate('/auth');
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);
      if (mounted) {
        if (event === 'INITIAL_SESSION') {
          // Don't set loading to true for initial session
          await handleAuthStateChange(session?.user || null);
        } else {
          setLoading(true);
          await handleAuthStateChange(session?.user || null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
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
