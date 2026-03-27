'use client';

import { useEffect, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ============ TYPES ============

interface IdlePromptDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when user confirms they're still working */
  onStillWorking: () => void;
  /** Called when user opts to clock out manually */
  onClockOut: () => void;
  /** Remaining grace period in seconds for the countdown */
  gracePeriodSeconds: number;
}

// ============ HELPERS ============

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ============ COMPONENT ============

/**
 * IdlePromptDialog — shown after 30 minutes of inactivity while clocked in.
 *
 * Not dismissible via outside click or Escape — requires explicit action.
 * Shows a live countdown until auto-close fires.
 */
export function IdlePromptDialog({
  open,
  onStillWorking,
  onClockOut,
  gracePeriodSeconds,
}: IdlePromptDialogProps) {
  const [remaining, setRemaining] = useState(gracePeriodSeconds);

  // Reset and start countdown whenever dialog opens
  useEffect(() => {
    if (!open) {
      setRemaining(gracePeriodSeconds);
      return;
    }

    setRemaining(gracePeriodSeconds);

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);

    return () => clearInterval(interval);
  }, [open, gracePeriodSeconds]);

  const isAlmostDone = remaining <= 60;

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        /* intentionally blocked — user must click a button */
      }}
    >
      <DialogContent
        className="max-w-sm"
        // Block Escape key dismissal
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Block outside click dismissal
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold">Are you still working?</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            You&apos;ve been idle for a while. Your session will auto-close in{' '}
            <span
              className={
                isAlmostDone
                  ? 'font-semibold text-destructive transition-colors duration-300'
                  : 'font-semibold text-foreground transition-colors duration-300'
              }
            >
              {formatCountdown(remaining)}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClockOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Clock out now
          </Button>
          <Button className="w-full sm:w-auto" onClick={onStillWorking}>
            Yes, still working
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
