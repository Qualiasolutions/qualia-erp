'use client';

import { useEffect, useState } from 'react';
import { Loader2, Rocket, AlertTriangle, GitBranch, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getEmployeeHistory, type SessionFeedRow } from '@/app/actions/admin-control';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  const diff = Math.floor(
    (today.getTime() - new Date(iso.slice(0, 10) + 'T00:00:00').getTime()) / dayMs
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-IE', { weekday: 'long' });
  return d.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDay(rows: SessionFeedRow[]): { day: string; rows: SessionFeedRow[] }[] {
  const groups: { day: string; rows: SessionFeedRow[] }[] = [];
  let current: { day: string; rows: SessionFeedRow[] } | null = null;
  for (const r of rows) {
    const day = r.startedAt.slice(0, 10);
    if (!current || current.day !== day) {
      current = { day, rows: [] };
      groups.push(current);
    }
    current.rows.push(r);
  }
  return groups;
}

export function HistoryTab({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<SessionFeedRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- one-shot async history fetch with cancellation guard */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEmployeeHistory(profileId, 0).then((result) => {
      if (cancelled || !result) return;
      setRows(result.rows);
      setHasMore(result.hasMore);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    const result = await getEmployeeHistory(profileId, next);
    if (result) {
      setRows((prev) => [...prev, ...result.rows]);
      setHasMore(result.hasMore);
      setPage(next);
    }
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        <span className="text-sm">Loading session history…</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">No work sessions recorded yet.</p>
      </div>
    );
  }

  const groups = groupByDay(rows);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.day} className="flex flex-col gap-2">
          <header className="flex items-baseline gap-3">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {dayLabel(group.day)}
            </h3>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
              {group.day}
            </span>
            <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
              {totalHours(group.rows).toFixed(1)}h total
            </span>
          </header>
          <ul className="flex flex-col gap-2">
            {group.rows.map((r) => (
              <li key={r.sessionId}>
                <SessionCard row={r} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SessionCard({ row }: { row: SessionFeedRow }) {
  const hasDeploy = (row.report?.deployCount ?? 0) > 0;
  const hasBlocker = (row.report?.gapCycles ?? 0) > 0;
  const hasFail = row.report?.verification === 'fail';

  return (
    <div
      className={cn(
        'rounded-xl border bg-card px-4 py-3 transition-colors',
        hasFail
          ? 'border-rose-500/30 hover:bg-rose-500/[0.03]'
          : hasBlocker
            ? 'border-amber-500/30 hover:bg-amber-500/[0.03]'
            : 'border-border hover:border-primary/30 hover:bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1 size-2 shrink-0 rounded-full"
          aria-hidden
          style={{ background: `oklch(0.66 0.13 ${row.hue})` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {fmtTime(row.startedAt)}
              {row.endedAt ? ` – ${fmtTime(row.endedAt)}` : ' (active)'}
            </span>
            <span className="font-mono text-[11px] font-semibold tabular-nums">
              {fmtDuration(row.durationMinutes)}
            </span>
            {row.projectName ? (
              <span className="font-medium text-foreground">{row.projectName}</span>
            ) : (
              <span className="text-muted-foreground">No project</span>
            )}
            {/* Badges */}
            {hasDeploy ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <Rocket className="size-3" aria-hidden /> deploy
                {row.report!.deployCount! > 1 ? ` ×${row.report!.deployCount}` : ''}
              </span>
            ) : null}
            {hasBlocker ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-3" aria-hidden /> stuck ×{row.report!.gapCycles}
              </span>
            ) : null}
            {hasFail ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-400">
                verification fail
              </span>
            ) : null}
          </div>
          {row.summary ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-foreground/90">
              {row.summary}
            </p>
          ) : (
            <p className="mt-1 text-[12px] italic text-muted-foreground">No summary</p>
          )}
          {row.report ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] tabular-nums text-muted-foreground/80">
              {row.report.commitsCount > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-3" aria-hidden />
                  {row.report.commitsCount} commit{row.report.commitsCount === 1 ? '' : 's'}
                </span>
              ) : null}
              {row.report.tasksTotal != null && row.report.tasksTotal > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3" aria-hidden />
                  {row.report.tasksDone ?? 0}/{row.report.tasksTotal}
                </span>
              ) : null}
              {row.report.milestone ? <span>· {row.report.milestone}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function totalHours(rows: SessionFeedRow[]): number {
  return rows.reduce((sum, r) => sum + r.durationMinutes / 60, 0);
}
