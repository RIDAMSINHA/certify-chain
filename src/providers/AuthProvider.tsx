
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

      setIsIssuer(profile?.is_issuer || false);
    } catch (error) {
      console.error('Error checking issuer status:', error);
      setIsIssuer(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (session?.user) {
          setUser(session.user);
          await checkIssuerStatus(session.user.id);
        } else if (location.pathname !== '/auth') {
          navigate('/auth');
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (location.pathname !== '/auth') {
          navigate('/auth');
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      setLoading(true);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await checkIssuerStatus(session.user.id);
        navigate('/');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsIssuer(false);
        navigate('/auth');
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    // Protect routes
    if (!loading && !user && location.pathname !== '/auth') {
      navigate('/auth');
    }
  }, [loading, user, location.pathname, navigate]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsIssuer(false);
      localStorage.removeItem('sb-peatdsafjrwjoimjmugm-auth-token');
      navigate('/auth');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isIssuer, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
