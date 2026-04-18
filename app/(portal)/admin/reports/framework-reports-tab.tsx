'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  CircleDot,
  ExternalLink,
  GitCommit,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getFrameworkReports,
  getFrameworkReportsProjects,
  getFrameworkReportsStats,
  type FrameworkReportRow,
  type FrameworkReportsStats,
} from '@/app/actions/reports';
import { cn } from '@/lib/utils';

const ALL = '__all__';

function StatusIcon({ status }: { status: string | null }) {
  const s = (status ?? '').toLowerCase();
  if (s === 'shipped' || s === 'handed_off' || s === 'done') {
    return <CheckCircle2 className="size-3.5 text-emerald-500" />;
  }
  if (s === 'verified' || s === 'polished') {
    return <CircleDot className="size-3.5 text-sky-500" />;
  }
  if (s === 'fail' || s === 'blocked') {
    return <XCircle className="size-3.5 text-destructive" />;
  }
  return <Circle className="size-3.5 text-muted-foreground" />;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground/80">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function FrameworkReportsTab() {
  const [rows, setRows] = useState<FrameworkReportRow[]>([]);
  const [stats, setStats] = useState<FrameworkReportsStats | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState<string>(ALL);
  const [filterStatus, setFilterStatus] = useState<string>(ALL);
  const [filterVerification, setFilterVerification] = useState<string>(ALL);
  const [filterSubmittedBy, setFilterSubmittedBy] = useState<string>('');
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const [rowsData, statsData, projectsData] = await Promise.all([
        getFrameworkReports({
          project: filterProject === ALL ? undefined : filterProject,
          status: filterStatus === ALL ? undefined : filterStatus,
          verification: filterVerification === ALL ? undefined : filterVerification,
          submittedBy: filterSubmittedBy.trim() || undefined,
          limit: 200,
        }),
        loadedOnce ? Promise.resolve(stats) : getFrameworkReportsStats(),
        loadedOnce ? Promise.resolve(projects) : getFrameworkReportsProjects(),
      ]);
      setRows(rowsData);
      if (!loadedOnce) {
        setStats(statsData ?? null);
        setProjects(projectsData ?? []);
      }
      setLoadedOnce(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProject, filterStatus, filterVerification, filterSubmittedBy]);

  useEffect(() => {
    load();
  }, [load]);

  const statusOptions = useMemo(() => {
    const s = new Set<string>(rows.map((r) => r.status).filter(Boolean) as string[]);
    if (stats) for (const b of stats.statusBreakdown) s.add(b.status);
    return Array.from(s).sort();
  }, [rows, stats]);
  const verifOptions = useMemo(() => {
    const s = new Set<string>(rows.map((r) => r.verification).filter(Boolean) as string[]);
    if (stats) for (const b of stats.verificationBreakdown) s.add(b.verification);
    return Array.from(s).sort();
  }, [rows, stats]);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Total Reports" value={stats.totalReports} sub="last 2000" />
          <StatCard label="Last 7d" value={stats.reportsLast7d} />
          <StatCard label="Last 30d" value={stats.reportsLast30d} />
          <StatCard label="Projects" value={stats.distinctProjects} />
          <StatCard label="Commits" value={stats.totalCommits} />
          <StatCard label="Builds" value={stats.totalBuilds} />
          <StatCard label="Deploys" value={stats.totalDeploys} />
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterVerification} onValueChange={setFilterVerification}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="All verifications" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All verifications</SelectItem>
            {verifOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Submitted by…"
          value={filterSubmittedBy}
          onChange={(e) => setFilterSubmittedBy(e.target.value)}
          className="h-9 w-[200px]"
        />

        <Button variant="outline" size="sm" onClick={load} disabled={isPending} className="h-9">
          <RefreshCw className={cn('mr-1.5 size-3.5', isPending && 'animate-spin')} />
          Refresh
        </Button>

        <div className="ml-auto text-xs text-muted-foreground">
          {rows.length} result{rows.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Top projects bar */}
      {stats && stats.topProjects.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Top projects by report count
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.topProjects.map((p) => (
              <button
                key={p.project_name}
                onClick={() => setFilterProject(p.project_name)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs transition-colors hover:bg-muted/50',
                  filterProject === p.project_name && 'border-primary bg-primary/10 text-primary'
                )}
              >
                <span className="max-w-[180px] truncate">{p.project_name}</span>
                <span className="tabular-nums text-muted-foreground">{p.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reports table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]"></TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-[120px]">Report</TableHead>
              <TableHead>Milestone / Phase</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verif</TableHead>
              <TableHead>Commits</TableHead>
              <TableHead>Build/Deploy</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                  Loading reports…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  No reports match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const progress =
                  r.tasks_total && r.tasks_total > 0
                    ? Math.round(((r.tasks_done ?? 0) / r.tasks_total) * 100)
                    : null;
                const milestoneLabel = r.milestone_name
                  ? r.milestone
                    ? `M${r.milestone} · ${r.milestone_name}`
                    : r.milestone_name
                  : r.milestone
                    ? `Milestone ${r.milestone}`
                    : '—';
                const phaseLabel = r.phase_name
                  ? r.total_phases
                    ? `P${r.phase ?? '?'}/${r.total_phases} · ${r.phase_name}`
                    : `P${r.phase ?? '?'} · ${r.phase_name}`
                  : r.phase
                    ? `P${r.phase}${r.total_phases ? `/${r.total_phases}` : ''}`
                    : null;

                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <StatusIcon status={r.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.project_name}</span>
                        {r.client && (
                          <span className="text-[11px] text-muted-foreground">{r.client}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.client_report_id ? (
                        <span className="font-mono text-xs tabular-nums">{r.client_report_id}</span>
                      ) : (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground/60">
                          {r.id.substring(0, 8)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[12px]">{milestoneLabel}</span>
                        {phaseLabel && (
                          <span className="text-[11px] text-muted-foreground">{phaseLabel}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {progress !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {r.tasks_done}/{r.tasks_total}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px]">{r.status ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      {r.verification ? (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            r.verification === 'pass'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : r.verification === 'fail'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {r.verification}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.commits && r.commits.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[12px]">
                          <GitCommit className="size-3 text-muted-foreground" />
                          {r.commits.length}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {r.build_count ?? 0}/{r.deploy_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[11px]">
                          {r.submitted_at
                            ? formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })
                            : '—'}
                        </span>
                        {r.submitted_by && (
                          <span className="truncate text-[10px] text-muted-foreground">
                            {r.submitted_by}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.deployed_url && (
                        <a
                          href={r.deployed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" /> live
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
