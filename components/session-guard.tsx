'use client';

import { useState, useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import { useAdminContext } from '@/components/admin-provider';
import {
  useActiveSession,
  useCurrentWorkspaceId,
  invalidateActiveSession,
  invalidateTodaysSessions,
} from '@/lib/swr';
import { useIdleDetection } from '@/hooks/use-idle-detection';
import { IdlePromptDialog } from '@/components/idle-prompt-dialog';
import { ClockOutModal } from '@/components/clock-out-modal';
import { autoClockOut } from '@/app/actions/work-sessions';

// ============ CONSTANTS ============

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const GRACE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const GRACE_PERIOD_SECONDS = 15 * 60; // 15 minutes (for countdown display)

// ============ COMPONENT ============

/**
 * SessionGuard — invisible component that activates idle detection for employees
 * with an active work session.
 *
 * Behaviour:
 * - Only active for non-admin users with an open session
 * - After 30 min idle: shows "Are you still working?" dialog
 * - "Yes, still working" → resets timer, closes dialog
 * - "Clock out now" → opens ClockOutModal for a proper summary
 * - After 15 more min with no response → auto-closes session with inactivity note
 *
 * Renders no visible UI unless idle prompt or clock-out modal is open.
 */
export function SessionGuard() {
  const { isAdmin, loading: adminLoading } = useAdminContext();
  const { workspaceId } = useCurrentWorkspaceId();
  const wsId = workspaceId ?? null;
  const { session } = useActiveSession(wsId);

  // Idle dialog state
  const [idleDialogOpen, setIdleDialogOpen] = useState(false);
  // Clock-out modal state (for manual "Clock out now" from idle dialog)
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);

  const [, startTransition] = useTransition();

  // Idle detection disabled — sessions persist until explicit clock-out.
  // Users are responsible for ending their own sessions.
  const idleEnabled = false;
  void adminLoading;
  void isAdmin;
  void session;
  void workspaceId;

  const handleIdle = useCallback(() => {
    setIdleDialogOpen(true);
  }, []);

  const handleAutoClose = useCallback(() => {
    if (!session || !workspaceId) return;

    setIdleDialogOpen(false);

    startTransition(async () => {
      const result = await autoClockOut(workspaceId, session.id, '[Auto-closed: inactivity]');

      if (result.success) {
        invalidateActiveSession(workspaceId, true);
        invalidateTodaysSessions(workspaceId, true);
        toast.info('Your session was automatically closed due to inactivity.');
      } else {
        console.error('[SessionGuard] autoClockOut failed:', result.error);
        toast.error('Failed to auto-close session. Please clock out manually.');
      }
    });
  }, [session, workspaceId]);

  const { resetIdle } = useIdleDetection({
    enabled: idleEnabled,
    idleTimeout: IDLE_TIMEOUT_MS,
    graceTimeout: GRACE_TIMEOUT_MS,
    onIdle: handleIdle,
    onAutoClose: handleAutoClose,
  });

  const handleStillWorking = useCallback(() => {
    setIdleDialogOpen(false);
    resetIdle();
  }, [resetIdle]);

  const handleClockOutFromDialog = useCallback(() => {
    setIdleDialogOpen(false);
    setClockOutModalOpen(true);
  }, []);

  const handleClockOutSuccess = useCallback(() => {
    setClockOutModalOpen(false);
    resetIdle();
  }, [resetIdle]);

  // Nothing to render if not in active idle state or no session
  if (!idleEnabled || !session || !workspaceId) return null;

  return (
    <>
      <IdlePromptDialog
        open={idleDialogOpen}
        onStillWorking={handleStillWorking}
        onClockOut={handleClockOutFromDialog}
        gracePeriodSeconds={GRACE_PERIOD_SECONDS}
      />

      <ClockOutModal
        open={clockOutModalOpen}
        onOpenChange={setClockOutModalOpen}
        workspaceId={workspaceId}
        session={{
          id: session.id,
          started_at: session.started_at,
          project: session.project ?? null,
        }}
        onSuccess={handleClockOutSuccess}
      />
    </>
  );
}
