'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, subDays, startOfWeek, startOfMonth, subMonths } from 'date-fns';
import {
  CalendarIcon,
  Clock,
  Users,
  Briefcase,
  TrendingUp,
  Download,
  AlertTriangle,
  Zap,
  Heart,
  CheckCircle2,
  AlertCircle,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getCurrentWorkspaceId } from '@/app/actions';
import {
  getReportData,
  getAssignedVsDone,
  getCheckinAnalytics,
  getTaskStats,
  type ReportSummary,
  type AssignedVsDone,
  type CheckinAnalytics,
  type TaskStats,
} from '@/app/actions/reports';
import type { DateRange } from 'react-day-picker';

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Pick dates';
  if (!range.to) return format(range.from, 'MMM d, yyyy');
  return `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d, yyyy')}`;
}

function downloadEmployeeCsv(data: ReportSummary) {
  const header = 'Employee,Hours,Sessions,Projects';
  const rows = data.byEmployee.map((e) =>
    [
      `"${e.fullName}"`,
      (e.totalMinutes / 60).toFixed(1),
      e.sessionCount,
      `"${e.projects.join(', ')}"`,
    ].join(',')
  );
  downloadBlob([header, ...rows].join('\n'), 'report-employees');
}

function downloadProjectCsv(data: ReportSummary) {
  const header = 'Project,Hours,Sessions,Contributors';
  const rows = data.byProject.map((p) =>
    [
      `"${p.projectName}"`,
      (p.totalMinutes / 60).toFixed(1),
      p.sessionCount,
      `"${p.contributors.join(', ')}"`,
    ].join(',')
  );
  downloadBlob([header, ...rows].join('\n'), 'report-projects');
}

