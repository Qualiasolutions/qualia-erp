'use client';

import { useState, useCallback } from 'react';
import { MessageSquarePlus, Trash2, Check, Clock, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIUserContext, invalidateAIUserContext } from '@/lib/swr';
import { setAdminNote, clearAdminNotes } from '@/app/actions/ai-context';

interface AdminNotesPanelProps {
  targetUserId: string;
  targetUserName: string;
}

export function AdminNotesPanel({ targetUserId, targetUserName }: AdminNotesPanelProps) {
  const { context, isLoading } = useAIUserContext(targetUserId);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!note.trim() || submitting) return;

      setSubmitting(true);
      const result = await setAdminNote(targetUserId, note.trim());
      if (result.success) {
        setNote('');
        invalidateAIUserContext(targetUserId);
      }
      setSubmitting(false);
    },
    [note, submitting, targetUserId]
  );

  const handleClearAll = useCallback(async () => {
    const result = await clearAdminNotes(targetUserId);
    if (result.success) {
      invalidateAIUserContext(targetUserId);
    }
  }, [targetUserId]);

  const notes = context?.admin_notes || [];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">AI Notes for {targetUserName}</h3>
        </div>
        {notes.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Leave a note that the AI assistant will deliver to {targetUserName} in their next
        conversation.
      </p>

      {/* Note input */}
      <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Note for ${targetUserName}...`}
          disabled={submitting}
          className={cn(
            'h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-xs',
            'placeholder:text-muted-foreground/60',
            'focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20',
            'disabled:opacity-50'
          )}
        />
        <button
          type="submit"
          disabled={!note.trim() || submitting}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors'
          )}
        >
          <Send className="h-3 w-3" />
          Send
        </button>
      </form>

      {/* Existing notes */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs italic text-muted-foreground/60">No notes yet</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n, i) => (
            <div
              key={i}
              className={cn(
                'rounded-md border px-3 py-2 text-xs',
                n.delivered
                  ? 'border-border/50 bg-muted/30 text-muted-foreground'
                  : 'border-primary/20 bg-primary/5 text-foreground'
              )}
            >
              <p className="mb-1">{n.content}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>From {n.from_name}</span>
                <span>&middot;</span>
                <span>{new Date(n.created_at).toLocaleDateString()}</span>
                <span>&middot;</span>
                {n.delivered ? (
                  <span className="flex items-center gap-0.5 text-green-600">
                    <Check className="h-2.5 w-2.5" />
                    Delivered
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-amber-600">
                    <Clock className="h-2.5 w-2.5" />
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
