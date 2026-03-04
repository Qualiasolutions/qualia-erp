'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, AlertCircle, Loader2, Inbox, ExternalLink } from 'lucide-react';
import {
  approvePhaseReview,
  requestPhaseChanges,
  getPendingReviews,
  type PhaseReviewWithDetails,
} from '@/app/actions/phase-reviews';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ReviewsQueueProps {
  initialReviews: PhaseReviewWithDetails[];
}

export function ReviewsQueue({ initialReviews }: ReviewsQueueProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const updated = await getPendingReviews();
    setReviews(updated);
  };

  const handleApprove = (reviewId: string, projectId: string) => {
    if (pendingActions.has(reviewId)) return;
    setPendingActions((prev) => new Set(prev).add(reviewId));
    startTransition(async () => {
      await approvePhaseReview(reviewId, projectId);
      await refresh();
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    });
  };

  const handleRequestChanges = (reviewId: string, projectId: string) => {
    const feedback = feedbackMap[reviewId];
    if (!feedback?.trim() || pendingActions.has(reviewId)) return;
    setPendingActions((prev) => new Set(prev).add(reviewId));
    startTransition(async () => {
      await requestPhaseChanges(reviewId, projectId, feedback.trim());
      setFeedbackMap((prev) => ({ ...prev, [reviewId]: '' }));
      setRejectingId(null);
      await refresh();
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    });
  };

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <h3 className="text-lg font-medium">No pending reviews</h3>
        <p className="text-sm text-muted-foreground">
          All phases have been reviewed. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {reviews.length} phase{reviews.length !== 1 ? 's' : ''} waiting for review
      </p>

      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {review.phase_name}
                </span>
                {review.project && (
                  <Link
                    href={`/projects/${review.project_id}`}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {review.project.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                {review.submitter && (
                  <>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={review.submitter.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {review.submitter.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {review.submitter.full_name || 'Team member'} submitted{' '}
                      {review.submitted_at
                        ? formatDistanceToNow(new Date(review.submitted_at), { addSuffix: true })
                        : ''}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
                onClick={() => handleApprove(review.id, review.project_id)}
                disabled={pendingActions.has(review.id)}
              >
                {pendingActions.has(review.id) && rejectingId !== review.id ? (
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
                onClick={() => setRejectingId(rejectingId === review.id ? null : review.id)}
                disabled={pendingActions.has(review.id)}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Request Changes
              </Button>
            </div>
          </div>

          {rejectingId === review.id && (
            <div className="mt-4 space-y-2 border-t pt-4">
              <Textarea
                placeholder="What needs to change? Be specific..."
                value={feedbackMap[review.id] || ''}
                onChange={(e) =>
                  setFeedbackMap((prev) => ({ ...prev, [review.id]: e.target.value }))
                }
                className="min-h-[80px] resize-none text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRejectingId(null);
                    setFeedbackMap((prev) => ({ ...prev, [review.id]: '' }));
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRequestChanges(review.id, review.project_id)}
                  disabled={pendingActions.has(review.id) || !feedbackMap[review.id]?.trim()}
                >
                  {pendingActions.has(review.id) ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Send Feedback
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
