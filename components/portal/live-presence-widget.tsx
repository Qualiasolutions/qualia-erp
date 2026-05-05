'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePresence, type PresenceEntry } from '@/components/portal/presence-broadcaster';

interface LivePresenceWidgetProps {
  selfUserId: string;
}

function initialsOf(name: string | null): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || '?'
  );
}

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function roleTone(role: string): string {
  if (role === 'admin') return 'bg-primary/10 text-primary border-primary/20';
  if (role === 'employee')
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400';
  return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400';
}

const MAX_VISIBLE_AVATARS = 3;

/**
 * Compact "who's online" indicator pinned top-right of the portal shell.
 * Replaces the dedicated /admin/live route with an always-visible chip
 * (admin-only) so presence is one glance away on every page. Click to open
 * a popover with the same per-page grouping the old panel exposed.
 */
export function LivePresenceWidget({ selfUserId }: LivePresenceWidgetProps) {
  const entries = usePresence();
  const [, forceTick] = useState(0);

  // 1Hz tick so duration labels in the popover stay current.
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const onlineCount = entries.length;
  const visible = entries.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = Math.max(0, onlineCount - MAX_VISIBLE_AVATARS);
  const now = Date.now();

  const grouped = useMemo(() => {
    const map = new Map<string, PresenceEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.pathname) || [];
      arr.push(e);
      map.set(e.pathname, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [entries]);

  return (
    <div className="fixed right-4 top-4 z-popover print:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              onlineCount === 0
                ? 'Nobody online'
                : `${onlineCount} ${onlineCount === 1 ? 'person' : 'people'} online`
            }
            className={cn(
              'group flex h-9 cursor-pointer items-center gap-2 rounded-full border bg-card/90 pl-1.5 pr-3 shadow-sm shadow-black/[0.04] backdrop-blur transition-colors',
              'hover:border-primary/40 hover:bg-card',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
            )}
          >
            {onlineCount > 0 ? (
              <div className="flex -space-x-1.5">
                {visible.map((u) => (
                  <Avatar key={u.user_id} className="size-6 border-2 border-card">
                    {u.avatar_url ? (
                      <AvatarImage src={u.avatar_url} alt={u.full_name ?? ''} />
                    ) : null}
                    <AvatarFallback className={cn('text-[10px] font-semibold', roleTone(u.role))}>
                      {initialsOf(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <span className="ml-1 size-2 rounded-full bg-muted-foreground/40" />
            )}
            <span className="flex items-center gap-1 text-xs font-medium tabular-nums text-foreground/80 group-hover:text-foreground">
              {onlineCount > 0 && (
                <span className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              )}
              {onlineCount === 0
                ? 'No one online'
                : overflow > 0
                  ? `${onlineCount} online`
                  : `${onlineCount} ${onlineCount === 1 ? 'person' : 'online'}`}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="max-h-[70vh] w-80 overflow-y-auto p-0"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Live presence</p>
            <p className="text-xs text-muted-foreground">
              {onlineCount === 0
                ? 'Nobody is online right now.'
                : `${onlineCount} ${onlineCount === 1 ? 'person' : 'people'} online — updates in real time.`}
            </p>
          </div>

          {grouped.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Waiting for someone to open a tab…
            </div>
          ) : (
            <div className="divide-y divide-border">
              {grouped.map(([pathname, users]) => (
                <div key={pathname} className="p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-mono text-[11px] font-medium text-muted-foreground">
                      {pathname}
                    </p>
                    <Link
                      href={pathname}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-primary"
                    >
                      Open
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                  <ul className="space-y-1.5">
                    {users.map((u) => (
                      <li key={u.user_id} className="flex items-center gap-2.5">
                        <Avatar className="size-7 shrink-0">
                          {u.avatar_url ? (
                            <AvatarImage src={u.avatar_url} alt={u.full_name ?? ''} />
                          ) : null}
                          <AvatarFallback className={cn('text-[10px]', roleTone(u.role))}>
                            {initialsOf(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-medium">
                              {u.full_name ?? 'Unnamed'}
                              {u.user_id === selfUserId ? (
                                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                  (you)
                                </span>
                              ) : null}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn('h-4 px-1 text-[9px] capitalize', roleTone(u.role))}
                            >
                              {u.role}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Here for {formatDuration(now - u.since)}
                          </p>
                        </div>
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-emerald-500"
                          aria-label="online"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
