'use client';

import { useMemo, useState, useTransition } from 'react';
import { Megaphone, Send, Pin, Trash2, AlertCircle, RefreshCw, X, PinOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createOwnerUpdate,
  deleteOwnerUpdate,
  updateOwnerUpdate,
  type UpdatePriority,
} from '@/app/actions/owner-updates';
import { useOwnerUpdates, invalidateOwnerUpdates } from '@/lib/swr';

interface AdminUpdatesPanelProps {
  workspaceId: string;
}

const PRIORITY_OPTIONS: { value: UpdatePriority; label: string; dot: string; chip: string }[] = [
  {
    value: 'normal',
    label: 'Normal',
    dot: 'bg-muted-foreground/50',
    chip: 'bg-muted text-muted-foreground',
  },
  {
    value: 'low',
    label: 'Low',
    dot: 'bg-slate-400',
    chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  },
  {
    value: 'high',
    label: 'High',
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    dot: 'bg-red-500',
    chip: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
];

function priorityStyle(p: UpdatePriority) {
  return PRIORITY_OPTIONS.find((o) => o.value === p) ?? PRIORITY_OPTIONS[0];
}

export function AdminUpdatesPanel({ workspaceId }: AdminUpdatesPanelProps) {
  const { updates, isLoading, isError, revalidate } = useOwnerUpdates(workspaceId, false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<UpdatePriority>('normal');
  const [pinned, setPinned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [, startMutate] = useTransition();

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const resetForm = () => {
    setTitle('');
    setBody('');
    setPriority('normal');
    setPinned(false);
    setFormError(null);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      setFormError('Title and message are required.');
      return;
    }
    setFormError(null);

    startSubmit(async () => {
      const result = await createOwnerUpdate(workspaceId, title, body, { priority, pinned });
      if (!result.success) {
        setFormError(result.error ?? 'Failed to post update.');
        return;
      }
      resetForm();
      setComposeOpen(false);
      invalidateOwnerUpdates(workspaceId, true);
      toast.success('Update posted to the team.');
    });
  };

  const handleDelete = (id: string) => {
    startMutate(async () => {
      const result = await deleteOwnerUpdate(id);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete update.');
        return;
      }
      invalidateOwnerUpdates(workspaceId, true);
      toast.success('Update removed.');
    });
  };

  const handleTogglePin = (id: string, current: boolean) => {
    startMutate(async () => {
      const result = await updateOwnerUpdate(id, { pinned: !current });
      if (!result.success) {
        toast.error(result.error ?? 'Failed to update.');
        return;
      }
      invalidateOwnerUpdates(workspaceId, true);
    });
  };

  const sortedUpdates = useMemo(() => {
    // Pinned first, then newest — matches server-side order but ensures client consistency.
    return [...updates].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [updates]);

  const visible = sortedUpdates.slice(0, 5);

  return (
    <section aria-labelledby="updates-panel-heading">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="updates-panel-heading"
            className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground/60"
          >
            Updates
          </h2>
          {!isLoading && updates.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {updates.length}
            </span>
          )}
        </div>
        {!composeOpen && (
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground',
              'transition-colors duration-150 hover:bg-muted/50 hover:text-primary',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
            )}
          >
            <Megaphone className="h-3 w-3" aria-hidden="true" />
            Post update
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        {/* Compose */}
        {composeOpen && (
          <div className="border-b border-border/50 bg-primary/[0.03] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <Megaphone className="h-3 w-3 text-primary" />
                </div>
                New update
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setComposeOpen(false);
                }}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Close compose"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title — short and clear"
              maxLength={200}
              className="h-8 text-sm"
              disabled={isSubmitting}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your update… Markdown-lite: **bold** and `code` supported."
              rows={3}
              maxLength={10000}
              className="mt-2 resize-none text-sm"
              disabled={isSubmitting}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Priority chips */}
              <div
                role="radiogroup"
                aria-label="Priority"
                className="flex items-center gap-1 rounded-md border border-border/60 bg-background p-0.5"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    role="radio"
                    type="button"
                    aria-checked={priority === opt.value}
                    disabled={isSubmitting}
                    onClick={() => setPriority(opt.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                      priority === opt.value
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', opt.dot)} />
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Pin toggle */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPinned((v) => !v)}
                aria-pressed={pinned}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  pinned
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Pin className={cn('h-3 w-3', pinned && 'fill-current')} />
                {pinned ? 'Pinned' : 'Pin'}
              </button>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-muted-foreground/60">
                  {body.length}/10000
                </span>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="h-8 gap-1.5"
                >
                  {isSubmitting ? (
                    'Posting…'
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>

            {formError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {formError}
              </p>
            )}
          </div>
        )}

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border-b border-border/30 px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-foreground">Couldn&apos;t load updates</p>
            <button
              type="button"
              onClick={() => revalidate()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">No updates yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Post an update to keep the team in the loop.
            </p>
            {!composeOpen && (
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-1.5 text-xs font-medium text-primary transition-colors duration-150 hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <Megaphone className="h-3 w-3" aria-hidden="true" />
                Post first update
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {visible.map((u) => {
              const ps = priorityStyle(u.priority);
              const authorName = u.author?.full_name ?? 'Unknown';
              const initials = authorName
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase() ?? '')
                .join('');
              const when = (() => {
                try {
                  return formatDistanceToNow(new Date(u.created_at), { addSuffix: true });
                } catch {
                  return '';
                }
              })();

              return (
                <li
                  key={u.id}
                  className={cn(
                    'group relative px-4 py-3 transition-colors duration-150 hover:bg-muted/30',
                    u.pinned && 'bg-primary/[0.025]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {u.author?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.author.avatar_url}
                        alt={authorName}
                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials || 'U'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {u.pinned && <Pin className="h-3 w-3 shrink-0 fill-primary text-primary" />}
                        <p className="truncate text-sm font-semibold text-foreground">{u.title}</p>
                        {u.priority !== 'normal' && (
                          <span
                            className={cn(
                              'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                              ps.chip
                            )}
                          >
                            {ps.label}
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[13px] leading-snug text-muted-foreground">
                        {u.body}
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground/60">
                        <span className="font-medium text-muted-foreground/80">{authorName}</span>
                        {when && <> · {when}</>}
                      </p>
                    </div>

                    {/* Hover actions */}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(u.id, u.pinned)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        aria-label={u.pinned ? 'Unpin update' : 'Pin update'}
                        title={u.pinned ? 'Unpin' : 'Pin'}
                      >
                        {u.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
                        aria-label="Delete update"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
