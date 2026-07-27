import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/index';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) console.error('Error fetching profile:', error);
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  resendEmailOtp: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Separate flag that stays true until the profile DB row has been fetched.
  // Components that need the role (e.g. AdminDashboard) must wait for BOTH
  // `loading` and `profileLoading` to be false before making access decisions.
  const [profileLoading, setProfileLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setProfile(null); setProfileLoading(false); return; }
    setProfileLoading(true);
    const data = await getProfile(session.user.id);
    setProfile(data);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id).then((data) => {
            setProfile(data);
            setProfileLoading(false);
          });
        } else {
          setProfileLoading(false);
        }
      })
      .catch((err) => { toast.error(`Session error: ${err.message}`); setProfileLoading(false); })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfileLoading(true);
        getProfile(session.user.id).then((data) => {
          setProfile(data);
          setProfileLoading(false);
        });
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Verifies the 6-digit code the user received in their Gmail inbox after signup
  const verifyEmailOtp = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Re-sends a fresh signup OTP code to the user's email
  const resendEmailOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Calls the delete-account Edge Function (service-role operation) which:
  // 1. Verifies the caller's JWT
  // 2. Cleans up all user data (trades, offers, KYC, messages, storage files)
  // 3. Calls auth.admin.deleteUser — auth record is gone after this returns
  const deleteAccount = async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });
      if (error) {
        const msg = (await error?.context?.text?.()) ?? error.message;
        return { error: msg };
      }
      // Auth record is now deleted — clear local state
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, signInWithEmail, signUpWithEmail, verifyEmailOtp, resendEmailOtp, signOut, refreshProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
