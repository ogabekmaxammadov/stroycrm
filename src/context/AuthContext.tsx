import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';
import { dataService } from '../services/dataService';
import { INITIAL_PROFILES } from '../lib/mockData';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isDirector: boolean;
  isExecutor: boolean;
  isLoading: boolean;
  isSupabaseMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_LOGIN_EMAIL = 'ogabek@gmail.com';
const LOCAL_LOGIN_PASSWORD = 'stroy1234';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseMode, setIsSupabaseMode] = useState<boolean>(false);

  // Initialize auth
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      const { isConfigured } = getSupabaseConfig();
      setIsSupabaseMode(isConfigured);

      const supabase = getSupabaseClient();
      if (isConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setUser(profile as UserProfile);
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Supabase auth session error:', err);
        }

        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(null);
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const refreshUserProfile = async () => {
    const supabase = getSupabaseClient();
    if (isSupabaseMode && supabase && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) setUser(profile as UserProfile);
    } else {
      const profiles = await dataService.getProfiles();
      if (user) {
        const updated = profiles.find((p) => p.id === user.id);
        if (updated) setUser(updated);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      if (isSupabaseMode) {
        if (!supabase) {
          throw new Error('Не удалось подключиться к Supabase. Проверьте настройки базы данных.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw new Error(error.message);

        if (data.user) {
          const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profError || !profile) {
            const fallbackProfile: UserProfile = {
              id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || email.split('@')[0],
              role: (data.user.user_metadata?.role as UserRole) || 'executor',
            };
            setUser(fallbackProfile);
          } else {
            setUser(profile as UserProfile);
          }
        }
        return;
      }

      if (
        email.trim().toLowerCase() !== LOCAL_LOGIN_EMAIL ||
        password !== LOCAL_LOGIN_PASSWORD
      ) {
        throw new Error('Неверный email или пароль');
      }

      const profiles = await dataService.getProfiles();
      const director = profiles.find((profile) => profile.role === 'director')
        || INITIAL_PROFILES.find((profile) => profile.role === 'director');

      if (!director) {
        throw new Error('Не удалось загрузить профиль пользователя');
      }

      setUser({ ...director, email: LOCAL_LOGIN_EMAIL, full_name: 'Огабек' });
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (isSupabaseMode && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const role = user ? user.role : null;
  const isDirector = role === 'director';
  const isExecutor = role === 'executor';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isDirector,
        isExecutor,
        isLoading,
        isSupabaseMode,
        signIn,
        signOut,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
