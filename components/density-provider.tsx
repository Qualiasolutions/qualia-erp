'use client';

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';
import { updateUIDensity, type UIDensity } from '@/app/actions/ui-preferences';

type DensityContextValue = {
  density: UIDensity;
  setDensity: (density: UIDensity) => void;
};

const DensityContext = createContext<DensityContextValue | null>(null);

const STORAGE_KEY = 'q.density';
const VALID = new Set<UIDensity>(['compact', 'default', 'spacious']);

function readStored(): UIDensity {
  if (typeof window === 'undefined') return 'default';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && VALID.has(raw as UIDensity) ? (raw as UIDensity) : 'default';
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<UIDensity>('default');

  useEffect(() => {
    setDensityState(readStored());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const setDensity = useCallback((next: UIDensity) => {
    if (!VALID.has(next)) return;
    setDensityState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    void updateUIDensity(next).catch((err: unknown) => {
      console.error('[DensityProvider] persist failed', err);
    });
  }, []);

  return <DensityContext value={{ density, setDensity }}>{children}</DensityContext>;
}

export function useDensity(): DensityContextValue {
  const ctx = use(DensityContext);
  if (!ctx) {
    throw new Error('useDensity must be used within <DensityProvider>');
  }
  return ctx;
}
