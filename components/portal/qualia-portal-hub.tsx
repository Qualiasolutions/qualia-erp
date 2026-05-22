'use client';

import { memo, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  FolderOpen,
  MessageSquare,
  FileText,
  Video,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { hueFromId, clientAccent } from '@/lib/color-constants';
import { formatEURCompact } from '@/lib/currency';
import { NewMeetingModalControlled } from '@/components/new-meeting-modal';
import { EmptyState } from '@/components/ui/empty-state';

/* ======================================================================
   Types
   ====================================================================== */

interface HubStats {
  projectCount: number;
  pendingRequests: number;
  unpaidInvoiceCount: number;
  unpaidTotal: number;
}

interface HubProject {
  id: string;
  name: string;
  status: string;
  project_type: string;
  description?: string;
  progress: number;
  totalPhases: number;
  completedPhases: number;
  currentPhase?: string;
}

interface HubMeeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  projectName: string | null;
  clientName: string | null;
}

export interface QualiaPortalHubProps {
  stats: HubStats | null;
  projects: HubProject[];
  recentActivity: Array<{
    id: string;
    action_type: string;
    action_data: Record<string, unknown>;
    created_at: string;
    project: { id: string; name: string } | null;
  }>;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  clientId: string;
  displayName: string;
  companyName?: string;
  enabledApps?: string[];
  upcomingMeetings?: HubMeeting[];
}

/* ======================================================================
   Helpers
   ====================================================================== */

const STATUS_META: Record<string, { label: string; tone: string }> = {
  Active: { label: 'Active', tone: 'bg-emerald-500' },
  Delayed: { label: 'Delayed', tone: 'bg-amber-500' },
  Launched: { label: 'Launched', tone: 'bg-primary' },
  Done: { label: 'Done', tone: 'bg-muted-foreground' },
};

function getStatusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, tone: 'bg-muted-foreground' };
}

function getGreeting(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 20) return 'Good evening';
  return 'Still up';
}

function progressPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const percent = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function appEnabled(enabledApps: string[] | undefined, appKey: string): boolean {
  return !enabledApps || enabledApps.includes(appKey);
}

function metricGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-2 md:grid-cols-3';
  return 'grid-cols-2 md:grid-cols-4';
}

/* ======================================================================
   QualiaPortalHub — calm client cockpit
   ====================================================================== */

