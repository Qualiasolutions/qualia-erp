'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, Clock } from 'lucide-react';
import { useActiveSession, useCurrentWorkspaceId, usePlannedLogoutTime } from '@/lib/swr';
import { useBeforeunloadGuard } from '@/hooks/use-beforeunload-guard';

/**
 * Checks if the current local time is past the planned logout time.
 * planned_logout_time is stored as "HH:MM:SS" or "HH:MM".
 */
function isPastPlannedTime(plannedTime: string): boolean {
  const now = new Date();
  const [hours, minutes] = plannedTime.split(':').map(Number);
  const plannedDate = new Date();
  plannedDate.setHours(hours, minutes, 0, 0);
  return now >= plannedDate;
}

/**
 * Format a TIME string (HH:MM:SS or HH:MM) to a friendly display like "4:00 PM".
 */
function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Amber banner shown when a clocked-in employee has passed their planned logout time.
 * Also activates the beforeunload guard whenever the user has an active session —
 * warning them if they try to close the tab without clocking out.
 *
 * Re-shows on navigation so it cannot be permanently dismissed mid-shift.
 */
export function PlannedLogoutBanner() {
  const pathname = usePathname();
  const { workspaceId } = useCurrentWorkspaceId();
  const { session } = useActiveSession(workspaceId ?? null);
  const { plannedLogoutTime } = usePlannedLogoutTime(workspaceId ?? null);

  const [dismissed, setDismissed] = useState(false);
  const [isPast, setIsPast] = useState(false);

  // Re-show banner on navigation
  useEffect(() => {
    setDismissed(false);
  }, [pathname]);

  // Check every 60s whether planned logout time has passed
  const checkTime = useCallback(() => {
    if (plannedLogoutTime) {
      setIsPast(isPastPlannedTime(plannedLogoutTime));
    } else {
      setIsPast(false);
    }
  }, [plannedLogoutTime]);

  useEffect(() => {
    checkTime();
    const interval = setInterval(checkTime, 60_000);
    return () => clearInterval(interval);
  }, [checkTime]);

  // Warn before closing tab whenever clocked in
  useBeforeunloadGuard(!!session);

  const shouldShow = !dismissed && !!session && !!plannedLogoutTime && isPast;

  if (!shouldShow) return null;

  return (
    <div
      className="relative flex items-center justify-between gap-3 border-b border-amber-400/30 bg-amber-50 px-4 py-2.5 duration-300 ease-out animate-in fade-in-0 slide-in-from-top-2 dark:border-amber-500/20 dark:bg-amber-950/30"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 text-sm">
        <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <span className="font-medium text-amber-800 dark:text-amber-200">
          Your shift ended at {formatTime(plannedLogoutTime!)}.
        </span>
        <span className="text-amber-700 dark:text-amber-300">Don&apos;t forget to clock out!</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/50 dark:hover:text-amber-200"
        aria-label="Dismiss clock-out reminder"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
