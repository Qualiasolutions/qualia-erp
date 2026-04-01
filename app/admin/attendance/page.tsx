'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, User, Briefcase } from 'lucide-react';
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
import { getSessionsAdmin } from '@/app/actions/work-sessions';
import { getTeamMembers, type AdminProfile } from '@/app/actions/admin';
import { getCurrentWorkspaceId } from '@/app/actions';

type SessionEntry = Awaited<ReturnType<typeof getSessionsAdmin>>[number];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AttendancePage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
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
    const [sessionsResult, membersResult] = await Promise.all([
      getSessionsAdmin(workspaceId, {
        limit: 100,
        profileId: filterProfile !== 'all' ? filterProfile : undefined,
      }),
      getTeamMembers(),
    ]);
    setSessions(sessionsResult);
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
            Work session records for all team members
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

      {sessions.length === 0 ? (
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
                <TableHead className="w-[160px]">Project</TableHead>
                <TableHead className="w-[100px]">Clock In</TableHead>
                <TableHead className="w-[100px]">Clock Out</TableHead>
                <TableHead className="w-[90px]">Duration</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
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
                    {session.duration_minutes != null ? (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatDuration(session.duration_minutes)}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
