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
  signIn: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoUser: (profileId: string) => void;
  availableDemoUsers: UserProfile[];
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_ACTIVE_USER_ID = 'stroycrm_active_demo_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseMode, setIsSupabaseMode] = useState<boolean>(false);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(INITIAL_PROFILES);

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
      }

      // Local / Demo mode fallback
      const profiles = await dataService.getProfiles();
      setAllProfiles(profiles);

      const savedUserId = localStorage.getItem(STORAGE_ACTIVE_USER_ID);
      const foundUser = profiles.find((p) => p.id === savedUserId) || profiles[0];
      setUser(foundUser || null);
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
      setAllProfiles(profiles);
      if (user) {
        const updated = profiles.find((p) => p.id === user.id);
        if (updated) setUser(updated);
      }
    }
  };

  const signIn = async (email: string, password?: string) => {
    setIsLoading(true);
    const supabase = getSupabaseClient();

    if (isSupabaseMode && supabase && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setIsLoading(false);
        throw new Error(error.message);
      }

      if (data.user) {
        const { data: profile, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profError || !profile) {
          // If profile trigger is still propagating, construct fallback profile
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
      setIsLoading(false);
      return;
    }

    // Local / Demo mode sign in
    const profiles = await dataService.getProfiles();
    const matched = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
    if (matched) {
      setUser(matched);
      localStorage.setItem(STORAGE_ACTIVE_USER_ID, matched.id);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      throw new Error(`Пользователь с email "${email}" не найден в системе`);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (isSupabaseMode && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(STORAGE_ACTIVE_USER_ID);
  };

  const switchDemoUser = (profileId: string) => {
    const found = allProfiles.find((p) => p.id === profileId);
    if (found) {
      setUser(found);
      localStorage.setItem(STORAGE_ACTIVE_USER_ID, found.id);
    }
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
        switchDemoUser,
        availableDemoUsers: allProfiles,
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