export function QualiaPortalHub({
  stats,
  projects,
  isLoading,
  isError,
  onRetry,
  clientId,
  displayName,
  companyName,
  enabledApps,
  upcomingMeetings = [],
}: QualiaPortalHubProps) {
  const hue = useMemo(() => hueFromId(clientId), [clientId]);
  const accentColor = useMemo(() => clientAccent(hue), [hue]);
  const accentSoft = useMemo(() => clientAccent(hue, 60, 0.08), [hue]);
  const firstName = displayName.split(' ')[0] ?? displayName;
  const clientName = companyName ?? displayName ?? 'Client';

  const greeting = useMemo(() => getGreeting(new Date().getHours()), []);
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(new Date()),
    []
  );
  const projectSummary = isLoading
    ? 'Loading workspace'
    : `${stats?.projectCount ?? 0} active ${(stats?.projectCount ?? 0) === 1 ? 'project' : 'projects'}`;
  const canUseRequests = appEnabled(enabledApps, 'requests');
  const canUseBilling = appEnabled(enabledApps, 'billing');
  const toolLabels = [
    canUseRequests ? 'requests' : null,
    canUseBilling ? 'billing' : null,
    'meetings',
  ].filter(Boolean);
  const metrics = [
    {
      label: 'Active projects',
      value: stats?.projectCount ?? (isLoading ? '—' : 0),
      hint: !isLoading && (stats?.projectCount ?? 0) === 0 ? 'no active work' : undefined,
    },
    ...(canUseRequests
      ? [
          {
            label: 'Open requests',
            value: stats?.pendingRequests ?? (isLoading ? '—' : 0),
            hint: !isLoading && (stats?.pendingRequests ?? 0) === 0 ? 'inbox zero' : undefined,
          },
        ]
      : []),
    ...(canUseBilling
      ? [
          {
            label: 'Unpaid invoices',
            value: stats?.unpaidInvoiceCount ?? (isLoading ? '—' : 0),
            hint: !isLoading && (stats?.unpaidInvoiceCount ?? 0) === 0 ? 'all clear' : undefined,
          },
          {
            label: 'Outstanding',
            value: isLoading
              ? '—'
              : stats?.unpaidTotal
                ? formatEURCompact(stats.unpaidTotal)
                : '€0',
            hint: !isLoading && !stats?.unpaidTotal ? 'nothing due' : undefined,
            emphasized: !!stats?.unpaidTotal,
          },
        ]
      : []),
  ];

  // Clients have no /messages route — staff messaging is internal only,
  // and clients reach the conversation via the floating ClientChatWidget
  // mounted in (portal)/layout.tsx. The hub's ThreadCard routes them to
  // /requests, the unified surface for raising work.
  const threadDestination = '/requests';
  const threadAppLabel = 'request';

  if (isError) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Could not load your hub</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col"
      style={
        {
          '--client-accent': accentColor,
          '--client-accent-soft': accentSoft,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="relative border-b border-border bg-card px-[clamp(1rem,4vw,2rem)] py-4 md:px-[clamp(1.5rem,4vw,2.5rem)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ background: accentColor }}
                aria-hidden
              />
              <span>{todayLabel}</span>
              <span aria-hidden>·</span>
              <span>
                {greeting}, <span className="text-foreground">{firstName}</span>
              </span>
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold leading-tight tracking-tight text-foreground md:text-2xl">
              {clientName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:justify-end">
            <span
              className="rounded-md px-2 py-1 font-medium"
              style={{ background: accentSoft, color: accentColor }}
            >
              {projectSummary}
            </span>
            <span className="rounded-md bg-muted/60 px-2 py-1">{toolLabels.join(', ')}</span>
          </div>
        </div>
      </header>

      {/* Stat strip — flat and separator-divided for a dense cockpit read. */}
      <section className="relative border-b border-border bg-card">
        <div className={cn('grid divide-x divide-border/70', metricGridClass(metrics.length))}>
          {metrics.map((metric) => (
            <PulseMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
              emphasized={metric.emphasized}
            />
          ))}
        </div>
      </section>

      {/* Body */}
      <div className="relative px-[clamp(1.25rem,4vw,2rem)] pb-12 pt-6">
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[2fr_1fr]">
          <EngagementsSection projects={projects} accentColor={accentColor} isLoading={isLoading} />
          <aside className="flex flex-col gap-6">
            <MeetingsSidebar meetings={upcomingMeetings} accentColor={accentColor} />
            {canUseBilling ? (
              <InvoicesSidebar
                unpaidCount={stats?.unpaidInvoiceCount ?? 0}
                unpaidTotal={stats?.unpaidTotal ?? 0}
              />
            ) : null}
            {canUseRequests ? (
              <ThreadCard
                destination={threadDestination}
                appLabel={threadAppLabel}
                accentColor={accentColor}
              />
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   PulseMetric — flat tile, no border, separator-driven
   ====================================================================== */

function PulseMetric({
  label,
  value,
  hint,
  emphasized = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  emphasized?: boolean;
}) {
  return (
    <div className="px-[clamp(1.25rem,3vw,2rem)] py-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-2 text-[26px] font-semibold tabular-nums leading-none tracking-tight',
          emphasized ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground/70">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/* ======================================================================
   EngagementsSection
   ====================================================================== */

const EngagementsSection = memo(function EngagementsSection({
  projects,
  accentColor,
  isLoading,
}: {
  projects: HubProject[];
  accentColor: string;
  isLoading: boolean;
}) {
  const heading = (
    <div className="mb-1 flex items-center gap-2">
      <span className="inline-block h-px w-6" style={{ background: accentColor }} aria-hidden />
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        Engagements
      </span>
    </div>
  );

  if (isLoading && projects.length === 0) {
    return (
      <section>
        {heading}
        <h2 className="text-lg font-semibold tracking-tight">Currently building</h2>
        <div className="mt-6 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section>
        {heading}
        <h2 className="text-lg font-semibold tracking-tight">Currently building</h2>
        <EmptyState
          icon={FolderOpen}
          title="No active projects yet"
          description="Your next engagement will appear here."
          className="mt-6"
        />
      </section>
    );
  }

  return (
    <section>
      {heading}
      <h2 className="text-lg font-semibold tracking-tight">Currently building</h2>
      <ul className="mt-6 flex flex-col divide-y divide-border/70">
        {projects.map((project, i) => (
          <EngagementRow key={project.id} project={project} index={i} accentColor={accentColor} />
        ))}
      </ul>
    </section>
  );
});

const EngagementRow = memo(function EngagementRow({
  project,
  index,
  accentColor,
}: {
  project: HubProject;
  index: number;
  accentColor: string;
}) {
  const status = getStatusMeta(project.status);
  const pct = progressPercent(project.progress);
  const phaseText = project.currentPhase
    ? `${project.currentPhase} · ${project.completedPhases}/${project.totalPhases} phases`
    : `${project.completedPhases}/${project.totalPhases} phases`;

  return (
    <li>
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          'group relative -mx-3 block cursor-pointer rounded-xl px-3 py-5 transition-colors duration-200',
          'hover:bg-card/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
        )}
      >
        <div className="flex items-baseline justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                Engagement No.{String(index + 1).padStart(2, '0')}
              </span>
              <span className={cn('size-1.5 rounded-full', status.tone)} aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {status.label}
              </span>
            </div>
            <div className="text-base font-semibold leading-snug tracking-tight text-foreground">
              {project.name}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{phaseText}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div
              className="font-mono text-[30px] font-light tabular-nums leading-none tracking-tight"
              style={{ color: accentColor }}
            >
              {pct}
              <span className="text-base">%</span>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.08em]',
                'transition-transform duration-200 motion-safe:group-hover:translate-x-1'
              )}
              style={{ color: accentColor }}
              aria-hidden
            >
              Open <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
        <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-premium"
            style={{
              width: `${pct}%`,
              background: accentColor,
            }}
          />
        </div>
      </Link>
    </li>
  );
});

/* ======================================================================
   MeetingsSidebar
   ====================================================================== */

const MEETING_DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatMeetingDate(value: string) {
  return MEETING_DATE_FMT.format(new Date(value));
}

function MeetingsSidebar({
  meetings,
  accentColor,
}: {
  meetings: HubMeeting[];
  accentColor: string;
}) {
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-px w-6 bg-border" aria-hidden />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Meetings
        </span>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: accentColor }}
            aria-hidden
          >
            <CalendarClock className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Book a meeting</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pick a time for a project call and keep upcoming sessions in one place.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMeetingModalOpen(true)}
          className={cn(
            'mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg',
            'text-sm font-medium text-white shadow-sm transition-all duration-150',
            'hover:translate-y-[-1px] hover:shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
          )}
          style={{ background: accentColor }}
        >
          <CalendarPlus className="size-4" aria-hidden />
          Book a meeting
        </button>

        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Upcoming
          </div>
          {meetings.length > 0 ? (
            <ul className="space-y-3">
              {meetings.map((meeting) => (
                <li key={meeting.id} className="rounded-lg bg-muted/35 p-3">
                  <div className="text-sm font-medium leading-snug text-foreground">
                    {meeting.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatMeetingDate(meeting.start_time)}
                  </div>
                  {meeting.projectName ? (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {meeting.projectName}
                    </div>
                  ) : null}
                  {meeting.meeting_link ? (
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <Video className="size-3" aria-hidden />
                      Join call
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="No upcoming meetings"
              description="Book a time above to get started."
              compact
              minimal
              className="py-2"
            />
          )}
        </div>
      </div>
      <NewMeetingModalControlled open={meetingModalOpen} onOpenChange={setMeetingModalOpen} />
    </section>
  );
}

/* ======================================================================
   InvoicesSidebar
   ====================================================================== */

function InvoicesSidebar({
  unpaidCount,
  unpaidTotal,
}: {
  unpaidCount: number;
  unpaidTotal: number;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-px w-6 bg-border" aria-hidden />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Recent invoices
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">
              {unpaidCount > 0 ? `${unpaidCount} unpaid` : 'All paid'}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {unpaidCount > 0
                ? `${formatEURCompact(unpaidTotal)} outstanding`
                : 'Nothing outstanding'}
            </div>
          </div>
          <Link
            href="/billing"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-4 hover:underline"
          >
            <FileText className="size-3" aria-hidden /> View all
          </Link>
        </div>
        <div className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em]">Billing</span>
          <span>·</span>
          <span>Invoices, payments and history</span>
        </div>
      </div>
    </section>
  );
}

/* ======================================================================
   ThreadCard
   ====================================================================== */

function ThreadCard({
  destination,
  appLabel,
  accentColor,
}: {
  destination: string;
  appLabel: string;
  accentColor: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-px w-6 bg-border" aria-hidden />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Open a {appLabel}
        </span>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Questions, feedback, a new idea? Drop a note — we typically reply within the hour.
        </p>
        <Link
          href={destination}
          className={cn(
            'mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg',
            'text-sm font-medium text-white shadow-sm transition-all duration-150',
            'hover:translate-y-[-1px] hover:shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
          )}
          style={{ background: accentColor }}
        >
          <MessageSquare className="size-4" aria-hidden />
          Start a conversation
        </Link>
      </div>
    </section>
  );
}
