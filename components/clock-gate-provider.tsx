'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useActiveSession, useCurrentWorkspaceId } from '@/lib/swr';
import type { WorkSession } from '@/app/actions/work-sessions';

interface ClockGateContextValue {
  /** Whether the user has an active clock-in session */
  isClockedIn: boolean;
  /** True while the session check is loading */
  isLoading: boolean;
  /** True when user is an employee without an active session (should be gated) */
  isGated: boolean;
  /** The active work session, if any */
  session: WorkSession | null;
  /** The workspace ID */
  workspaceId: string | null;
}

const ClockGateContext = createContext<ClockGateContextValue>({
  isClockedIn: false,
  isLoading: true,
  isGated: false,
  session: null,
  workspaceId: null,
});

export function useClockGate() {
  return useContext(ClockGateContext);
}

interface ClockGateProviderProps {
  children: ReactNode;
  userRole: string | null;
}

export function ClockGateProvider({ children, userRole }: ClockGateProviderProps) {
  const { workspaceId } = useCurrentWorkspaceId();
  const isEmployee = userRole === 'employee';
  const { session, isLoading } = useActiveSession(isEmployee && workspaceId ? workspaceId : null);

  const isClockedIn = !!session;
  // Only employees are gated — admins, managers, clients are exempt
  const isGated = isEmployee && !isClockedIn && !isLoading;

  return (
    <ClockGateContext
      value={{
        isClockedIn,
        isLoading,
        isGated,
        session,
        workspaceId: workspaceId ?? null,
      }}
    >
      {children}
    </ClockGateContext>
  );
}
