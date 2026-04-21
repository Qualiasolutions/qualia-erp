'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, MessageSquare, FileText } from 'lucide-react';

import { cn } from '@/lib/utils';
import { hueFromId, clientAccent, clientAccentGradient } from '@/lib/color-constants';
import { formatEURCompact } from '@/lib/currency';

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
  clientId: string;
  displayName: string;
  companyName?: string;
  enabledApps?: string[];
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

/* ======================================================================
   QualiaPortalHub — luxury client home
   ====================================================================== */

export function QualiaPortalHub({
  stats,
  projects,
  isLoading,
  isError,
  clientId,
  displayName,
  companyName,
  enabledApps,
}: QualiaPortalHubProps) {
  const hue = useMemo(() => hueFromId(clientId), [clientId]);
  const gradient = useMemo(() => clientAccentGradient(hue), [hue]);
  const accentColor = useMemo(() => clientAccent(hue), [hue]);
  const firstName = displayName.split(' ')[0] ?? displayName;
  const clientName = companyName ?? displayName ?? 'Client';

  const threadDestination = enabledApps?.includes('messages')
    ? '/messages'
    : enabledApps?.includes('requests')
      ? '/requests'
      : '/messages';
  const threadAppLabel = threadDestination === '/requests' ? 'request' : 'thread';

  if (isError) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t load your hub. Try refreshing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col">
      {/* Hero */}
      <section
        className="relative overflow-hidden px-6 pb-14 pt-10 text-white md:px-10 md:pb-16 md:pt-12"
        style={{ background: gradient }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 0%, transparent 30%), radial-gradient(circle at 80% 70%, white 0%, transparent 30%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 items-end gap-8 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-white/70">
              Welcome back, {firstName}
            </div>
            <h1 className="text-[clamp(1.875rem,1.2rem+3vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
              {clientName}
            </h1>
            <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-white/75">
              Your projects, your invoices, your conversations — the full picture of what we&apos;re
              building for you.
            </p>
          </div>
        </div>
      </section>

      {/* Content panel */}
      <div className="relative -mt-6 min-h-[600px] rounded-t-[32px] bg-background px-6 pb-16 pt-12 md:px-10">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Pulse row */}
          <div className="mb-10 grid grid-cols-2 gap-6 border-b border-border pb-10 md:grid-cols-4">
            <PulseMetric
              label="Active projects"
              value={stats?.projectCount ?? (isLoading ? '—' : 0)}
            />
            <PulseMetric
              label="Open requests"
              value={stats?.pendingRequests ?? (isLoading ? '—' : 0)}
            />
            <PulseMetric
              label="Unpaid invoices"
              value={stats?.unpaidInvoiceCount ?? (isLoading ? '—' : 0)}
            />
            <PulseMetric
              label="Outstanding"
              value={
                isLoading ? '—' : stats?.unpaidTotal ? formatEURCompact(stats.unpaidTotal) : '€0'
              }
            />
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_1fr]">
            <EngagementsSection
              projects={projects}
              accentColor={accentColor}
              isLoading={isLoading}
            />
            <aside className="flex flex-col gap-8">
              <InvoicesSidebar
                unpaidCount={stats?.unpaidInvoiceCount ?? 0}
                unpaidTotal={stats?.unpaidTotal ?? 0}
              />
              <ThreadCard
                destination={threadDestination}
                appLabel={threadAppLabel}
                accentColor={accentColor}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   PulseMetric
   ====================================================================== */

function PulseMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold tabular-nums leading-none tracking-tight text-foreground">
        {value}
      </div>
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
  if (isLoading && projects.length === 0) {
    return (
      <section>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Engagements
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">Currently building</h2>
        <div className="mt-6 space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Engagements
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">Currently building</h2>
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-sm italic text-muted-foreground">
            No active projects yet. Your next engagement will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        Engagements
      </div>
      <h2 className="mt-2 text-lg font-semibold tracking-tight">Currently building</h2>
      <ul className="mt-6 flex flex-col divide-y divide-border">
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
  const pct = Math.round(project.progress * 100);
  const phaseText = project.currentPhase
    ? `${project.currentPhase} · ${project.completedPhases}/${project.totalPhases} phases`
    : `${project.completedPhases}/${project.totalPhases} phases`;

  return (
    <li>
      <Link
        href={`/projects/${project.id}/roadmap`}
        className={cn(
          'group relative block cursor-pointer py-6 transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2'
        )}
      >
        <div className="flex items-baseline justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Engagement No.{String(index + 1).padStart(2, '0')}
              </span>
              <span className={cn('size-1.5 rounded-full', status.tone)} aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                {status.label}
              </span>
            </div>
            <div className="text-base font-semibold leading-snug tracking-tight text-foreground">
              {project.name}
            </div>
            <div className="mt-1.5 text-sm text-muted-foreground">{phaseText}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div
              className="font-mono text-[34px] font-light tabular-nums leading-none tracking-tight"
              style={{ color: accentColor }}
            >
              {pct}
              <span className="text-lg">%</span>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono text-[11px] transition-transform duration-200',
                'motion-safe:group-hover:translate-x-1.5'
              )}
              style={{ color: accentColor }}
              aria-hidden
            >
              Open <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
        <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-border/30">
          <div
            className="ease-[cubic-bezier(0.16,1,0.3,1)] h-full rounded-full transition-[width] duration-700"
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
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        Recent invoices
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
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
        <div className="flex items-center gap-3 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em]">Billing</span>
          <span>·</span>
          <span>Invoices, payments and payment history</span>
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
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        Open a {appLabel}
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Questions, feedback, a new idea? Drop a note — we typically reply within the hour.
        </p>
        <Link
          href={destination}
          className={cn(
            'mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg',
            'text-sm font-medium text-white transition-opacity duration-150',
            'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
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
