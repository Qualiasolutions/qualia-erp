'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';
import { Clock, Briefcase } from 'lucide-react';
import { useCurrentWorkspaceId } from '@/lib/swr';
import { getMySessions, type WorkSession } from '@/app/actions/work-sessions';

type ViewMode = 'day' | 'week' | 'month';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function MyHoursSection() {
  const { workspaceId } = useCurrentWorkspaceId();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('day');

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    getMySessions(workspaceId)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // Group sessions based on view mode
  const grouped = useMemo(() => {
    const groups: Record<string, { label: string; sessions: WorkSession[] }> = {};

    for (const s of sessions) {
      const date = parseISO(s.started_at);
      let key: string;
      let label: string;

      if (view === 'day') {
        key = format(date, 'yyyy-MM-dd');
        label = format(date, 'EEEE, MMM d');
      } else if (view === 'week') {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        key = format(weekStart, 'yyyy-MM-dd');
        label = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;
      } else {
        key = format(date, 'yyyy-MM');
        label = format(date, 'MMMM yyyy');
      }

      if (!groups[key]) groups[key] = { label, sessions: [] };
      groups[key].sessions.push(s);
    }

    return groups;
  }, [sessions, view]);

  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Summary stats
  const now = new Date();
  const thisMonthInterval = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
  const thisWeekInterval = {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };

  const monthMinutes = sessions
    .filter((s) => isWithinInterval(parseISO(s.started_at), thisMonthInterval))
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const weekMinutes = sessions
    .filter((s) => isWithinInterval(parseISO(s.started_at), thisWeekInterval))
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const todayStr = format(now, 'yyyy-MM-dd');
  const todayMinutes = sessions
    .filter((s) => s.started_at.startsWith(todayStr))
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-5 w-64 animate-pulse rounded bg-muted" />
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No work sessions recorded in the last 30 days.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">
            {formatDuration(todayMinutes)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">This week</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">
            {formatDuration(weekMinutes)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">This month</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">
            {formatDuration(monthMinutes)}
          </p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 rounded-lg border border-border p-0.5">
        {(['day', 'week', 'month'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              view === mode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Sessions grouped by period */}
      <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
        {sortedKeys.map((key) => {
          const group = grouped[key];
          const groupTotal = group.sessions.reduce(
            (s, sess) => s + (sess.duration_minutes || 0),
            0
          );

          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
                <span className="text-xs font-medium tabular-nums text-foreground">
                  {formatDuration(groupTotal)}
                </span>
              </div>

              {/* In week/month view, show daily subtotals instead of individual sessions */}
              {view !== 'day' ? (
                <div className="space-y-1.5">
                  {(() => {
                    const dayMap: Record<
                      string,
                      { label: string; total: number; projects: Set<string> }
                    > = {};
                    for (const s of group.sessions) {
                      const dayKey = format(parseISO(s.started_at), 'yyyy-MM-dd');
                      if (!dayMap[dayKey]) {
                        dayMap[dayKey] = {
                          label: format(parseISO(s.started_at), 'EEE, MMM d'),
                          total: 0,
                          projects: new Set(),
                        };
                      }
                      dayMap[dayKey].total += s.duration_minutes || 0;
                      if (s.project?.name) dayMap[dayKey].projects.add(s.project.name);
                    }
                    const sortedDays = Object.keys(dayMap).sort((a, b) => b.localeCompare(a));

                    return sortedDays.map((dayKey) => {
                      const day = dayMap[dayKey];
                      return (
                        <div
                          key={dayKey}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-foreground">{day.label}</span>
                            {day.projects.size > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {Array.from(day.projects).join(', ')}
                              </span>
                            )}
                          </div>
                          <span className="font-medium tabular-nums text-foreground">
                            {formatDuration(day.total)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {group.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{s.project?.name || 'No project'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(s.started_at), 'HH:mm')}
                          {s.ended_at && ` – ${format(parseISO(s.ended_at), 'HH:mm')}`}
                        </span>
                        {s.duration_minutes != null && (
                          <span className="font-medium tabular-nums text-foreground">
                            {formatDuration(s.duration_minutes)}
                          </span>
                        )}
                        {!s.ended_at && (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
