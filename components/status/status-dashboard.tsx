'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Globe,
  Zap,
  ExternalLink,
  Server,
  Cloud,
  Train,
  Activity,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import type { Monitor, MonitorStatus, MonitorSource } from '@/lib/uptime';
import { getStatusLabel } from '@/lib/uptime';

export type ProjectInfo = {
  name: string;
  logoUrl: string | null;
  vercelUrl: string | null;
  githubUrl: string | null;
};

type OverallStatus = {
  label: string;
  allUp: boolean;
  downCount: number;
  degradedCount: number;
};

function getFaviconUrl(url: string): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  } catch {
    return null;
  }
}

function StatusPulse({ status }: { status: MonitorStatus }) {
  if (status === 2) {
    return (
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
      </span>
    );
  }
  if (status === 9) {
    return (
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-50" />
        <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
      </span>
    );
  }
  if (status === 8) {
    return (
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-40" />
        <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
      </span>
    );
  }
  return <span className="inline-flex size-2.5 rounded-full bg-muted-foreground/30" />;
}

function UptimeBarSegmented({ ratio }: { ratio: string }) {
  const pct = parseFloat(ratio);
  // Create 20 segments
  const filled = Math.round((pct / 100) * 20);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 w-[3px] rounded-[1px] transition-all duration-300',
            i < filled
              ? pct >= 99.9
                ? 'bg-emerald-500/80'
                : pct >= 99
                  ? 'bg-emerald-400/70'
                  : pct >= 95
                    ? 'bg-amber-500/70'
                    : 'bg-red-500/70'
              : 'bg-muted/30'
          )}
          style={{ transitionDelay: `${i * 15}ms` }}
        />
      ))}
      <span className="ml-1.5 text-xs font-medium tabular-nums text-muted-foreground">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function MonitorCard({
  monitor,
  index,
  project,
}: {
  monitor: Monitor;
  index: number;
  project?: ProjectInfo;
}) {
  const [expanded, setExpanded] = useState(false);
  const faviconUrl = getFaviconUrl(monitor.url);
  const responseTime = parseInt(monitor.average_response_time || '0');
  const uptimeRatios = monitor.custom_uptime_ratio?.split('-') || [];
  const [uptime7d, uptime30d] = uptimeRatios;

  const displayName =
    project?.name ||
    monitor.friendly_name
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/$/, '')
      .replace(/\.vercel\.app$/, '')
      .replace(/\.supabase\.co\/functions\/v1\//, ': ');

  return (
    <div
      className={cn(
        'ease-[premium] group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200',
        'hover:border-primary/20 hover:shadow-md',
        monitor.status === 8 && 'border-amber-500/30',
        monitor.status === 9 && 'border-red-500/40',
        (monitor.status === 0 || monitor.status === 1) && 'opacity-50'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'backwards',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Content */}
      <div className="relative z-10">
        {/* Top row: favicon + status */}
        <div className="mb-4 flex items-start justify-between">
          <div
            className={cn(
              'ease-[premium] flex size-14 items-center justify-center overflow-hidden rounded-xl border-2 transition-all duration-200',
              'bg-gradient-to-br from-muted/40 to-muted/10',
              monitor.status === 2 && 'border-border group-hover:border-emerald-500/20',
              monitor.status === 8 && 'border-amber-500/20',
              monitor.status === 9 && 'border-red-500/20',
              (monitor.status === 0 || monitor.status === 1) && 'border-border/10'
            )}
          >
            {project?.logoUrl ? (
              <Image
                src={project.logoUrl}
                alt={project.name}
                width={32}
                height={32}
                className="size-8 rounded-lg object-cover"
                unoptimized
              />
            ) : faviconUrl ? (
              <Image
                src={faviconUrl}
                alt=""
                width={32}
                height={32}
                className="size-8"
                unoptimized
              />
            ) : (
              <Globe className="size-6 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusPulse status={monitor.status} />
            {monitor.url && (
              <a
                href={monitor.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'ease-[premium] flex size-7 items-center justify-center rounded-lg border transition-all duration-200',
                  'border-transparent opacity-0 group-hover:border-border group-hover:opacity-100',
                  'hover:bg-muted/40'
                )}
              >
                <ArrowUpRight className="size-3.5 text-muted-foreground" />
              </a>
            )}
          </div>
        </div>

        {/* Name */}
        <h3
          className="mb-1 truncate text-[15px] font-semibold leading-tight text-foreground"
          title={monitor.friendly_name}
        >
          {displayName}
        </h3>

        {/* Status label */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-medium',
              monitor.status === 2 && 'text-emerald-600 dark:text-emerald-400',
              monitor.status === 8 && 'text-amber-600 dark:text-amber-400',
              monitor.status === 9 && 'text-red-600 dark:text-red-400',
              (monitor.status === 0 || monitor.status === 1) && 'text-muted-foreground/50'
            )}
          >
            {getStatusLabel(monitor.status)}
          </span>
          {responseTime > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] tabular-nums text-muted-foreground/40">
              <Zap size={9} />
              {responseTime}ms
            </span>
          )}
        </div>

        {/* Uptime bar */}
        {uptime30d && <UptimeBarSegmented ratio={uptime30d} />}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-border pt-3 duration-200 animate-in fade-in slide-in-from-top-2">
            {/* Uptime stats */}
            <div className="grid grid-cols-2 gap-2">
              {uptime7d && (
                <div className="rounded-lg bg-muted/20 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
                    7-day
                  </span>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {parseFloat(uptime7d).toFixed(2)}%
                  </p>
                </div>
              )}
              {responseTime > 0 && (
                <div className="rounded-lg bg-muted/20 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
                    Response
                  </span>
                  <p
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      responseTime < 300
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : responseTime < 1000
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {responseTime}ms
                  </p>
                </div>
              )}
            </div>

            {/* Event logs */}
            {monitor.logs && monitor.logs.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
                  Recent Events
                </span>
                {monitor.logs.slice(0, 4).map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md bg-muted/10 px-2 py-1 text-[11px] text-muted-foreground/60"
                  >
                    <span
                      className={cn(
                        'size-1.5 flex-shrink-0 rounded-full',
                        log.type === 1 && 'bg-red-500',
                        log.type === 2 && 'bg-emerald-500',
                        log.type === 98 && 'bg-blue-500',
                        log.type === 99 && 'bg-muted-foreground'
                      )}
                    />
                    <Clock size={9} className="text-muted-foreground/30" />
                    <span className="tabular-nums">
                      {new Date(log.datetime * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-medium">
                      {log.type === 1 && 'Went down'}
                      {log.type === 2 && 'Recovered'}
                      {log.type === 98 && 'Monitoring started'}
                      {log.type === 99 && 'Paused'}
                    </span>
                    {log.duration > 0 && log.type === 2 && (
                      <span className="ml-auto text-muted-foreground/40">
                        {Math.round(log.duration / 60)}m downtime
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* URL */}
            {monitor.url && (
              <a
                href={monitor.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground"
              >
                <ExternalLink size={10} />
                {monitor.url}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SECTION_CONFIG: Record<MonitorSource, { title: string; icon: typeof Globe; accent: string }> =
  {
    uptimerobot: { title: 'Websites & Web Apps', icon: Cloud, accent: 'text-sky-500' },
    betterstack: { title: 'Edge Functions', icon: Zap, accent: 'text-violet-500' },
    railway: { title: 'Railway Services', icon: Train, accent: 'text-orange-500' },
  };

function MonitorSection({
  source,
  monitors,
  startIndex,
  projectMap,
}: {
  source: MonitorSource;
  monitors: Monitor[];
  startIndex: number;
  projectMap?: Record<string, ProjectInfo>;
}) {
  if (monitors.length === 0) return null;
  const config = SECTION_CONFIG[source];
  const Icon = config.icon;
  const upCount = monitors.filter((m) => m.status === 2).length;
  const allUp = upCount === monitors.length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-xl bg-muted/30',
              config.accent
            )}
          >
            <Icon className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
            <p className="text-[11px] text-muted-foreground/50">
              {monitors.length} service{monitors.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
            allUp
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              allUp ? 'bg-emerald-500' : 'animate-pulse bg-amber-500'
            )}
          />
          {upCount}/{monitors.length} up
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {monitors.map((monitor, i) => (
          <MonitorCard
            key={monitor.id}
            monitor={monitor}
            index={startIndex + i}
            project={projectMap?.[String(monitor.id)]}
          />
        ))}
      </div>
    </div>
  );
}

export function StatusDashboard({
  monitors,
  overall,
  error,
  projectMap,
}: {
  monitors: Monitor[];
  overall: OverallStatus;
  error: string | null;
  projectMap?: Record<string, ProjectInfo>;
}) {
  const upCount = monitors.filter((m) => m.status === 2).length;

  // Group by source
  const bySource: Record<MonitorSource, Monitor[]> = {
    uptimerobot: [],
    betterstack: [],
    railway: [],
  };
  monitors.forEach((m) => {
    if (bySource[m.source]) bySource[m.source].push(m);
  });

  // Compute avg uptime only from monitors that have it
  const monitorsWithUptime = monitors.filter((m) => parseFloat(m.all_time_uptime_ratio || '0') > 0);
  const avgUptime =
    monitorsWithUptime.length > 0
      ? (
          monitorsWithUptime.reduce((sum, m) => sum + parseFloat(m.all_time_uptime_ratio), 0) /
          monitorsWithUptime.length
        ).toFixed(2)
      : '--';
  const monitorsWithResponse = monitors.filter((m) => parseInt(m.average_response_time || '0') > 0);
  const avgResponse =
    monitorsWithResponse.length > 0
      ? Math.round(
          monitorsWithResponse.reduce(
            (sum, m) => sum + parseInt(m.average_response_time || '0'),
            0
          ) / monitorsWithResponse.length
        )
      : 0;

  let sectionIndex = 0;

  return (
    <div className="flex h-full flex-col">
      {/* Mobile-only top bar with hamburger — uses shared PageHeader */}
      <div className="md:hidden">
        <PageHeader
          icon={<Activity className="h-3.5 w-3.5 text-primary" />}
          iconBg="bg-primary/10"
          title="System Status"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-10 p-6 lg:p-8">
          {/* Header — desktop only */}
          <div className="hidden items-end justify-between md:flex">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <Activity className="size-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">System Status</h1>
              </div>
              <p className="ml-[52px] text-sm text-muted-foreground">
                Real-time monitoring across {monitors.length} services
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </div>
          </div>

          {/* Stats bar */}
          <div
            className={cn(
              'relative overflow-hidden rounded-xl border bg-card p-6',
              overall.allUp
                ? 'border-emerald-500/15'
                : overall.downCount > 0
                  ? 'border-red-500/20'
                  : 'border-amber-500/20'
            )}
          >
            {/* Gradient bg */}
            <div
              className={cn(
                'absolute inset-0',
                overall.allUp
                  ? 'bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-emerald-500/[0.02]'
                  : overall.downCount > 0
                    ? 'bg-gradient-to-r from-red-500/[0.05] via-transparent to-red-500/[0.02]'
                    : 'bg-gradient-to-r from-amber-500/[0.04] via-transparent to-amber-500/[0.02]'
              )}
            />

            <div className="relative grid grid-cols-5 divide-x divide-border/20">
              {/* Status */}
              <div className="col-span-2 flex items-center gap-4 p-6">
                <div
                  className={cn(
                    'flex size-12 items-center justify-center rounded-xl',
                    overall.allUp && 'bg-emerald-500/10',
                    overall.downCount > 0 && 'bg-red-500/10',
                    overall.degradedCount > 0 && overall.downCount === 0 && 'bg-amber-500/10'
                  )}
                >
                  {overall.allUp ? (
                    <CheckCircle2 size={24} className="text-emerald-500" />
                  ) : overall.downCount > 0 ? (
                    <XCircle size={24} className="animate-pulse text-red-500" />
                  ) : (
                    <AlertTriangle size={24} className="animate-pulse text-amber-500" />
                  )}
                </div>
                <div>
                  <h2
                    className={cn(
                      'text-base font-semibold',
                      overall.allUp && 'text-emerald-700 dark:text-emerald-400',
                      overall.downCount > 0 && 'text-red-700 dark:text-red-400',
                      overall.degradedCount > 0 &&
                        overall.downCount === 0 &&
                        'text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {overall.label}
                  </h2>
                  <p className="text-xs text-muted-foreground/60">
                    {upCount}/{monitors.length} operational
                  </p>
                </div>
              </div>

              {/* Metrics */}
              {[
                { label: 'Websites', value: String(bySource.uptimerobot.length) },
                { label: 'Avg Uptime', value: `${avgUptime}%` },
                { label: 'Avg Response', value: avgResponse > 0 ? `${avgResponse}ms` : '--' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col justify-center px-6 py-5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
                    {stat.label}
                  </span>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {monitors.length === 0 && !error && (
            <EmptyState
              icon={Activity}
              title="No monitors found"
              description="No services are assigned to your projects yet."
            />
          )}

          {/* Sections by source */}
          {(['uptimerobot', 'betterstack', 'railway'] as MonitorSource[]).map((source) => {
            const section = (
              <MonitorSection
                key={source}
                source={source}
                monitors={bySource[source]}
                startIndex={sectionIndex}
                projectMap={projectMap}
              />
            );
            sectionIndex += bySource[source].length;
            return section;
          })}

          {/* Footer */}
          <div className="flex items-center justify-center gap-6 pb-4 pt-2 text-[11px] text-muted-foreground/25">
            {[
              { icon: Server, label: 'UptimeRobot' },
              { icon: Zap, label: 'Better Stack' },
              { icon: Train, label: 'Railway' },
            ].map(({ icon: FIcon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <FIcon size={10} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
