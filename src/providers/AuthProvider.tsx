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
      
      return { 
        isIssuer: profile?.is_issuer || false, 
        name: profile?.name || null 
      };
    } catch (error) {
      console.error('Error checking issuer status:', error);
      toast.error('Failed to fetch user profile');
      return { isIssuer: false, name: null };
    }
  };


  const initializeAuth = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log("Fetched session:", session);  // 🛠 Debugging
        if (error) throw error;
        const publicRoutes = ['/', '/about', '/features']; // ✅ Add all public pages

        const isPublicRoute = publicRoutes.includes(location.pathname);
        
        if (session?.user) {
            console.log("User found:", session.user);
            const { isIssuer, name } = await checkIssuerStatus(session.user.id);
            setUser(session.user);
            setIsIssuer(isIssuer);
            if (!name && !location.pathname.startsWith('/register')) {
                console.log("Redirecting to /register from initializeAuth");
                navigate('/register');
            } else if (name && !['/', '/auth', '/register'].includes(location.pathname)) {
                console.log("Redirecting to /issue or /user from initializeAuth");
                navigate(isIssuer ? '/issue' : '/user');
            }
        } 
        else if (!isPublicRoute) {  
            console.log("No user found, redirecting to /auth");
            navigate('/auth');
        } else {
            console.log("No user found, staying on landing page");
        }
    } catch (error) {
        console.error("Error initializing auth:", error);
        toast.error("Failed to restore session");
    } finally {
        setLoading(false);
    }
};



  const handleAuthStateChange = async (event: AuthChangeEvent, sessionUser: User | null) => {
    try {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (sessionUser) {
          const { isIssuer, name } = await checkIssuerStatus(sessionUser.id);
          setUser(sessionUser);
          setIsIssuer(isIssuer);

          if (!name) {
            navigate('/register');
          } else if (!['/', '/auth', '/register'].includes(location.pathname)) {
            sessionStorage.removeItem('redirectAfterLogin');
            navigate(isIssuer ? '/issue' : '/user');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsIssuer(false);
        localStorage.removeItem('sb-peatdsafjrwjoimjmugm-auth-token');
        sessionStorage.clear();
        if (!['/', '/auth'].includes(location.pathname) && 
            !location.pathname.includes('/certificates/') && 
            !location.pathname.includes('/userprofile/')) {
              console.log("sign out nav");
          navigate('/auth');
        }
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
      toast.error('Failed to update authentication state');
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // First attempt proper logout
      try {
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) throw error;
      } catch (apiError) {
        console.warn('Logout API failed, performing client-side cleanup:', apiError);
      }
      
      // Client-side cleanup
      localStorage.removeItem('sb-peatdsafjrwjoimjmugm-auth-token');
      sessionStorage.clear();
      setUser(null);
      setIsIssuer(false);
      navigate('/auth');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error(error.message || 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthStateChange(event, session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    
    // Public routes that don't require authentication
    const publicRoutes = ['/', '/auth', '/register'];
    const publicPathPrefixes = ['/certificates/', '/userprofile/'];
    
    const isPublicRoute = 
      publicRoutes.includes(location.pathname) ||
      publicPathPrefixes.some(prefix => location.pathname.startsWith(prefix));

    // ⛔ Only redirect if user is null AND route is NOT public ("/" should be accessible)
    if (!user && !isPublicRoute) {
      console.log("ndjknafdas");
      navigate('/auth');
    }
  }, [loading, user, location.pathname, navigate]);


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