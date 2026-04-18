'use client';

import { useEffect, useState, useTransition } from 'react';
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
import {
  getSessionReportsForProject,
  type ProjectSessionReport,
} from '@/app/actions/work-sessions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectReportsPanelProps {
  projectName: string;
  className?: string;
}

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

export function ProjectReportsPanel({ projectName, className }: ProjectReportsPanelProps) {
  const [reports, setReports] = useState<ProjectSessionReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const data = await getSessionReportsForProject(projectName, 20);
      setReports(data);
      setLoaded(true);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName]);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div>
          <div className="text-[12px] font-semibold">Session Reports</div>
          <div className="text-[10px] text-muted-foreground">
            From <code className="font-mono text-[10px]">/qualia-report</code>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={load}
          disabled={isPending}
          aria-label="Refresh reports"
        >
          <RefreshCw className={cn('size-3.5', isPending && 'animate-spin')} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!loaded && isPending ? (
          <div className="flex items-center gap-2 p-4 text-[12px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="p-4 text-[12px] text-muted-foreground">
            No session reports yet. Reports are posted automatically by{' '}
            <code className="font-mono text-[11px]">/qualia-report</code>.
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {reports.map((r) => {
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
                  : null;
              const phaseLabel = r.phase_name
                ? r.total_phases
                  ? `Phase ${r.phase ?? '?'}/${r.total_phases} — ${r.phase_name}`
                  : `Phase ${r.phase ?? '?'} — ${r.phase_name}`
                : r.phase
                  ? `Phase ${r.phase}${r.total_phases ? `/${r.total_phases}` : ''}`
                  : null;

              return (
                <li key={r.id} className="space-y-1.5 px-4 py-3 text-[12px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <StatusIcon status={r.status} />
                      <span className="truncate font-medium">{r.status ?? 'unknown'}</span>
                      {r.verification && r.verification !== 'pending' && (
                        <span
                          className={cn(
                            'shrink-0 rounded px-1 py-px text-[10px] font-medium',
                            r.verification === 'pass'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-destructive/10 text-destructive'
                          )}
                        >
                          verif:{r.verification}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {r.submitted_at
                        ? formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })
                        : '—'}
                    </span>
                  </div>

                  {milestoneLabel && (
                    <div className="truncate text-[11px] text-foreground/80">{milestoneLabel}</div>
                  )}
                  {phaseLabel && (
                    <div className="truncate text-[11px] text-muted-foreground">{phaseLabel}</div>
                  )}

                  {progress !== null && (
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-[width]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {r.tasks_done}/{r.tasks_total} tasks
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    {r.commits && r.commits.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <GitCommit className="size-3" />
                        {r.commits.length} commit{r.commits.length === 1 ? '' : 's'}
                      </span>
                    )}
                    {typeof r.build_count === 'number' && r.build_count > 0 && (
                      <span>builds: {r.build_count}</span>
                    )}
                    {typeof r.deploy_count === 'number' && r.deploy_count > 0 && (
                      <span>deploys: {r.deploy_count}</span>
                    )}
                    {r.submitted_by && <span className="truncate">by {r.submitted_by}</span>}
                    {r.deployed_url && (
                      <a
                        href={r.deployed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" /> deploy
                      </a>
                    )}
                  </div>

                  {r.notes && (
                    <p className="line-clamp-3 whitespace-pre-wrap text-[11px] text-muted-foreground/90">
                      {r.notes}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
