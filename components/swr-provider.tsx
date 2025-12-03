'use client';

import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr';

interface SWRProviderProps {
  children: React.ReactNode;
}

/**
 * SWR Provider with default configuration
 * Wrap your app with this to enable client-side caching
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
