'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitPhaseForReview, type PhaseReviewWithDetails } from '@/app/actions/phase-reviews';

interface PhaseReviewButtonProps {
  projectId: string;
  phaseId: string;
  phaseName: string;
  review: PhaseReviewWithDetails | null;
  allTasksDone: boolean;
  onReviewChange?: () => void;
}

export function PhaseReviewButton({
  projectId,
  phaseId,
  phaseName,
  review,
  allTasksDone,
  onReviewChange,
}: PhaseReviewButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitPhaseForReview(projectId, phaseId, phaseName);
      if (!result.success) {
        setError(result.error || 'Failed to submit');
      }
      onReviewChange?.();
    });
  };

  // Not ready to submit — tasks incomplete
  if (!allTasksDone && !review) {
    return null;
  }

  // Already approved
  if (review?.status === 'approved') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Approved</span>
        {review.reviewer && (
          <span className="text-xs text-muted-foreground">
            by {review.reviewer.full_name || 'Admin'}
          </span>
        )}
      </div>
    );
  }

  // Pending review
  if (review?.status === 'pending') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
        <Clock className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Pending Review
        </span>
      </div>
    );
  }

  // Changes requested — show feedback + resubmit
  if (review?.status === 'changes_requested') {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Changes Requested
            </span>
          </div>
          {review.feedback && (
            <p className="mt-2 text-sm text-muted-foreground">{review.feedback}</p>
          )}
        </div>
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={handleSubmit}
          disabled={isPending || !allTasksDone}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Resubmit for Review
        </Button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // Ready to submit
  return (
    <div className="space-y-1">
      <Button size="sm" className={cn('w-full gap-2')} onClick={handleSubmit} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit for Review
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
