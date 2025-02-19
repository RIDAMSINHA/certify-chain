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

  // Refactored initialization using an async function
  useEffect(() => {
    const initializeAuth = async () => {
      console.log("Checking session...");
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session from getSession:", session);
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkIssuerStatus(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event, session);
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
      console.log("Checking issuer status for user:", userId);
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_issuer')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      // If profile doesn't exist, create it
      if (!profile) {
        console.log("Profile not found. Inserting new profile...");
        const { data: userData } = await supabase.auth.getUser();
        const currentUser = userData.user;
        
        if (currentUser) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: userId,
                is_issuer: currentUser.user_metadata?.is_issuer || false,
                name: currentUser.user_metadata?.name || currentUser.email,
                wallet_address: currentUser.user_metadata?.wallet_address || ''
              }
            ]);

          if (insertError) {
            throw insertError;
          }

          setIsIssuer(currentUser.user_metadata?.is_issuer || false);
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
    console.log("Rendering AuthProvider with user:", user, "and isIssuer:", isIssuer, "and loading:", loading),
    <AuthContext.Provider value={{ user, isIssuer, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
