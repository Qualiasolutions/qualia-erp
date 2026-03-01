'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  approvePhaseReview,
  requestPhaseChanges,
  type PhaseReviewWithDetails,
} from '@/app/actions/phase-reviews';

interface AdminReviewPanelProps {
  review: PhaseReviewWithDetails;
  onReviewChange?: () => void;
}

export function AdminReviewPanel({ review, onReviewChange }: AdminReviewPanelProps) {
  const [feedback, setFeedback] = useState('');
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle');

  if (review.status !== 'pending') return null;

  const handleApprove = () => {
    startTransition(async () => {
      await approvePhaseReview(review.id, review.project_id);
      onReviewChange?.();
    });
  };

  const handleRequestChanges = () => {
    if (!feedback.trim()) return;
    startTransition(async () => {
      await requestPhaseChanges(review.id, review.project_id, feedback.trim());
      setFeedback('');
      setMode('idle');
      onReviewChange?.();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Review Required</h4>
          <p className="text-xs text-muted-foreground">
            Submitted by {review.submitter?.full_name || 'Team member'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
            onClick={handleApprove}
            disabled={isPending}
          >
            {isPending && mode === 'idle' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600"
            onClick={() => setMode(mode === 'rejecting' ? 'idle' : 'rejecting')}
            disabled={isPending}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Request Changes
          </Button>
        </div>
      </div>

      {mode === 'rejecting' && (
        <div className="space-y-2">
          <Textarea
            placeholder="What needs to change? Be specific..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[80px] resize-none text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMode('idle');
                setFeedback('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRequestChanges}
              disabled={isPending || !feedback.trim()}
            >
              {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Send Feedback
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
