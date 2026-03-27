'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// ============ TYPES ============

interface UseIdleDetectionOptions {
  /** Whether idle detection is active. When false, all timers/listeners are cleared. */
  enabled: boolean;
  /** Time in ms of inactivity before onIdle is called. Default: 30 minutes. */
  idleTimeout?: number;
  /** Time in ms after onIdle before onAutoClose is called. Default: 15 minutes. */
  graceTimeout?: number;
  /** Called when the user has been idle for idleTimeout ms. */
  onIdle: () => void;
  /** Called when grace period expires with no activity (auto-close trigger). */
  onAutoClose: () => void;
}

interface UseIdleDetectionReturn {
  /** True once idleTimeout has elapsed with no activity. */
  isIdle: boolean;
  /** True once onIdle has fired and grace period is running. */
  isGracePeriod: boolean;
  /** Manually reset the idle timer (e.g. user clicked "Still working"). */
  resetIdle: () => void;
}

// ============ CONSTANTS ============

const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DEFAULT_GRACE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const THROTTLE_INTERVAL = 5_000; // Only reset timer if >5s since last reset

// ============ HOOK ============

/**
 * useIdleDetection — tracks user activity via mouse, keyboard, scroll, touch, click.
 *
 * State machine:
 *   active → (no activity for idleTimeout ms) → idle → onIdle() called
 *   idle → (no activity for graceTimeout ms) → onAutoClose() called
 *   idle → (any activity) → active (resets both timers)
 *
 * When enabled=false, all timers and listeners are cleaned up immediately.
 */
export function useIdleDetection({
  enabled,
  idleTimeout = DEFAULT_IDLE_TIMEOUT,
  graceTimeout = DEFAULT_GRACE_TIMEOUT,
  onIdle,
  onAutoClose,
}: UseIdleDetectionOptions): UseIdleDetectionReturn {
  const [isIdle, setIsIdle] = useState(false);
  const [isGracePeriod, setIsGracePeriod] = useState(false);

  // Stable refs so timers/handlers don't close over stale values
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isIdleRef = useRef(false);
  const onIdleRef = useRef(onIdle);
  const onAutoCloseRef = useRef(onAutoClose);

  // Keep callback refs current without causing re-runs
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    onAutoCloseRef.current = onAutoClose;
  }, [onAutoClose]);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }, []);

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      // User has been idle for idleTimeout ms
      isIdleRef.current = true;
      setIsIdle(true);
      setIsGracePeriod(true);
      onIdleRef.current();

      // Start grace period timer
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      graceTimerRef.current = setTimeout(() => {
        // Grace period expired — auto-close
        onAutoCloseRef.current();
      }, graceTimeout);
    }, idleTimeout);
  }, [idleTimeout, graceTimeout]);

  const resetIdle = useCallback(() => {
    isIdleRef.current = false;
    setIsIdle(false);
    setIsGracePeriod(false);
    clearAllTimers();
    startIdleTimer();
  }, [clearAllTimers, startIdleTimer]);

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      isIdleRef.current = false;
      setIsIdle(false);
      setIsGracePeriod(false);
      return;
    }

    // Start the idle timer on enable
    lastActivityRef.current = Date.now();
    startIdleTimer();

    // Throttled activity handler — only resets timer if >THROTTLE_INTERVAL since last reset
    function handleActivity() {
      const now = Date.now();
      if (now - lastActivityRef.current < THROTTLE_INTERVAL) return;
      lastActivityRef.current = now;

      // If we're already in grace period or idle, a new activity resets everything
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
        setIsGracePeriod(false);
      }

      clearAllTimers();
      startIdleTimer();
    }

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

    for (const event of events) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearAllTimers();
      for (const event of events) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, clearAllTimers, startIdleTimer]);

  return { isIdle, isGracePeriod, resetIdle };
}
