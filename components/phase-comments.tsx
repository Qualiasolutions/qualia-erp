'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Trash2, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  createPhaseComment,
  getPhaseComments,
  deletePhaseComment,
} from '@/app/actions/phase-comments';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Comment {
  id: string;
  comment_text: string;
  is_internal: boolean | null;
  created_at: string | null;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

interface PhaseCommentsProps {
  projectId: string;
  phaseName: string;
  isAdmin: boolean;
}

export function PhaseComments({ projectId, phaseName, isAdmin }: PhaseCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    const result = await getPhaseComments(projectId, phaseName, isAdmin);
    if (result.success) {
      setComments(result.data as Comment[]);
    }
    return result;
  }, [projectId, phaseName, isAdmin]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadComments().then(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadComments]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const result = await createPhaseComment({
        projectId,
        phaseName,
        commentText: trimmed,
        isInternal,
      });

      if (result.success) {
        setText('');
        await loadComments();
      } else {
        toast.error(result.error || 'Failed to save comment');
      }
    } catch {
      toast.error('Failed to save comment');
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      const result = await deletePhaseComment(commentId, projectId);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete comment');
        await loadComments();
      }
    } catch {
      toast.error('Failed to delete comment');
      await loadComments();
    }
  }

  return (
    <div className="border-t border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-2.5">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Comments{comments.length > 0 && ` (${comments.length})`}
        </span>
      </div>

      {/* Comment list */}
      <div ref={scrollRef} className="max-h-64 overflow-y-auto px-5">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-2.5">
                <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground/50">No comments yet</p>
        ) : (
          <div className="space-y-3 py-2">
            {comments.map((comment) => {
              const initials =
                comment.profile?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || '?';

              return (
                <div key={comment.id} className="group flex gap-2.5">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={comment.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px] font-medium">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {comment.profile?.full_name || 'Unknown'}
                      </span>
                      {comment.is_internal && (
                        <span className="flex items-center gap-0.5 rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                          <Lock className="h-2 w-2" />
                          Internal
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/50">
                        {comment.created_at
                          ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
                          : ''}
                      </span>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={isSending}
                        className="ml-auto hidden h-5 w-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-500 group-hover:flex"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                      {comment.comment_text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comment input */}
      <div className="border-t border-border/50 px-5 py-3">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Write a comment... (Enter to send)"
              rows={1}
              disabled={isSending}
              className="w-full resize-none rounded-lg border border-border bg-muted/10 px-3 py-2 text-xs placeholder:text-muted-foreground/40 focus:border-qualia-500 focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
            {isAdmin && (
              <label className="mt-1.5 flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="h-3 w-3 rounded border-border text-qualia-500 focus:ring-qualia-500"
                />
                <span className="text-[10px] text-muted-foreground">Internal only</span>
              </label>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSending || !text.trim()}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
              text.trim() && !isSending
                ? 'bg-qualia-500 text-white hover:bg-qualia-600'
                : 'bg-muted text-muted-foreground/30'
            )}
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
