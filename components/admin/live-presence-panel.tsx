'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PresenceEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  pathname: string;
  since: number;
}

interface LivePresencePanelProps {
  workspaceId: string;
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

export function LivePresencePanel({ workspaceId, selfUserId }: LivePresencePanelProps) {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence:workspace:${workspaceId}`, {
      config: { presence: { key: `viewer:${selfUserId}` } },
    });

    const sync = () => {
      const state = channel.presenceState<PresenceEntry>();
      // Each key holds an array of meta entries; one tab = one entry.
      // Collapse to most-recent per user_id.
      const latestByUser = new Map<string, PresenceEntry>();
      for (const metas of Object.values(state)) {
        for (const meta of metas) {
          if (!meta.user_id) continue;
          const prev = latestByUser.get(meta.user_id);
          if (!prev || meta.since > prev.since) latestByUser.set(meta.user_id, meta);
        }
      }
      setEntries(
        Array.from(latestByUser.values()).sort((a, b) =>
          (a.full_name || '').localeCompare(b.full_name || '')
        )
      );
    };

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track an empty viewer record so we count as present too — without it
          // the channel would never receive presence events for ourselves.
          await channel.track({ viewer: true });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, selfUserId]);

  // 1Hz tick so the duration column updates without re-subscribing.
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const onlineCount = entries.length;
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Live presence</h1>
          <p className="text-sm text-muted-foreground">
            {onlineCount === 0
              ? 'Nobody is online right now.'
              : `${onlineCount} ${onlineCount === 1 ? 'person' : 'people'} online — updates in real time.`}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          Waiting for someone to open a tab…
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([pathname, users]) => (
            <div
              key={pathname}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Page
                  </p>
                  <p className="truncate font-mono text-sm font-medium">{pathname}</p>
                </div>
                <Link
                  href={pathname}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {users.map((u) => (
                  <li
                    key={u.user_id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                  >
                    <Avatar className="h-9 w-9">
                      {u.avatar_url ? (
                        <AvatarImage src={u.avatar_url} alt={u.full_name ?? ''} />
                      ) : null}
                      <AvatarFallback className={roleTone(u.role)}>
                        {initialsOf(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">
                          {u.full_name ?? 'Unnamed'}
                          {u.user_id === selfUserId ? (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] capitalize', roleTone(u.role))}
                        >
                          {u.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Here for {formatDuration(now - u.since)}
                      </p>
                    </div>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                      aria-label="online"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
