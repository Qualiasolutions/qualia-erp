'use client';

import { useState } from 'react';
import { Check, RotateCcw, Send, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { REVIEW_STATUS_COLORS } from '@/lib/color-constants';
import { submitForReview, approveTask, requestRevision } from '@/app/actions/learning';
import type { ReviewStatus } from '@/types/database';

interface TaskReviewFlowProps {
  issueId: string;
  requiresReview: boolean;
  reviewStatus: ReviewStatus | null;
  reviewNotes?: string | null;
  isAssignee: boolean;
  isMentor: boolean;
  onUpdate?: () => void;
}

export function TaskReviewFlow({
  issueId,
  requiresReview,
  reviewStatus,
  reviewNotes,
  isAssignee,
  isMentor,
  onUpdate,
}: TaskReviewFlowProps) {
  const [loading, setLoading] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  const handleSubmitForReview = async () => {
    setLoading(true);
    await submitForReview(issueId);
    setLoading(false);
    onUpdate?.();
  };

  const handleApprove = async () => {
    setLoading(true);
    await approveTask(issueId);
    setLoading(false);
    onUpdate?.();
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) return;
    setLoading(true);
    await requestRevision(issueId, revisionNotes);
    setLoading(false);
    setShowRevisionDialog(false);
    setRevisionNotes('');
    onUpdate?.();
  };

  // Show review status badge
  if (reviewStatus && reviewStatus !== 'pending') {
    const config = REVIEW_STATUS_COLORS[reviewStatus];
    return (
      <div className="space-y-2">
        <Badge className={cn(config.bg, config.text, config.border, 'border')}>
          {reviewStatus === 'approved' && <Check className="mr-1 h-3 w-3" />}
          {reviewStatus === 'needs_revision' && <RotateCcw className="mr-1 h-3 w-3" />}
          {config.label}
        </Badge>
        {reviewNotes && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>Review feedback:</span>
            </div>
            <p>{reviewNotes}</p>
          </div>
        )}
      </div>
    );
  }

  // Trainee: Submit for review button
  if (isAssignee && !requiresReview) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleSubmitForReview}
        disabled={loading}
        className="gap-2"
      >
        <Send className="h-4 w-4" />
        {loading ? 'Submitting...' : 'Submit for Review'}
      </Button>
    );
  }

  // Trainee: Pending review status
  if (isAssignee && reviewStatus === 'pending') {
    return (
      <Badge className={cn(REVIEW_STATUS_COLORS.pending.bg, REVIEW_STATUS_COLORS.pending.text)}>
        <Clock className="mr-1 h-3 w-3" />
        Awaiting Mentor Review
      </Badge>
    );
  }

  // Mentor: Approve or request revision
  if (isMentor && reviewStatus === 'pending') {
    return (
      <>
        <div className="flex items-center gap-2">
          <Badge className={cn(REVIEW_STATUS_COLORS.pending.bg, REVIEW_STATUS_COLORS.pending.text)}>
            <Clock className="mr-1 h-3 w-3" />
            Needs Your Review
          </Badge>
          <Button
            variant="default"
            size="sm"
            onClick={handleApprove}
            disabled={loading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRevisionDialog(true)}
            disabled={loading}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Request Changes
          </Button>
        </div>

        <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle>Request Revision</DialogTitle>
              <DialogDescription>Provide feedback on what needs to be changed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="What needs to be improved? Be specific and constructive..."
                className="min-h-[120px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowRevisionDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestRevision}
                  disabled={loading || !revisionNotes.trim()}
                  className="bg-orange-600 hover:bg-orange-500"
                >
                  {loading ? 'Sending...' : 'Send Feedback'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}
