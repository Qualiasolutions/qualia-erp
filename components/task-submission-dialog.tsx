'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Send, Loader2, FileText, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { submitTaskResponse } from '@/app/actions/task-attachments';
import { invalidateInboxTasks } from '@/lib/swr';

interface TaskSubmissionDialogProps {
  taskId: string;
  taskTitle: string;
  existingSubmission: string | null;
  submittedAt: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

export function TaskSubmissionDialog({
  taskId,
  taskTitle,
  existingSubmission,
  submittedAt,
  open,
  onOpenChange,
  onSubmitted,
}: TaskSubmissionDialogProps) {
  const [text, setText] = useState(existingSubmission || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      toast.error('Please enter your submission');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitTaskResponse(taskId, text);
      if (result.success) {
        toast.success('Submission saved');
        invalidateInboxTasks(true);
        onSubmitted?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to save submission');
      }
    } finally {
      setSubmitting(false);
    }
  }, [taskId, text, onOpenChange, onSubmitted]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-[520px]">
        {/* Header */}
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-qualia-500/10">
              <FileText className="size-4.5 text-qualia-500" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                Submit Work
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-xs text-muted-foreground">
                {taskTitle}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {submittedAt && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-qualia-500/5 px-3 py-2 text-xs text-qualia-600 dark:text-qualia-400">
              <Clock className="size-3 shrink-0" />
              <span>Last submitted {format(parseISO(submittedAt), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          )}

          <label className="mb-2 block text-sm font-medium text-foreground/80">Your response</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe what you did, share links, notes, or any relevant data..."
            className={cn(
              'min-h-[160px] resize-y border-border bg-background text-sm leading-relaxed',
              'placeholder:text-muted-foreground/50',
              'focus-visible:ring-qualia-500/30'
            )}
            autoFocus
            disabled={submitting}
          />
          <p className="mt-2 text-[11px] text-muted-foreground/60">
            This will be visible to the admin when reviewing your task.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            className="gap-1.5 bg-qualia-600 text-primary-foreground hover:bg-qualia-700"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {existingSubmission ? 'Update Submission' : 'Submit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