function downloadBlob(csv: string, prefix: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [avd, setAvd] = useState<AssignedVsDone[]>([]);
  const [checkinData, setCheckinData] = useState<CheckinAnalytics | null>(null);
  const [taskData, setTaskData] = useState<TaskStats | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  useEffect(() => {
    getCurrentWorkspaceId().then(setWorkspaceId);
  }, []);

  const fetchData = useCallback(async () => {
    if (!workspaceId || !dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    const start = format(dateRange.from, 'yyyy-MM-dd');
    const end = format(dateRange.to, 'yyyy-MM-dd');
    const [reportData, avdData, checkinRes, taskRes] = await Promise.all([
      getReportData(workspaceId, start, end),
      getAssignedVsDone(workspaceId, start, end),
      getCheckinAnalytics(workspaceId, start, end),
      getTaskStats(workspaceId, start, end),
    ]);
    setReport(reportData);
    setAvd(avdData);
    setCheckinData(checkinRes);
    setTaskData(taskRes);
    setLoading(false);
  }, [workspaceId, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPreset = (preset: 'week' | 'month' | '7d' | '30d' | 'last-month') => {
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
      case 'last-month': {
        const prev = subMonths(today, 1);
        setDateRange({
          from: startOfMonth(prev),
          to: new Date(prev.getFullYear(), prev.getMonth() + 1, 0),
        });
        break;
      }
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team hours, project breakdown, and assignment tracking
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
              <CalendarIcon className="size-3.5" />
              {formatDateLabel(dateRange)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
              {(['7d', 'week', 'month', '30d', 'last-month'] as const).map((p) => (
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
                        : p === '30d'
                          ? 'Last 30d'
                          : 'Last month'}
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
      </div>

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !report ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Clock className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No data available.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Hours
                </CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{report.totalHours}h</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sessions
                </CardTitle>
                <Briefcase className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{report.totalSessions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Team Members
                </CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{report.activeMembers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg/Day</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{report.avgHoursPerDay}h</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="employees">
            <TabsList>
              <TabsTrigger value="employees">By Employee</TabsTrigger>
              <TabsTrigger value="projects">By Project</TabsTrigger>
              <TabsTrigger value="assigned">Assigned vs Done</TabsTrigger>
              <TabsTrigger value="checkins">Check-ins</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>

            {/* By Employee */}
            <TabsContent value="employees">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {report.byEmployee.length} employees
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadEmployeeCsv(report)}
                  disabled={report.byEmployee.length === 0}
                >
                  <Download className="mr-1.5 size-3.5" />
                  CSV
                </Button>
              </div>
              {report.byEmployee.length === 0 ? (
                <EmptyState message="No employee data for this period." />
              ) : (
                <div className="rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[200px]">Employee</TableHead>
                        <TableHead className="w-[100px]">Hours</TableHead>
                        <TableHead className="w-[90px]">Sessions</TableHead>
                        <TableHead>Projects</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.byEmployee.map((emp) => (
                        <TableRow key={emp.profileId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-[10px] font-semibold text-primary">
                                  {emp.fullName[0]?.toUpperCase() ?? '?'}
                                </span>
                              </div>
                              <span className="text-sm font-medium">{emp.fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">
                            {formatHours(emp.totalMinutes)}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {emp.sessionCount}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {emp.projects.map((p) => (
                                <Badge key={p} variant="secondary" className="text-[10px]">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* By Project */}
            <TabsContent value="projects">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{report.byProject.length} projects</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadProjectCsv(report)}
                  disabled={report.byProject.length === 0}
                >
                  <Download className="mr-1.5 size-3.5" />
                  CSV
                </Button>
              </div>
              {report.byProject.length === 0 ? (
                <EmptyState message="No project data for this period." />
              ) : (
                <div className="rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[240px]">Project</TableHead>
                        <TableHead className="w-[100px]">Hours</TableHead>
                        <TableHead className="w-[90px]">Sessions</TableHead>
                        <TableHead>Contributors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.byProject.map((proj) => (
                        <TableRow key={proj.projectId ?? proj.projectName}>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Briefcase className="size-3.5 shrink-0 text-muted-foreground" />
                              {proj.projectName}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">
                            {formatHours(proj.totalMinutes)}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {proj.sessionCount}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {proj.contributors.map((c) => (
                                <Badge key={c} variant="secondary" className="text-[10px]">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Assigned vs Done */}
            <TabsContent value="assigned">
              <p className="mb-3 text-sm text-muted-foreground">
                Comparing active project assignments to actual work logged
              </p>
              {avd.length === 0 ? (
                <EmptyState message="No assignment or session data for this period." />
              ) : (
                <div className="space-y-4">
                  {avd.map((entry) => (
                    <div
                      key={entry.profileId}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-xs font-semibold text-primary">
                            {entry.fullName[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold">{entry.fullName}</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Assigned */}
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Assigned To
                          </p>
                          {entry.assignedProjects.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60">No assignments</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {entry.assignedProjects.map((p) => {
                                const worked = entry.workedProjects.find((w) => w.id === p.id);
                                return (
                                  <Badge
                                    key={p.id}
                                    variant={worked ? 'default' : 'outline'}
                                    className={
                                      worked
                                        ? 'gap-1 text-[10px]'
                                        : 'gap-1 border-amber-500/30 text-[10px] text-amber-600'
                                    }
                                  >
                                    {p.name}
                                    {worked ? (
                                      <span className="opacity-70">
                                        {formatHours(worked.minutes)}
                                      </span>
                                    ) : (
                                      <AlertTriangle className="size-2.5" />
                                    )}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Actually worked */}
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Actually Worked On
                          </p>
                          {entry.workedProjects.length === 0 &&
                          entry.unassignedWork.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60">No sessions logged</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {entry.workedProjects.map((w) => (
                                <Badge key={w.id} variant="secondary" className="gap-1 text-[10px]">
                                  {w.name}
                                  <span className="opacity-70">{formatHours(w.minutes)}</span>
                                </Badge>
                              ))}
                              {entry.unassignedWork.map((u) => (
                                <Badge
                                  key={u.name}
                                  variant="outline"
                                  className="gap-1 border-blue-500/30 text-[10px] text-blue-600"
                                >
                                  {u.name}
                                  <span className="opacity-70">{formatHours(u.minutes)}</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Check-in Insights */}
            <TabsContent value="checkins">
              {!checkinData || checkinData.totalCheckins === 0 ? (
                <EmptyState message="No check-in data for this period." />
              ) : (
                <div className="space-y-6">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Check-ins
                        </CardTitle>
                        <CheckCircle2 className="size-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold tabular-nums">
                          {checkinData.totalCheckins}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Avg Energy
                        </CardTitle>
                        <Zap className="size-4 text-amber-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold tabular-nums">
                          {checkinData.avgEnergyOverall != null
                            ? `${checkinData.avgEnergyOverall}/5`
                            : '—'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Avg Mood
                        </CardTitle>
                        <Heart className="size-4 text-rose-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold tabular-nums">
                          {checkinData.avgMoodOverall != null
                            ? `${checkinData.avgMoodOverall}/5`
                            : '—'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Per-employee table */}
                  <div className="rounded-xl border border-border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[200px]">Employee</TableHead>
                          <TableHead className="w-[90px]">Days</TableHead>
                          <TableHead className="w-[100px]">Avg Energy</TableHead>
                          <TableHead className="w-[100px]">Avg Mood</TableHead>
                          <TableHead className="w-[90px]">Blockers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checkinData.byEmployee.map((emp) => (
                          <TableRow key={emp.profileId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                                  <span className="text-[10px] font-semibold text-primary">
                                    {emp.fullName[0]?.toUpperCase() ?? '?'}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">{emp.fullName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {emp.checkinDays}
                            </TableCell>
                            <TableCell>
                              {emp.avgEnergy != null ? (
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-amber-500"
                                    style={{ width: `${(emp.avgEnergy / 5) * 60}px` }}
                                  />
                                  <span className="text-sm tabular-nums">{emp.avgEnergy}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {emp.avgMood != null ? (
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-rose-500"
                                    style={{ width: `${(emp.avgMood / 5) * 60}px` }}
                                  />
                                  <span className="text-sm tabular-nums">{emp.avgMood}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {emp.blockerCount > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/30 text-[10px] text-amber-600"
                                >
                                  {emp.blockerCount}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">0</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Top Blockers */}
                  {checkinData.topBlockers.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        Most Reported Blockers
                      </h3>
                      <div className="space-y-2">
                        {checkinData.topBlockers.map((blocker, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3"
                          >
                            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                            <span className="text-sm text-foreground">{blocker}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Task Stats */}
            <TabsContent value="tasks">
              {!taskData ? (
                <EmptyState message="No task data for this period." />
              ) : (
                <div className="space-y-6">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Created
                        </CardTitle>
                        <ListTodo className="size-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold tabular-nums">{taskData.created}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Completed
                        </CardTitle>
                        <CheckCircle2 className="size-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold tabular-nums">{taskData.completed}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Overdue
                        </CardTitle>
                        <AlertTriangle className="size-4 text-destructive" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold tabular-nums text-destructive">
                          {taskData.overdue}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Avg Completion
                        </CardTitle>
                        <TrendingUp className="size-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold tabular-nums">
                          {taskData.avgCompletionDays != null
                            ? `${taskData.avgCompletionDays}d`
                            : '—'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Per-employee breakdown */}
                  {taskData.byEmployee.length === 0 ? (
                    <EmptyState message="No assigned tasks for this period." />
                  ) : (
                    <div className="rounded-xl border border-border bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[200px]">Employee</TableHead>
                            <TableHead className="w-[100px]">Created</TableHead>
                            <TableHead className="w-[100px]">Completed</TableHead>
                            <TableHead className="w-[100px]">Overdue</TableHead>
                            <TableHead className="w-[120px]">Completion %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taskData.byEmployee.map((emp) => {
                            const rate =
                              emp.created > 0
                                ? Math.round((emp.completed / emp.created) * 100)
                                : null;
                            return (
                              <TableRow key={emp.profileId}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                                      <span className="text-[10px] font-semibold text-primary">
                                        {emp.fullName[0]?.toUpperCase() ?? '?'}
                                      </span>
                                    </div>
                                    <span className="text-sm font-medium">{emp.fullName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm tabular-nums">
                                  {emp.created}
                                </TableCell>
                                <TableCell className="text-sm tabular-nums text-green-600">
                                  {emp.completed}
                                </TableCell>
                                <TableCell>
                                  {emp.overdue > 0 ? (
                                    <span className="text-sm font-medium tabular-nums text-destructive">
                                      {emp.overdue}
                                    </span>
                                  ) : (
                                    <span className="text-sm tabular-nums text-muted-foreground/50">
                                      0
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {rate != null ? (
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            rate >= 80
                                              ? 'bg-green-500'
                                              : rate >= 50
                                                ? 'bg-amber-500'
                                                : 'bg-destructive'
                                          }`}
                                          style={{ width: `${Math.min(rate, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-sm tabular-nums">{rate}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/50">—</span>
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
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
      <Clock className="mb-3 size-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
