'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Briefcase } from 'lucide-react';
import { useCurrentWorkspaceId } from '@/lib/swr';
import { getMySessions, type WorkSession } from '@/app/actions/work-sessions';

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

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    getMySessions(workspaceId)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // Group sessions by date
  const grouped = sessions.reduce<Record<string, WorkSession[]>>((acc, s) => {
    const day = format(parseISO(s.started_at), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Total hours this month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthMinutes = sessions
    .filter((s) => s.started_at.startsWith(thisMonth))
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const monthHours = Math.round((monthMinutes / 60) * 10) / 10;

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

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
          <p className="text-xs text-muted-foreground">This month</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">{monthHours}h</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">{totalHours}h</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Sessions</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">{sessions.length}</p>
        </div>
      </div>

      {/* Sessions grouped by day */}
      <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
        {sortedDays.map((day) => {
          const daySessions = grouped[day];
          const dayTotal = daySessions.reduce((s, sess) => s + (sess.duration_minutes || 0), 0);

          return (
            <div key={day}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {format(parseISO(day), 'EEEE, MMM d')}
                </p>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatDuration(dayTotal)}
                </span>
              </div>
              <div className="space-y-1.5">
                {daySessions.map((s) => (
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
