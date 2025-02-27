
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, AuthChangeEvent } from "@supabase/supabase-js";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

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

// Helper function to get stored session
const getStoredSession = () => {
  try {
    const storedSession = localStorage.getItem('sb-peatdsafjrwjoimjmugm-auth-token');
    if (storedSession) {
      return JSON.parse(storedSession);
    }
  } catch (error) {
    console.error('Error parsing stored session:', error);
  }
  return null;
};

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
      
      if (!profile) {
        return { isIssuer: false, name: null };
      }

      return { 
        isIssuer: profile.is_issuer || false, 
        name: profile.name 
      };
    } catch (error) {
      console.error('Error checking issuer status:', error);
      toast.error('Failed to fetch user profile');
      return { isIssuer: false, name: null };
    }
  };

  const initializeAuth = async () => {
    try {
      // First check local storage
      const storedSession = getStoredSession();
      const initialUser = storedSession?.user || null;

      // Then verify with Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Session:', session);
      if (error) throw error;

      const sessionUser = session?.user || initialUser;
      console.log('Session User:', sessionUser);

      if (sessionUser) {
        const userIsIssuer  = sessionUser.user_metadata.is_issuer;
        const name = sessionUser.user_metadata.name;
        setUser(sessionUser);
        setIsIssuer(userIsIssuer);

        // Handle navigation based on profile status
        if (!name && location.pathname !== '/register') {
          navigate('/register');
        }
      } else if (location.pathname !== '/auth' && location.pathname !== '/register') {
        navigate('/auth');
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      toast.error('Failed to restore session');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthStateChange = async (event: AuthChangeEvent, sessionUser: User | null) => {
    console.log('Auth state changed:', event, sessionUser);
    
    try {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (sessionUser) {
          const userIsIssuer = sessionUser.user_metadata.is_issuer;
          const name = sessionUser.user_metadata.name;
          
          setUser(sessionUser);
          setIsIssuer(userIsIssuer);

          if (!name) {
            navigate('/register');
          } else if (location.pathname === '/auth') {
            navigate('/dashboard');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsIssuer(false);
        navigate('/auth');
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
      toast.error('Failed to update authentication state');
    }
  };

  // Initialize auth state and set up listeners
  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthStateChange(event, session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle route protection
  useEffect(() => {
    if (!loading && !user && location.pathname !== '/auth' && location.pathname !== '/register') {
      navigate('/auth');
    }
  }, [loading, user, location.pathname, navigate]);

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setIsIssuer(false);
      navigate('/auth');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  console.log('AuthProvider state:', { user, isIssuer, loading });

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
