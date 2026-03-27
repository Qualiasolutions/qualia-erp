'use client';

import { useEffect } from 'react';

/**
 * Adds a beforeunload listener when `enabled` is true.
 * Shows the browser's native "Leave site?" dialog if the user
 * tries to navigate away or close the tab.
 *
 * Used to warn employees who are still clocked in that they may
 * forget to clock out before leaving.
 */
export function useBeforeunloadGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the returnValue string but require it to be set
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);
}
