
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  isIssuer: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isIssuer: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isIssuer, setIsIssuer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and set the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkIssuerStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkIssuerStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIssuerStatus = async (userId: string) => {
    try {
      // First check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_issuer')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // If profile doesn't exist, create it
      if (!profile) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        
        if (user) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: userId,
                is_issuer: user.user_metadata?.is_issuer || false,
                name: user.user_metadata?.name || user.email,
                wallet_address: user.user_metadata?.wallet_address || ''
              }
            ]);

          if (insertError) throw insertError;

          setIsIssuer(user.user_metadata?.is_issuer || false);
        }
      } else {
        setIsIssuer(profile.is_issuer || false);
      }
    } catch (error) {
      console.error('Error checking issuer status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isIssuer, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
