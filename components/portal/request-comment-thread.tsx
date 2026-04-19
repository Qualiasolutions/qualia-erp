'use client';

import { useState, useOptimistic } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { createRequestComment, deleteRequestComment } from '@/app/actions/request-comments';
import { useRequestComments, invalidateRequestComments } from '@/lib/swr';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useServerAction } from '@/lib/hooks/use-server-action';

interface CommentAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: string | null;
}

interface RequestComment {
  id: string;
  request_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: CommentAuthor | null;
}

interface RequestCommentThreadProps {
  requestId: string;
  currentUserId: string;
  userRole: string;
  legacyAdminResponse?: string | null;
}

export function RequestCommentThread({
  requestId,
  currentUserId,
  userRole,
  legacyAdminResponse,
}: RequestCommentThreadProps) {
  const { comments: swrComments, isLoading: loading } = useRequestComments(requestId);
  const [commentText, setCommentText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Cast SWR data to our local type
  const comments = swrComments as RequestComment[];

  const [optimisticComments, addOptimisticComment] = useOptimistic<
    RequestComment[],
    RequestComment
  >(comments, (state, newComment) => [...state, newComment]);

  const isStaff = userRole === 'admin' || userRole === 'employee';

  const { execute: submitComment, isPending } = useServerAction<RequestComment, [string, string]>(
    createRequestComment,
    {
      onSuccess: () => {
        invalidateRequestComments(requestId);
      },
      onError: (errorMsg: string) => {
        invalidateRequestComments(requestId);
        toast.error(errorMsg);
      },
    }
  );

  const { execute: removeComment, isPending: isDeleting } = useServerAction(deleteRequestComment, {
    onSuccess: () => {
      invalidateRequestComments(requestId);
    },
    onError: (errorMsg: string) => {
      toast.error(errorMsg);
      invalidateRequestComments(requestId);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > 5000) return;

    // Optimistic insert
    const optimisticComment: RequestComment = {
      id: `temp-${Date.now()}`,
      request_id: requestId,
      author_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
      author: {
        id: currentUserId,
        full_name: 'You',
        avatar_url: null,
        email: null,
        role: userRole,
      },
    };

    addOptimisticComment(optimisticComment);
    setCommentText('');

    await submitComment(requestId, trimmed);
  };

  const handleDelete = (commentId: string) => {
    setDeleteConfirmId(commentId);
  };

  const confirmDelete = async () => {
    const commentId = deleteConfirmId;
    if (!commentId) return;
    setDeleteConfirmId(null);

    await removeComment(commentId);
  };

  const canDelete = (comment: RequestComment) => {
    if (userRole === 'admin') return true;
    return comment.author_id === currentUserId;
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

  const isStaffRole = (role: string | null) => {
    return role === 'admin' || role === 'employee';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">Loading comments...</span>
      </div>
    );
  }

  const hasLegacy = legacyAdminResponse && legacyAdminResponse.trim().length > 0;
  const hasComments = optimisticComments.length > 0;

  return (
    <div className="mt-4 space-y-3">
      {/* Legacy admin_response pinned at top */}
      {hasLegacy && (
        <div className="rounded-lg border border-primary/10 bg-primary/[0.04] p-3 dark:border-primary/20 dark:bg-primary/[0.06]">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
            <MessageSquare className="h-3 w-3" />
            Initial response from Qualia
          </div>
          <p className="text-sm text-foreground/80">{legacyAdminResponse}</p>
        </div>
      )}

      {/* Comment list */}
      {!hasComments && !hasLegacy && (
        <div className="py-4 text-center text-xs text-muted-foreground/80">
          No comments yet. Start the conversation below.
        </div>
      )}

      {hasComments && (
        <div className="space-y-2.5">
          {optimisticComments.map((comment) => {
            const authorIsStaff = isStaffRole(comment.author?.role ?? null);

            return (
              <div
                key={comment.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors duration-150',
                  'border-border bg-card'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={comment.author?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(comment.author?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {comment.author?.full_name || 'Unknown User'}
                      </span>
                      {authorIsStaff && isStaff && (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
                        >
                          {comment.author?.role === 'admin' ? 'Admin' : 'Staff'}
                        </Badge>
                      )}
                      {authorIsStaff && !isStaff && (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
                        >
                          Qualia Team
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {comment.content}
                    </p>
                  </div>

                  {canDelete(comment) && !comment.id.startsWith('temp-') && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded p-1 text-muted-foreground/50 transition-colors duration-150 hover:bg-muted hover:text-red-600"
                      disabled={isPending || isDeleting}
                      aria-label="Delete comment"
                    >
                      <svg
                        className="h-3.5 w-3.5"
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

      {/* Compose area */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Write a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[80px] resize-none text-sm"
          disabled={isPending || isDeleting}
        />
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-[11px]',
              commentText.length > 5000 ? 'text-red-600' : 'text-muted-foreground/60'
            )}
          >
            {commentText.length > 0 && `${commentText.length} / 5000`}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !commentText.trim() || commentText.length > 5000}
            className="cursor-pointer"
          >
            {isPending ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete this comment?"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
