'use client';

import type { SWRConfiguration } from 'swr';

// ============================================================================
// POLLING INTERVALS
// ============================================================================
export const REFRESH_INTERVAL_DEFAULT = 60_000; // 60s — standard data (tasks, meetings)
export const REFRESH_INTERVAL_SLOW = 90_000; // 90s — semi-static data (profiles, teams)
export const REFRESH_INTERVAL_FAST = 2_000; // 2s — provisioning status during setup
export const REFRESH_INTERVAL_SESSIONS = 30_000; // 30s — work sessions, messaging
export const DEDUP_INTERVAL_DEFAULT = 60_000; // 60s — standard dedup
export const DEDUP_INTERVAL_SLOW = 45_000; // 45s — semi-static data dedup

// Check if document is visible (for tab visibility)
export const isDocumentVisible = () => {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
};

// Exponential backoff for error retries (reduces API hammering on failures)
export const onErrorRetry = (
  error: Error,
  _key: string,
  _config: SWRConfiguration,
  revalidate: (opts?: { retryCount?: number }) => void,
  { retryCount }: { retryCount: number }
) => {
  // Don't retry on 4xx errors
  const status = (error as Error & { status?: number }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) return;

  // Only retry up to 3 times
  if (retryCount >= 3) return;

  // Exponential backoff: 1s, 2s, 4s
  const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
  setTimeout(() => revalidate({ retryCount }), delay);
};

// Default SWR configuration optimized for performance
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch on window focus (server actions handle this)
  revalidateOnReconnect: true, // Refetch when network reconnects
  dedupingInterval: DEDUP_INTERVAL_DEFAULT, // Dedupe requests within 60 seconds (increased from 30s for less API calls)
  errorRetryCount: 3, // Retry failed requests 3 times
  shouldRetryOnError: true,
  keepPreviousData: true, // Show stale data while revalidating for better UX
  focusThrottleInterval: 5000, // Throttle focus revalidation to max once per 5s
};

// SWR config with auto-refresh for real-time task updates
// Stops refreshing when tab is hidden to save resources
// Optimized: 60s refresh (was 45s) to reduce API calls further
export const autoRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_DEFAULT : 0), // 60s refresh when visible, stop when hidden
  dedupingInterval: DEDUP_INTERVAL_DEFAULT, // 60s dedup
  onErrorRetry, // Use exponential backoff
};

// Less frequent refresh for semi-static data (projects, teams, profiles)
export const slowRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_SLOW : 0), // 90s refresh for less critical data
  dedupingInterval: DEDUP_INTERVAL_SLOW, // 45s dedup
  onErrorRetry,
};

// Fast polling config for provisioning status (2s refresh)
export const provisioningRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: true,
  refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_FAST : 0), // 2s refresh when visible
  dedupingInterval: 1000, // 1s dedup
  onErrorRetry,
};
