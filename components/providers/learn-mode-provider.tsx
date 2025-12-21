'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getExtendedProfile, updateLearnMode } from '@/app/actions/learning';
import type { ExtendedProfile } from '@/types/database';

interface LearnModeContextType {
  isTrainee: boolean;
  learnModeEnabled: boolean;
  mentorId: string | null;
  profile: ExtendedProfile | null;
  loading: boolean;
  toggleLearnMode: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const LearnModeContext = createContext<LearnModeContextType | undefined>(undefined);

interface LearnModeProviderProps {
  children: ReactNode;
}

export function LearnModeProvider({ children }: LearnModeProviderProps) {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const result = await getExtendedProfile();
    if (result.success && result.data) {
      setProfile(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const toggleLearnMode = useCallback(async () => {
    if (!profile) return;
    const newValue = !profile.learn_mode;
    await updateLearnMode(newValue);
    setProfile((prev) => (prev ? { ...prev, learn_mode: newValue } : null));
  }, [profile]);

  const value: LearnModeContextType = {
    isTrainee: profile?.is_trainee ?? false,
    learnModeEnabled: profile?.learn_mode ?? false,
    mentorId: profile?.mentor_id ?? null,
    profile,
    loading,
    toggleLearnMode,
    refreshProfile,
  };

  return <LearnModeContext.Provider value={value}>{children}</LearnModeContext.Provider>;
}

export function useLearnMode() {
  const context = useContext(LearnModeContext);
  if (context === undefined) {
    throw new Error('useLearnMode must be used within a LearnModeProvider');
  }
  return context;
}
