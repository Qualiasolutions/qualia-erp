'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { getAttendanceLogs } from '@/app/actions/checkins';
import { getTeamMembers, type AdminProfile } from '@/app/actions/admin';
import { getCurrentWorkspaceId } from '@/app/actions';

type AttendanceEntry = Awaited<ReturnType<typeof getAttendanceLogs>>[number];

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return format(parseISO(iso), 'h:mm a');
}

function LateIndicator({ planned, actual }: { planned: string | null; actual: string | null }) {
  if (!planned || !actual) return null;
  const plannedDate = parseISO(planned);
  const actualDate = parseISO(actual);
  const diffMinutes = Math.round((actualDate.getTime() - plannedDate.getTime()) / 60000);

  if (diffMinutes <= 5) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600"
      >
        <CheckCircle2 className="size-3" />
        On time
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-600"
    >
      <AlertTriangle className="size-3" />+{diffMinutes}m late
    </Badge>
  );
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttendanceEntry[]>([]);
  const [members, setMembers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProfile, setFilterProfile] = useState<string>('all');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Get workspace on mount
  useEffect(() => {
    getCurrentWorkspaceId().then(setWorkspaceId);
  }, []);

  const fetchData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const [logsResult, membersResult] = await Promise.all([
      getAttendanceLogs(workspaceId, {
        limit: 60,
        profileId: filterProfile !== 'all' ? filterProfile : undefined,
      }),
      getTeamMembers(),
    ]);
    setLogs(logsResult);
    if (membersResult.success) {
      setMembers(membersResult.data as AdminProfile[]);
    }
    setLoading(false);
  }, [filterProfile, workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily clock-in / clock-out records for all team members
          </p>
        </div>
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

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Clock className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No attendance records yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead className="w-[180px]">Employee</TableHead>
                <TableHead className="w-[110px]">Clock In</TableHead>
                <TableHead className="w-[110px]">Planned Out</TableHead>
                <TableHead className="w-[110px]">Actual Out</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((entry, i) => (
                <TableRow key={`${entry.date}-${entry.profile?.id || i}`}>
                  <TableCell className="text-sm font-medium">
                    {format(parseISO(entry.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-[10px] font-semibold text-primary">
                          {(entry.profile?.full_name || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm">{entry.profile?.full_name || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatTime(entry.clock_in_time)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatTime(entry.planned_clock_out_time)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatTime(entry.actual_clock_out_time)}
                  </TableCell>
                  <TableCell>
                    {entry.actual_clock_out_time ? (
                      <LateIndicator
                        planned={entry.planned_clock_out_time}
                        actual={entry.actual_clock_out_time}
                      />
                    ) : entry.clock_in_time ? (
                      <Badge
                        variant="outline"
                        className="border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-600"
                      >
                        Active
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    {entry.completed_tasks && entry.completed_tasks.length > 0 ? (
                      <ul className="space-y-0.5">
                        {entry.completed_tasks.slice(0, 3).map((task, j) => (
                          <li key={j} className="truncate text-xs text-muted-foreground">
                            {task}
                          </li>
                        ))}
                        {entry.completed_tasks.length > 3 && (
                          <li className="text-[10px] text-muted-foreground/60">
                            +{entry.completed_tasks.length - 3} more
                          </li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
