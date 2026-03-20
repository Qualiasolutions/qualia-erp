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
} from 'lucide-react';
import type { Monitor, MonitorStatus, MonitorSource } from '@/lib/uptime';
import { getStatusLabel } from '@/lib/uptime';

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
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

function StatusIndicator({ status }: { status: MonitorStatus }) {
  return (
    <span
      className={cn(
        'absolute -right-0.5 -top-0.5 block size-3 rounded-full border-2 border-card',
        status === 2 && 'bg-emerald-500',
        status === 8 && 'animate-pulse bg-amber-500',
        status === 9 && 'animate-pulse bg-red-500',
        status === 0 && 'bg-muted-foreground/40',
        status === 1 && 'bg-muted-foreground/40'
      )}
    />
  );
}

function UptimeMiniBar({ ratio }: { ratio: string }) {
  const pct = parseFloat(ratio);
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct >= 99.9 && 'bg-emerald-500',
            pct >= 99 && pct < 99.9 && 'bg-emerald-400',
            pct >= 95 && pct < 99 && 'bg-amber-500',
            pct < 95 && 'bg-red-500'
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground/60">{pct.toFixed(1)}%</span>
    </div>
  );
}

function MonitorTile({ monitor, index }: { monitor: Monitor; index: number }) {
  const [showDetails, setShowDetails] = useState(false);
  const faviconUrl = getFaviconUrl(monitor.url);
  const responseTime = parseInt(monitor.average_response_time || '0');
  const uptimeRatios = monitor.custom_uptime_ratio?.split('-') || [];
  const uptime30d = uptimeRatios[1];

  const displayName = monitor.friendly_name
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\/$/, '')
    .replace(/\.vercel\.app$/, '')
    .replace(/\.supabase\.co\/functions\/v1\//, ' / ');

  // Shorten long names
  const shortName = displayName.length > 24 ? displayName.slice(0, 22) + '...' : displayName;

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center rounded-xl border p-4 transition-all duration-300 ease-out',
        'cursor-pointer select-none',
        monitor.status === 2 &&
          'border-border/40 bg-card hover:border-emerald-500/30 hover:shadow-[0_0_20px_-6px_rgba(16,185,129,0.15)]',
        monitor.status === 8 &&
          'border-amber-500/30 bg-amber-500/[0.03] hover:shadow-[0_0_20px_-6px_rgba(245,158,11,0.2)]',
        monitor.status === 9 &&
          'border-red-500/30 bg-red-500/[0.03] hover:shadow-[0_0_20px_-6px_rgba(239,68,68,0.2)]',
        (monitor.status === 0 || monitor.status === 1) && 'border-border/20 bg-card/50 opacity-50'
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Favicon / icon */}
      <div className="relative mb-3">
        <div
          className={cn(
            'flex size-11 items-center justify-center overflow-hidden rounded-xl border transition-all duration-300',
            monitor.status === 2 && 'border-border/40 bg-muted/30',
            monitor.status === 8 && 'border-amber-500/20 bg-amber-500/5',
            monitor.status === 9 && 'border-red-500/20 bg-red-500/5',
            (monitor.status === 0 || monitor.status === 1) && 'border-border/20 bg-muted/20'
          )}
        >
          {faviconUrl ? (
            <Image src={faviconUrl} alt="" width={24} height={24} className="size-6" unoptimized />
          ) : (
            <Globe className="size-5 text-muted-foreground/40" />
          )}
        </div>
        <StatusIndicator status={monitor.status} />
      </div>

      {/* Name */}
      <span
        className="mb-1 text-center text-[13px] font-medium leading-tight text-foreground"
        title={monitor.friendly_name}
      >
        {shortName}
      </span>

      {/* Status + response time */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-[11px] font-medium',
            monitor.status === 2 && 'text-emerald-600 dark:text-emerald-400',
            monitor.status === 8 && 'text-amber-600 dark:text-amber-400',
            monitor.status === 9 && 'text-red-600 dark:text-red-400',
            (monitor.status === 0 || monitor.status === 1) && 'text-muted-foreground/60'
          )}
        >
          {getStatusLabel(monitor.status)}
        </span>
        {monitor.status === 2 && responseTime > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground/40">
            {responseTime}ms
          </span>
        )}
      </div>

      {/* Uptime bar */}
      {uptime30d && (
        <div className="mt-2">
          <UptimeMiniBar ratio={uptime30d} />
        </div>
      )}

      {/* Hover overlay with link */}
      {monitor.url && (
        <a
          href={monitor.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          <ExternalLink className="size-3 text-muted-foreground/40 hover:text-foreground" />
        </a>
      )}

      {/* Expanded details */}
      {showDetails && monitor.logs && monitor.logs.length > 0 && (
        <div className="mt-3 w-full space-y-1 border-t border-border/30 pt-2 duration-200 animate-in fade-in slide-in-from-top-1">
          {monitor.logs.slice(0, 3).map((log, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <span
                className={cn(
                  'size-1 flex-shrink-0 rounded-full',
                  log.type === 1 && 'bg-red-500',
                  log.type === 2 && 'bg-emerald-500',
                  log.type === 98 && 'bg-blue-500',
                  log.type === 99 && 'bg-muted-foreground'
                )}
              />
              <span className="tabular-nums">
                {new Date(log.datetime * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span>
                {log.type === 1 && 'Down'}
                {log.type === 2 && 'Recovered'}
                {log.type === 98 && 'Started'}
                {log.type === 99 && 'Paused'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SECTION_CONFIG: Record<
  MonitorSource,
  { title: string; icon: typeof Globe; description: string }
> = {
  uptimerobot: { title: 'Websites', icon: Cloud, description: 'Client websites & web apps' },
  betterstack: { title: 'Edge Functions', icon: Zap, description: 'Supabase Edge Functions' },
  railway: { title: 'Railway Services', icon: Train, description: 'Backend workers & bots' },
};

function MonitorSection({
  source,
  monitors,
  startIndex,
}: {
  source: MonitorSource;
  monitors: Monitor[];
  startIndex: number;
}) {
  if (monitors.length === 0) return null;
  const config = SECTION_CONFIG[source];
  const Icon = config.icon;
  const upCount = monitors.filter((m) => m.status === 2).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted/40">
            <Icon className="size-3.5 text-muted-foreground/60" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">{config.title}</h3>
            <p className="text-[11px] text-muted-foreground/50">{config.description}</p>
          </div>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground/50">
          {upCount}/{monitors.length} up
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {monitors.map((monitor, i) => (
          <MonitorTile key={monitor.id} monitor={monitor} index={startIndex + i} />
        ))}
      </div>
    </div>
  );
}

export function StatusDashboard({
  monitors,
  overall,
  error,
}: {
  monitors: Monitor[];
  overall: OverallStatus;
  error: string | null;
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
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">System Status</h1>
        <p className="text-sm text-muted-foreground">
          Real-time monitoring across all Qualia products
        </p>
      </div>

      {/* Overall Status Banner */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-6',
          overall.allUp
            ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-emerald-500/[0.02]'
            : overall.downCount > 0
              ? 'border-red-500/20 bg-gradient-to-br from-red-500/[0.04] via-transparent to-red-500/[0.02]'
              : 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] via-transparent to-amber-500/[0.02]'
        )}
      >
        <div className="flex items-center gap-4">
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
                'text-lg font-semibold',
                overall.allUp && 'text-emerald-700 dark:text-emerald-400',
                overall.downCount > 0 && 'text-red-700 dark:text-red-400',
                overall.degradedCount > 0 &&
                  overall.downCount === 0 &&
                  'text-amber-700 dark:text-amber-400'
              )}
            >
              {overall.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {upCount} of {monitors.length} services operational
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-4 gap-4 border-t border-border/30 pt-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Total
            </span>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
              {monitors.length}
            </p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Websites
            </span>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
              {bySource.uptimerobot.length}
            </p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Avg Uptime
            </span>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
              {avgUptime}%
            </p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Avg Response
            </span>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
              {avgResponse > 0 ? `${avgResponse}ms` : '--'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
        </div>
      )}

      {/* Sections by source */}
      {(['uptimerobot', 'betterstack', 'railway'] as MonitorSource[]).map((source) => {
        const section = (
          <MonitorSection
            key={source}
            source={source}
            monitors={bySource[source]}
            startIndex={sectionIndex}
          />
        );
        sectionIndex += bySource[source].length;
        return section;
      })}

      {/* Footer */}
      <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-muted-foreground/30">
        <div className="flex items-center gap-1">
          <Server size={10} />
          UptimeRobot
        </div>
        <span>&middot;</span>
        <div className="flex items-center gap-1">
          <Zap size={10} />
          Better Stack
        </div>
        <span>&middot;</span>
        <div className="flex items-center gap-1">
          <Train size={10} />
          Railway
        </div>
      </div>
    </div>
  );
}
