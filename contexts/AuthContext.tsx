import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { getSupabaseAuthRedirectUrl, getSupabaseClient } from '@/lib/supabase';
import { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  authError: string | null;
  profileError: string | null;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    phone: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { data, error } = await getSupabaseClient()
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      setProfile(data);
    } catch (error) {
      setProfile(null);
      setProfileError(error instanceof Error ? error.message : String(error));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const auth = getSupabaseClient().auth;
    const handleAuthUrl = async (url: string) => {
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code;
      const accessToken = parsed.queryParams?.access_token;
      const refreshToken = parsed.queryParams?.refresh_token;

      if (typeof code === 'string') {
        const { error } = await auth.exchangeCodeForSession(code);
        if (error) throw new Error(error.message);
      } else if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
        const { error } = await auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw new Error(error.message);
      }
    };

    const linkingSubscription = Platform.OS === 'web'
      ? null
      : Linking.addEventListener('url', ({ url }) => {
          if (!active) return;
          void handleAuthUrl(url).catch((error: unknown) => {
            setAuthError(error instanceof Error ? error.message : String(error));
          });
        });

    const restoreAuthLink = async () => {
      if (Platform.OS !== 'web') {
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) await handleAuthUrl(initialUrl);
        } catch (error) {
          if (active) {
            setAuthError(error instanceof Error ? error.message : String(error));
          }
        }
      }
    };

    const { data: authListener } = auth.onAuthStateChange((event, newSession) => {
      if (!active) return;
      setAuthError(null);
      setPasswordRecovery(event === 'PASSWORD_RECOVERY');
      setSession(newSession);
      setLoading(false);
      if (newSession?.user) {
        void fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setProfileError(null);
      }
    });

    void restoreAuthLink();

    return () => {
      active = false;
      linkingSubscription?.remove();
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getSupabaseClient().auth;
    const { error } = await auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data, error: sessionError } = await auth.getSession();
    if (sessionError) return { error: sessionError.message };
    if (!data.session || data.session.user.email?.toLowerCase() !== email.toLowerCase()) {
      return { error: 'Sign in did not establish a valid session. Please try again.' };
    }

    setSession(data.session);
    setLoading(false);
    return { error: null };
  }, []);

  const signUp = useCallback(
    async (params: {
      email: string;
      password: string;
      fullName: string;
      username: string;
      phone: string;
    }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          emailRedirectTo: getSupabaseAuthRedirectUrl(),
          data: {
            full_name: params.fullName,
            username: params.username,
            phone: params.phone,
          },
        },
      });

      if (error) return { error: error.message };
      if (!data.user) return { error: 'Supabase did not return a user after registration.' };
      if (!data.session) {
        if (data.user.identities?.length === 0) {
          return { error: 'An account with this email already exists. Please log in.' };
        }
        return {
          error:
            'Registration did not create a session. In Supabase, disable email confirmations under Authentication → Sign In / Providers → Email, then try again.',
        };
      }

      const userId = data.user.id;
      const { data: existingProfile, error: profileLookupError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileLookupError) return { error: profileLookupError.message };

      let userProfile = existingProfile;
      if (!userProfile) {
        const { data: createdProfile, error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            full_name: params.fullName,
            username: params.username,
            email: params.email,
            phone: params.phone,
          })
          .select('*')
          .single();

        if (profileCreateError) return { error: profileCreateError.message };
        userProfile = createdProfile;
      } else if (
        userProfile.full_name !== params.fullName ||
        userProfile.username !== params.username ||
        userProfile.phone !== params.phone
      ) {
        const { data: updatedProfile, error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            full_name: params.fullName,
            username: params.username,
            phone: params.phone,
          })
          .eq('user_id', userId)
          .select('*')
          .single();

        if (profileUpdateError) return { error: profileUpdateError.message };
        userProfile = updatedProfile;
      }

      const { data: activeSession, error: activeSessionError } = await supabase.auth.getSession();
      if (activeSessionError) return { error: activeSessionError.message };
      if (!activeSession.session || activeSession.session.user.id !== userId) {
        return { error: 'Registration did not establish a valid session. Please try again.' };
      }

      setSession(activeSession.session);
      setProfile(userProfile);
      setLoading(false);
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw new Error(error.message);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!session?.user) return { error: 'Not authenticated' };
      const { error } = await getSupabaseClient()
        .from('profiles')
        .update({
          full_name: updates.full_name,
          phone: updates.phone,
        })
        .eq('user_id', session.user.id);
      if (error) return { error: error.message };
      await fetchProfile(session.user.id);
      return { error: null };
    },
    [session, fetchProfile]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        profileLoading,
        authError,
        profileError,
        passwordRecovery,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
