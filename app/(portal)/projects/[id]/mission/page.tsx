import Link from 'next/link';
import type { ComponentType } from 'react';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  GitBranch,
  Gauge,
  Rocket,
  ShieldCheck,
  Terminal,
  UserRound,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { getProjectMission, type ProjectWorkPacket } from '@/app/actions/work-packets';
import { getPortalAuthUser } from '@/lib/portal-cache';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WorkPacketCommand } from '@/components/portal/work-packet-command';

interface PageProps {
  params: Promise<{ id: string }>;
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return 'Not set';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(value: string): number {
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
  const due = new Date(`${value}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function deadlineState(packet: ProjectWorkPacket | null) {
  if (!packet) {
    return {
      label: 'No work packet',
      detail: 'Assign an employee to create a delivery mission.',
      className: 'border-muted bg-muted/40 text-muted-foreground',
      icon: AlertTriangle,
    };
  }
  if (packet.status === 'review_requested') {
    return {
      label: 'Waiting for review',
      detail: `Deadline ${dateLabel(packet.deadline_date)}`,
      className: 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300',
      icon: ShieldCheck,
    };
  }
  const days = daysUntil(packet.deadline_date);
  if (days < 0) {
    return {
      label: 'Overdue',
      detail: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} late`,
      className: 'border-destructive/30 bg-destructive/10 text-destructive',
      icon: AlertTriangle,
    };
  }
  if (days === 0) {
    return {
      label: 'Due today',
      detail: 'Finish and submit today.',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
      icon: CalendarClock,
    };
  }
  return {
    label: `Due ${dateLabel(packet.deadline_date)}`,
    detail: `${days} day${days === 1 ? '' : 's'} left`,
    className:
      days <= 3
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300'
        : 'border-primary/20 bg-primary/[0.06] text-primary',
    icon: CalendarClock,
  };
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return 'Missing';
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function StatBlock({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'success' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        tone === 'danger' && 'border-destructive/25 bg-destructive/10',
        tone === 'warning' && 'border-amber-500/25 bg-amber-500/10',
        tone === 'success' && 'border-emerald-500/25 bg-emerald-500/10'
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default async function ProjectMissionPage({ params }: PageProps) {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');

  const { id } = await params;
  const result = await getProjectMission(id);
  if (!result.success || !result.data) notFound();

  const { project, packets, latestReport, currentPhase } = result.data;
  const primaryPacket = packets[0] ?? null;
  const frameworkPullCommand = `qualia-framework work-packet pull --project ${project.id}`;
  const nextCommand = primaryPacket?.next_command ?? '/qualia';
  const deadline = deadlineState(primaryPacket);
  const DeadlineIcon = deadline.icon;
  const verificationPassed =
    primaryPacket?.verification === 'pass' || latestReport?.verification === 'pass';
  const verificationFailed =
    primaryPacket?.verification === 'fail' || latestReport?.verification === 'fail';

  return (
    <main className="min-h-full bg-background">
      <header className="border-b border-border bg-card/70 px-5 py-4 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button asChild variant="outline" size="icon-sm" className="mt-0.5">
              <Link href={`/projects/${project.id}`} aria-label="Back to project">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Employee mission
              </div>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">
                {project.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.client?.name ?? 'No client'} · ERP deadline and Framework proof in one
                place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${project.id}/roadmap`}>
                <Gauge className="size-4" />
                Roadmap
              </Link>
            </Button>
            {primaryPacket?.repo_url ? (
              <Button asChild variant="outline" size="sm">
                <a href={primaryPacket.repo_url} target="_blank" rel="noopener noreferrer">
                  <GitBranch className="size-4" />
                  Repo
                </a>
              </Button>
            ) : null}
            {primaryPacket?.vercel_url ? (
              <Button asChild size="sm">
                <a href={primaryPacket.vercel_url} target="_blank" rel="noopener noreferrer">
                  <Rocket className="size-4" />
                  Deploy
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="space-y-5">
          <div className={cn('rounded-lg border p-5', deadline.className)}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="border-current/20 flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background/55">
                  <DeadlineIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-wider opacity-80">
                    Delivery commitment
                  </div>
                  <div className="mt-1 text-xl font-semibold tracking-tight">{deadline.label}</div>
                  <div className="text-sm opacity-85">{deadline.detail}</div>
                </div>
              </div>
              <div className="min-w-0 md:w-[320px]">
                <WorkPacketCommand command={nextCommand} label="Next command" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StatBlock
              icon={UserRound}
              label="Employee"
              value={primaryPacket?.employee?.full_name ?? 'Unassigned'}
              tone={primaryPacket?.employee_id ? 'default' : 'warning'}
            />
            <StatBlock
              icon={ShieldCheck}
              label="Verification"
              value={primaryPacket?.verification ?? latestReport?.verification ?? 'Pending'}
              tone={verificationFailed ? 'danger' : verificationPassed ? 'success' : 'default'}
            />
            <StatBlock
              icon={ExternalLink}
              label="Latest report"
              value={relativeTime(primaryPacket?.last_report_at ?? latestReport?.submitted_at)}
              tone={
                primaryPacket?.last_report_at || latestReport?.submitted_at ? 'default' : 'warning'
              }
            />
          </div>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold tracking-tight">Start Framework</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pull the ERP mission into the repo before building or verifying.
              </p>
            </div>
            <div className="grid gap-3 p-5">
              <WorkPacketCommand command={frameworkPullCommand} label="1. Pull ERP packet" />
              <WorkPacketCommand command={nextCommand} label="2. Work command" />
              <div className="grid gap-3 md:grid-cols-2">
                <WorkPacketCommand command="/qualia-report" label="Session proof" />
                <WorkPacketCommand
                  command="qualia-framework project-snapshot --upload"
                  label="Project proof"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight">Definition of done</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The employee should meet this before asking for owner review.
              </p>
            </div>
            <div className="px-5 py-4 text-sm leading-6 text-foreground">
              {primaryPacket?.definition_of_done ??
                'Assign an employee to generate the delivery definition for this project.'}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight">Framework proof</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Reports are shift evidence. Completion still needs owner review.
              </p>
            </div>
            <div className="grid gap-0 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="p-5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Current phase
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {primaryPacket?.current_phase_name ?? currentPhase?.name ?? 'No phase synced'}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {primaryPacket?.current_milestone_name ??
                    (currentPhase?.milestone_number
                      ? `Milestone ${currentPhase.milestone_number}`
                      : null) ??
                    'Sync GitHub planning or upload a snapshot.'}
                </p>
              </div>
              <div className="p-5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Latest snapshot
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {relativeTime(primaryPacket?.snapshot_generated_at)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use `qualia-framework project-snapshot --upload` after meaningful progress.
                </p>
              </div>
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold tracking-tight">Active packets</h2>
            </div>
            <div className="divide-y divide-border">
              {packets.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No work packet yet. Assign an employee to create the mission.
                </div>
              ) : (
                packets.map((packet) => (
                  <div key={packet.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {packet.employee?.full_name ?? 'Unassigned'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Due {dateLabel(packet.deadline_date)}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {packet.status.replace('_', ' ')}
                      </span>
                    </div>
                    <WorkPacketCommand command={packet.next_command} />
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold tracking-tight">Latest report</h2>
            </div>
            {latestReport ? (
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{latestReport.status ?? 'unknown'}</span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(latestReport.submitted_at)}
                  </span>
                </div>
                {latestReport.tasks_total ? (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.round(((latestReport.tasks_done ?? 0) / latestReport.tasks_total) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null}
                {latestReport.notes ? (
                  <p className="line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                    {latestReport.notes}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                No `/qualia-report` has landed for this project yet.
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
