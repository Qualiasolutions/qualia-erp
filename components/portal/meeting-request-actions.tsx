'use client';

import { useState, useTransition } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { confirmMeeting, declineMeeting } from '@/app/actions/meetings';
import { invalidateMeetings } from '@/lib/swr/meetings';

interface MeetingRequestActionsProps {
  meetingId: string;
  meetingTitle: string;
  /** When true, render full-width pill buttons (mobile / popover); otherwise compact icon buttons inline. */
  layout?: 'inline' | 'stacked';
  /** Optional callback fired after a successful confirm or decline so the parent can close popovers. */
  onResolved?: () => void;
  className?: string;
}

/**
 * Confirm + Decline action pair for a `status='requested'` meeting.
 *
 * Confirm is a one-tap action with optimistic toast feedback.
 * Decline opens an AlertDialog with an optional reason textarea — the
 * reason is appended to the meeting description so the trail is
 * preserved for both admin and client.
 *
 * Touch targets meet the 44px guideline in both layouts.
 */
export function MeetingRequestActions({
  meetingId,
  meetingTitle,
  layout = 'inline',
  onResolved,
  className,
}: MeetingRequestActionsProps) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    startTransition(async () => {
      const result = await confirmMeeting(meetingId);
      if (result.success) {
        invalidateMeetings(true);
        toast.success('Meeting confirmed', {
          description: meetingTitle,
        });
        onResolved?.();
      } else {
        toast.error(result.error || 'Failed to confirm meeting');
      }
    });
  };

  const handleDeclineSubmit = () => {
    startTransition(async () => {
      const result = await declineMeeting(meetingId, reason);
      if (result.success) {
        invalidateMeetings(true);
        toast.success('Meeting declined', {
          description: meetingTitle,
        });
        setDeclineOpen(false);
        setReason('');
        onResolved?.();
      } else {
        toast.error(result.error || 'Failed to decline meeting');
      }
    });
  };

  const openDecline = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDeclineOpen(true);
  };

  const stacked = layout === 'stacked';

  return (
    <>
      <div
        className={cn(
          'flex items-center',
          stacked ? 'w-full flex-col gap-2 sm:flex-row' : 'gap-1.5',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={handleConfirm}
          disabled={isPending}
          className={cn(
            'min-h-[44px] gap-1.5 rounded-lg font-semibold',
            stacked ? 'h-11 w-full sm:w-auto sm:flex-1' : 'h-9 px-2.5 sm:h-8 sm:px-3'
          )}
          aria-label={`Confirm meeting request: ${meetingTitle}`}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className={stacked ? 'inline' : 'hidden sm:inline'}>Confirm</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openDecline}
          disabled={isPending}
          className={cn(
            'min-h-[44px] gap-1.5 rounded-lg border-border font-semibold text-muted-foreground hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400',
            stacked ? 'h-11 w-full sm:w-auto sm:flex-1' : 'h-9 px-2.5 sm:h-8 sm:px-3'
          )}
          aria-label={`Decline meeting request: ${meetingTitle}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          <span className={stacked ? 'inline' : 'hidden sm:inline'}>Decline</span>
        </Button>
      </div>

      <AlertDialog
        open={declineOpen}
        onOpenChange={(open) => {
          if (!open) setReason('');
          setDeclineOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this meeting request?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{meetingTitle}</span> will be marked as
              declined and disappear from the active schedule. The client will see the status change
              on their portal.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label
              htmlFor="decline-reason"
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Reason (optional)
            </Label>
            <Textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly tell the client why — proposing a new time, conflict, etc."
              rows={3}
              maxLength={500}
              className="resize-none text-sm"
            />
            <p className="text-right font-mono text-[10px] text-muted-foreground/70">
              {reason.length}/500
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeclineSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                  Declining…
                </>
              ) : (
                'Decline meeting'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
