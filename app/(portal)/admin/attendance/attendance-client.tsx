'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, parseISO, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { Clock, User, Briefcase, CalendarIcon, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSessionsAdmin } from '@/app/actions/work-sessions';
import { getTeamMembers, type AdminProfile } from '@/app/actions/admin';
import { getCurrentWorkspaceId } from '@/app/actions';
import type { DateRange } from 'react-day-picker';

type SessionEntry = Awaited<ReturnType<typeof getSessionsAdmin>>[number];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function computeDuration(session: SessionEntry): number | null {
  if (session.duration_minutes != null) return session.duration_minutes;
  if (!session.ended_at) return null;
  return Math.round(
    (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
  );
}

function formatDateLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Pick dates';
  if (!range.to) return format(range.from, 'MMM d, yyyy');
  return `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d, yyyy')}`;
}

// Prevent CSV formula injection in Excel / Sheets by prefixing cells that
// start with a risky character and normalising line breaks inside quoted
// fields. Without this, a session summary beginning with `=` or `@` would
// be evaluated as a formula when the exported file is opened.
function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const normalized = raw.replace(/\r\n|\r/g, '\n');
  const needsEscape = /^[=+\-@\t\r]/.test(normalized);
  const safe = needsEscape ? `'${normalized}` : normalized;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(sessions: SessionEntry[]) {
  const header = 'Date,Employee,Project,Clock In,Clock Out,Duration (min),Summary';
  const rows = sessions.map((s) => {
    const dur = computeDuration(s);
    return [
      csvCell(format(parseISO(s.started_at), 'yyyy-MM-dd')),
      csvCell(s.profile?.full_name ?? 'Unknown'),
      csvCell(s.project?.name ?? s.clock_in_note ?? ''),
      csvCell(format(parseISO(s.started_at), 'HH:mm')),
      csvCell(s.ended_at ? format(parseISO(s.ended_at), 'HH:mm') : ''),
      csvCell(dur ?? ''),
      csvCell(s.summary ?? ''),
    ].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminAttendanceClient() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [members, setMembers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProfile, setFilterProfile] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentWorkspaceId().then(setWorkspaceId);
  }, []);

  const fetchData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const [sessionsResult, membersResult] = await Promise.all([
      getSessionsAdmin(workspaceId, {
        limit: 500,
        profileId: filterProfile !== 'all' ? filterProfile : undefined,
        startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      }),
      getTeamMembers(),
    ]);
    setSessions(sessionsResult);
    if (membersResult.success) {
      setMembers(membersResult.data as AdminProfile[]);
    }
    setLoading(false);
  }, [filterProfile, dateRange, workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick presets
  const setPreset = (preset: 'week' | 'month' | '7d' | '30d') => {
    const today = new Date();
    switch (preset) {
      case 'week':
        setDateRange({ from: startOfWeek(today, { weekStartsOn: 1 }), to: today });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(today), to: today });
        break;
      case '7d':
        setDateRange({ from: subDays(today, 7), to: today });
        break;
      case '30d':
        setDateRange({ from: subDays(today, 30), to: today });
        break;
    }
  };

  // Total hours in the current filter
  const totalMinutes = sessions.reduce((sum, s) => sum + (computeDuration(s) ?? 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sessions.length} sessions · {totalHours}h total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(sessions)}
          disabled={sessions.length === 0}
        >
          <Download className="mr-1.5 size-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Date range picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
              <CalendarIcon className="size-3.5" />
              {formatDateLabel(dateRange)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex gap-1 border-b border-border px-3 py-2">
              {(['7d', 'week', 'month', '30d'] as const).map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPreset(p)}
                >
                  {p === '7d'
                    ? 'Last 7d'
                    : p === 'week'
                      ? 'This week'
                      : p === 'month'
                        ? 'This month'
                        : 'Last 30d'}
                </Button>
              ))}
            </div>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>

        {/* Member filter */}
        <Select value={filterProfile} onValueChange={setFilterProfile}>
          <SelectTrigger className="h-9 w-[200px]">
            <User className="mr-1.5 size-3.5" />
            <SelectValue placeholder="Filter by member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {members
              .filter((m) => m.role !== 'admin')
              .map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name || m.email || 'Unknown'}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Clock className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No sessions found for this period.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead className="w-[180px]">Employee</TableHead>
                <TableHead className="w-[160px]">Project</TableHead>
                <TableHead className="w-[100px]">Clock In</TableHead>
                <TableHead className="w-[100px]">Clock Out</TableHead>
                <TableHead className="w-[90px]">Duration</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const dur = computeDuration(session);
                return (
                  <TableRow key={session.id}>
                    <TableCell className="text-sm font-medium">
                      {format(parseISO(session.started_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-[10px] font-semibold text-primary">
                            {(session.profile?.full_name || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm">{session.profile?.full_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Briefcase className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {session.project?.name ?? session.clock_in_note ?? '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {format(parseISO(session.started_at), 'h:mm a')}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {session.ended_at ? format(parseISO(session.ended_at), 'h:mm a') : '—'}
                    </TableCell>
                    <TableCell>
                      {dur != null ? (
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatDuration(dur)}
                        </span>
                      ) : !session.ended_at ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-600"
                        >
                          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                          Active
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      {session.summary ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {session.summary.length > 80
                            ? `${session.summary.slice(0, 80)}…`
                            : session.summary}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
