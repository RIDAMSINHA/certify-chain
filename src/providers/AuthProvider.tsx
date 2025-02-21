
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
  const [initialized, setInitialized] = useState(false);
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
      if (initialized && location.pathname !== '/auth' && location.pathname !== '/register') {
        navigate('/auth');
      }
      return;
    }

    try {
      const { isIssuer: newIsIssuer, name } = await checkIssuerStatus(sessionUser.id);
      
      // Set user state immediately to prevent flashing
      setUser(sessionUser);
      setIsIssuer(newIsIssuer);

      // Only handle navigation after initialization
      if (initialized) {
        if (!name) {
          if (location.pathname !== '/register') {
            navigate('/register');
          }
        } else if (location.pathname === '/auth') {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error handling auth state:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        console.log("Initial session check:", session);
        
        if (mounted) {
          if (session?.user) {
            await handleAuthStateChange(session.user);
          }
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setLoading(true);
        if (session?.user) {
          await handleAuthStateChange(session.user);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsIssuer(false);
        if (location.pathname !== '/auth') {
          navigate('/auth');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, initialized]);

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

  console.log("AuthProvider state:", { user, isIssuer, loading, initialized });

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
