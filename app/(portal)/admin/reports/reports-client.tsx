'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, startOfMonth, subMonths } from 'date-fns';
import {
  CalendarIcon,
  Clock,
  Users,
  Briefcase,
  TrendingUp,
  Download,
  Loader2,
  ChevronRight,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import {
  getReportData,
  getEmployeeSessionDetail,
  type ReportSummary,
  type EmployeeSessionDetail,
} from '@/app/actions/reports';
import type { DateRange } from 'react-day-picker';
import { FrameworkReportsTab } from './framework-reports-tab';
import { AIPromptsTab } from './ai-prompts-tab';

type ReportTab = 'employees' | 'framework' | 'ai-prompts';

const TABS: Array<{ id: ReportTab; label: string; desc: string }> = [
  { id: 'employees', label: 'Hours', desc: 'Team hours logged per employee' },
  { id: 'framework', label: 'Framework Reports', desc: 'Qualia framework session reports' },
  { id: 'ai-prompts', label: 'AI Prompts', desc: 'What employees ask the Qualia AI assistant' },
];

// Tracking starts from May 2026 — anything earlier is excluded from totals.
const TRACKING_START = new Date(2026, 4, 1); // May 1, 2026

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

const tabBase =
  'relative whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2';
const tabActive = 'border-primary text-primary';
const tabInactive = 'border-transparent text-muted-foreground hover:text-foreground';

function downloadBlob(csv: string, prefix: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminReportsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as ReportTab | null;
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportSummary | null>(null);
  // Default: from May 1 2026 (tracking start) → today.
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: TRACKING_START,
    to: new Date(),
  });
  const [tab, setTab] = useState<ReportTab>(
    initialTab && TABS.some((t) => t.id === initialTab) ? initialTab : 'employees'
  );

  // Drill-down state
  const [drillProfileId, setDrillProfileId] = useState<string | null>(null);
  const [drillDetail, setDrillDetail] = useState<EmployeeSessionDetail | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    getCurrentWorkspaceId().then(setWorkspaceId);
  }, []);

  const fetchData = useCallback(async () => {
    if (!workspaceId || !dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    // Clamp the start to TRACKING_START — never aggregate older data.
    const effectiveFrom = dateRange.from < TRACKING_START ? TRACKING_START : dateRange.from;
    const start = format(effectiveFrom, 'yyyy-MM-dd');
    const end = format(dateRange.to, 'yyyy-MM-dd');
    const reportData = await getReportData(workspaceId, start, end);
    setReport(reportData);
    setLoading(false);
  }, [workspaceId, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPreset = (preset: 'since-may' | 'this-month' | 'last-month') => {
    const today = new Date();
    switch (preset) {
      case 'since-may':
        setDateRange({ from: TRACKING_START, to: today });
        break;
      case 'this-month': {
        const from = startOfMonth(today);
        setDateRange({ from: from < TRACKING_START ? TRACKING_START : from, to: today });
        break;
      }
      case 'last-month': {
        const prev = subMonths(today, 1);
        const from = startOfMonth(prev);
        const to = new Date(prev.getFullYear(), prev.getMonth() + 1, 0);
        if (to < TRACKING_START) {
          setDateRange({ from: TRACKING_START, to: today });
          break;
        }
        setDateRange({
          from: from < TRACKING_START ? TRACKING_START : from,
          to,
        });
        break;
      }
    }
  };

  const changeTab = useCallback(
    (next: ReportTab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      router.replace(`/admin/reports?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const activeTabMeta = TABS.find((t) => t.id === tab) ?? TABS[0];

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = TABS.findIndex((t) => t.id === tab);
      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = TABS.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextTab = TABS[nextIndex];
        changeTab(nextTab.id);
        document.getElementById(`report-tab-${nextTab.id}`)?.focus();
      }
    },
    [tab, changeTab]
  );

  const openDrillDown = useCallback(
    async (profileId: string) => {
      if (!workspaceId || !dateRange?.from || !dateRange?.to) return;
      setDrillProfileId(profileId);
      setDrillDetail(null);
      setDrillLoading(true);
      const effectiveFrom = dateRange.from < TRACKING_START ? TRACKING_START : dateRange.from;
      const start = format(effectiveFrom, 'yyyy-MM-dd');
      const end = format(dateRange.to, 'yyyy-MM-dd');
      const detail = await getEmployeeSessionDetail(workspaceId, profileId, start, end);
      setDrillDetail(detail);
      setDrillLoading(false);
    },
    [workspaceId, dateRange]
  );

  return (
    <div className="flex flex-col">
      <header className="border-b border-border bg-muted/30 px-6 pt-8 lg:px-8">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Admin console
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight">
                Reports
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{activeTabMeta.desc}</p>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPreset('since-may')}
                  >
                    Since May 2026
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPreset('this-month')}
                  >
                    This month
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPreset('last-month')}
                  >
                    Last month
                  </Button>
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  disabled={{ before: TRACKING_START, after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <nav
            role="tablist"
            aria-label="Reports tabs"
            className="mt-6 flex items-center gap-6 overflow-x-auto"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`report-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`report-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => changeTab(t.id)}
                onKeyDown={handleTabKeyDown}
                className={cn(tabBase, tab === t.id ? tabActive : tabInactive)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div
        role="tabpanel"
        id={`report-panel-${tab}`}
        aria-labelledby={`report-tab-${tab}`}
        className="w-full p-6 lg:p-8"
      >
        {tab === 'framework' ? (
          <FrameworkReportsTab focusId={searchParams.get('id')} />
        ) : tab === 'ai-prompts' ? (
          <AIPromptsTab fromDate={dateRange?.from} toDate={dateRange?.to} />
        ) : loading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !report ? (
          <EmptyState message="No data available." />
        ) : (
          <div>
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Total Hours"
                value={`${report.totalHours}h`}
                icon={<Clock className="size-4 text-muted-foreground" />}
              />
              <StatCard
                label="Sessions"
                value={report.totalSessions}
                icon={<Briefcase className="size-4 text-muted-foreground" />}
              />
              <StatCard
                label="Team Members"
                value={report.activeMembers}
                icon={<Users className="size-4 text-muted-foreground" />}
              />
              <StatCard
                label="Avg/Day"
                value={`${report.avgHoursPerDay}h`}
                icon={<TrendingUp className="size-4 text-muted-foreground" />}
              />
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{report.byEmployee.length} employees</p>
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
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byEmployee.map((emp) => (
                      <TableRow
                        key={emp.profileId}
                        className="cursor-pointer"
                        onClick={() => openDrillDown(emp.profileId)}
                      >
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
                        <TableCell>
                          <ChevronRight className="size-4 text-muted-foreground/60" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet
        open={drillProfileId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDrillProfileId(null);
            setDrillDetail(null);
          }
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="text-base font-semibold">
              {drillDetail?.fullName ?? 'Sessions'}
            </SheetTitle>
            {drillDetail && (
              <p className="text-xs text-muted-foreground">
                {drillDetail.sessions.length} sessions · {formatHours(drillDetail.totalMinutes)} ·{' '}
                {dateRange?.from
                  ? format(
                      dateRange.from < TRACKING_START ? TRACKING_START : dateRange.from,
                      'MMM d'
                    )
                  : ''}{' '}
                – {dateRange?.to ? format(dateRange.to, 'MMM d, yyyy') : ''}
              </p>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-auto">
            {drillLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : !drillDetail || drillDetail.sessions.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No sessions in this range.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {drillDetail.sessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SessionRow({
  session,
}: {
  session: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    durationMinutes: number;
    projectName: string;
    summary: string | null;
  };
}) {
  const start = new Date(session.startedAt);
  const end = session.endedAt ? new Date(session.endedAt) : null;
  return (
    <li className="px-6 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{session.projectName}</span>
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            {format(start, 'EEE MMM d, yyyy')} · {format(start, 'HH:mm')}
            {end ? ` – ${format(end, 'HH:mm')}` : ''}
          </div>
          {session.summary && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{session.summary}</p>
          )}
        </div>
        <div className="shrink-0 text-sm font-medium tabular-nums">
          {formatHours(session.durationMinutes)}
        </div>
      </div>
    </li>
  );
}

function StatCard({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div
        className={cn(
          'mt-2 text-[26px] font-semibold tabular-nums leading-none tracking-tight text-foreground',
          valueClassName
        )}
      >
        {value}
      </div>
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
