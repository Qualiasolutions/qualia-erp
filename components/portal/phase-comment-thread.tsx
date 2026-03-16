'use client';

import { useState, useOptimistic } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPhaseComment, deletePhaseComment } from '@/app/actions/phase-comments';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useServerAction } from '@/lib/hooks/use-server-action';

interface CommentWithProfile {
  id: string;
  project_id: string;
  phase_name: string;
  task_key: string | null;
  commented_by: string;
  comment_text: string;
  is_internal: boolean | null;
  created_at: string | null;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

interface PhaseCommentThreadProps {
  projectId: string;
  phaseName: string;
  initialComments: CommentWithProfile[];
  userRole: 'client' | 'admin' | 'manager' | 'employee';
  currentUserId: string;
}

export function PhaseCommentThread({
  projectId,
  phaseName,
  initialComments,
  userRole,
  currentUserId,
}: PhaseCommentThreadProps) {
  const [comments, setComments] = useState(initialComments);
  const [optimisticComments, addOptimisticComment] = useOptimistic<
    CommentWithProfile[],
    CommentWithProfile
  >(comments, (state, newComment) => [...state, newComment]);

  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'manager';
  const isEmployee = userRole === 'employee';
  const canCreateInternal = isAdmin || isEmployee;

  const {
    execute: submitComment,
    isPending,
    error,
  } = useServerAction<CommentWithProfile, Parameters<typeof createPhaseComment>>(
    createPhaseComment,
    {
      onSuccess: (data?: CommentWithProfile) => {
        // Replace temp optimistic comment with real data
        if (data) {
          setComments((prev) => [...prev.filter((c) => !c.id.startsWith('temp-')), data]);
        }
      },
      onError: () => {
        // Rollback: Remove optimistic comments from base state
        setComments((prev) => prev.filter((c) => !c.id.startsWith('temp-')));
      },
    }
  );

  const { execute: deleteComment, isPending: isDeleting } = useServerAction(deletePhaseComment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim()) {
      return;
    }

    if (commentText.length > 2000) {
      return;
    }

    // Optimistic UI update
    const optimisticComment: CommentWithProfile = {
      id: `temp-${Date.now()}`,
      project_id: projectId,
      phase_name: phaseName,
      task_key: null,
      commented_by: currentUserId,
      comment_text: commentText.trim(),
      is_internal: canCreateInternal ? isInternal : false,
      created_at: new Date().toISOString(),
      profile: {
        id: currentUserId,
        full_name: 'You',
        avatar_url: null,
        email: null,
      },
    };

    const savedText = commentText.trim();
    const savedInternal = canCreateInternal ? isInternal : false;

    addOptimisticComment(optimisticComment);
    setCommentText('');
    setIsInternal(false);

    await submitComment({
      projectId,
      phaseName,
      commentText: savedText,
      isInternal: savedInternal,
    });
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    // Optimistically remove from state
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    await deleteComment(commentId, projectId);
  };

  const canDeleteComment = (comment: CommentWithProfile) => {
    return isAdmin || comment.commented_by === currentUserId;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Comment List */}
      {optimisticComments.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground/80">No comments yet</div>
      ) : (
        <div className="space-y-4">
          {optimisticComments.map((comment) => {
            const showInternal = canCreateInternal && comment.is_internal;
            const canDelete = canDeleteComment(comment);

            return (
              <div
                key={comment.id}
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  showInternal
                    ? 'border-amber-500/30 bg-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/5'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(comment.profile?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium text-foreground">
                        {comment.profile?.full_name || 'Unknown User'}
                      </span>
                      {showInternal && (
                        <Badge
                          variant="outline"
                          className="border-amber-400 bg-amber-100 text-amber-800"
                        >
                          Internal
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground/80">
                        {comment.created_at
                          ? formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                            })
                          : 'just now'}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {comment.comment_text}
                    </p>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                      disabled={isPending || isDeleting}
                      aria-label="Delete comment"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isPending || isDeleting}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span
              className={cn(
                'text-xs',
                commentText.length > 2000 ? 'text-red-600' : 'text-muted-foreground/80'
              )}
            >
              {commentText.length} / 2000
            </span>
            {canCreateInternal && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  disabled={isPending || isDeleting}
                  className="rounded border-border"
                />
                <span className="leading-tight">Internal comment (team only)</span>
              </label>
            )}
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <Button type="submit" disabled={isPending || !commentText.trim()}>
          {isPending ? 'Posting...' : 'Post Comment'}
        </Button>
      </form>
    </div>
  );
}
