'use client';

import { useState, useEffect, memo } from 'react';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSessionsAdmin } from '@/lib/swr';
import type { WorkSession } from '@/app/actions/work-sessions';

// ============ TYPES ============

interface SessionHistoryPanelProps {
  workspaceId: string;
  profileId: string;
  profileName: string;
  onClose: () => void;
}

// ============ HELPERS ============

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function calcTotalMinutes(sessions: WorkSession[]): number {
  return sessions.reduce((acc, s) => {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    return acc + Math.max(0, Math.floor((end - start) / 60000));
  }, 0);
}

function formatTotalHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============ DURATION TICKER (for active sessions) ============

interface DurationTickerProps {
  startedAt: string;
}

const DurationTicker = memo(function DurationTicker({ startedAt }: DurationTickerProps) {
  const [duration, setDuration] = useState(() => formatDuration(startedAt, null));

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(formatDuration(startedAt, null));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{duration}</span>;
});

// ============ SESSION ROW ============

interface SessionRowProps {
  session: WorkSession;
  index: number;
}

const SessionRow = memo(function SessionRow({ session, index }: SessionRowProps) {
  const isActive = !session.ended_at;
  const projectName = session.project?.name ?? null;

  const timeStart = format(parseISO(session.started_at), 'HH:mm');
  const timeEnd = session.ended_at ? format(parseISO(session.ended_at), 'HH:mm') : 'ongoing';

  return (
    <div
      className="animate-stagger-in border-b border-border/50 px-3 py-2.5 last:border-b-0"
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
    >
      <div className="flex items-center gap-2">
        {/* Time range */}
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-foreground/80">
          {timeStart} – {timeEnd}
        </span>

        {/* Active badge */}
        {isActive && (
          <span className="bg-emerald-500/12 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Active
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Duration */}
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {isActive ? (
            <DurationTicker startedAt={session.started_at} />
          ) : (
            formatDuration(session.started_at, session.ended_at)
          )}
        </span>
      </div>

      {/* Project or clock-in note */}
      <p
        className={cn(
          'mt-0.5 truncate text-[10px]',
          projectName || session.clock_in_note
            ? 'text-muted-foreground/70'
            : 'italic text-muted-foreground/40'
        )}
      >
        {projectName ?? session.clock_in_note ?? 'No project'}
      </p>

      {/* Summary */}
      {session.summary && (
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/60">
          {session.summary}
        </p>
      )}
    </div>
  );
});

// ============ SKELETON ============

function SessionSkeleton() {
  return (
    <div className="space-y-px">
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24 rounded" />
            <div className="flex-1" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
          <Skeleton className="mt-1.5 h-2.5 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function SessionHistoryPanel({
  workspaceId,
  profileId,
  profileName,
  onClose,
}: SessionHistoryPanelProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { sessions, isLoading } = useSessionsAdmin(workspaceId, profileId, dateStr);

  const totalMinutes = calcTotalMinutes(sessions);
  const isTodaySelected = isToday(selectedDate);

  function goBack() {
    setSelectedDate((d) => subDays(d, 1));
  }

  function goForward() {
    setSelectedDate((d) => addDays(d, 1));
  }

  function goToday() {
    setSelectedDate(new Date());
  }

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
            Session History
          </p>
          <h3 className="truncate text-sm font-semibold text-foreground">{profileName}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground/60 hover:text-foreground"
          onClick={onClose}
          aria-label="Back to team overview"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border/50 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground/60 hover:text-foreground"
          onClick={goBack}
          aria-label="Previous day"
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        <span className="min-w-0 flex-1 text-center text-xs font-medium text-foreground">
          {format(selectedDate, 'EEE, MMM d')}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground/60 hover:text-foreground"
          onClick={goForward}
          disabled={isTodaySelected}
          aria-label="Next day"
        >
          <ChevronRight className="size-3.5" />
        </Button>

        {!isTodaySelected && (
          <Button
            variant="ghost"
            className="h-6 px-2 text-[10px] font-medium text-primary hover:bg-primary/10 hover:text-primary"
            onClick={goToday}
          >
            Today
          </Button>
        )}
      </div>

      {/* Session list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <SessionSkeleton />
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-8">
            <p className="text-xs text-muted-foreground/50">No sessions on this date</p>
          </div>
        ) : (
          sessions.map((session, i) => <SessionRow key={session.id} session={session} index={i} />)
        )}
      </div>

      {/* Total hours footer */}
      {!isLoading && sessions.length > 0 && (
        <div className="flex shrink-0 items-center justify-between border-t border-border/50 px-4 py-2.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
            Total
          </span>
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {formatTotalHours(totalMinutes)}
          </span>
        </div>
      )}
    </div>
  );
}
