'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Globe,
  RefreshCw,
  ChevronDown,
  Zap,
} from 'lucide-react';
import type { Monitor, MonitorStatus, MonitorSource } from '@/lib/uptime';
import { getStatusLabel } from '@/lib/uptime';

type OverallStatus = {
  label: string;
  allUp: boolean;
  downCount: number;
  degradedCount: number;
};

function StatusDot({ status }: { status: MonitorStatus }) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        status === 2 && 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
        status === 8 && 'animate-pulse bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
        status === 9 && 'animate-pulse bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
        status === 0 && 'bg-muted-foreground/40',
        status === 1 && 'bg-muted-foreground/40'
      )}
    />
  );
}

function UptimeBar({ ratio }: { ratio: string }) {
  const pct = parseFloat(ratio);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/60">
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
      <span className="text-xs tabular-nums text-muted-foreground">{pct.toFixed(2)}%</span>
    </div>
  );
}

const SOURCE_STYLES: Record<MonitorSource, { label: string; color: string }> = {
  uptimerobot: {
    label: 'Vercel',
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  betterstack: {
    label: 'Edge Fn',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  railway: {
    label: 'Railway',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
};

function MonitorCard({ monitor, index }: { monitor: Monitor; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const uptimeRatios = monitor.custom_uptime_ratio?.split('-') || [];
  const [uptime7d, uptime30d, uptime90d] = uptimeRatios;
  const responseTime = parseInt(monitor.average_response_time || '0');
  const displayName = monitor.friendly_name
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\/$/, '');

  return (
    <div
      className={cn(
        'group relative rounded-xl border transition-all duration-300 ease-out',
        'bg-card/50 backdrop-blur-sm',
        monitor.status === 2 && 'border-border/50 hover:border-emerald-500/20',
        monitor.status === 8 && 'border-amber-500/30 bg-amber-500/[0.02]',
        monitor.status === 9 && 'border-red-500/30 bg-red-500/[0.02]',
        monitor.status === 0 && 'border-border/30 opacity-60'
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <StatusDot status={monitor.status} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
              {monitor.status === 2 && responseTime > 0 && (
                <span className="hidden items-center gap-1 font-mono text-[11px] text-muted-foreground/60 sm:inline-flex">
                  <Zap size={10} />
                  {responseTime}ms
                </span>
              )}
            </div>
            <span
              className={cn(
                'text-xs',
                monitor.status === 2 && 'text-emerald-600 dark:text-emerald-400',
                monitor.status === 8 && 'text-amber-600 dark:text-amber-400',
                monitor.status === 9 && 'text-red-600 dark:text-red-400',
                (monitor.status === 0 || monitor.status === 1) && 'text-muted-foreground'
              )}
            >
              {getStatusLabel(monitor.status)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'hidden rounded-md border px-1.5 py-0.5 text-[10px] font-medium sm:inline-block',
              SOURCE_STYLES[monitor.source]?.color ||
                'border-border/30 bg-muted/30 text-muted-foreground/60'
            )}
          >
            {SOURCE_STYLES[monitor.source]?.label || monitor.source}
          </span>
          {uptime30d && (
            <span className="hidden md:block">
              <UptimeBar ratio={uptime30d} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={cn(
              'text-muted-foreground/40 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border/50 px-4 pb-4 pt-3 duration-200 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe size={12} />
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {monitor.url}
            </a>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {uptime7d && (
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                  7 day
                </span>
                <UptimeBar ratio={uptime7d} />
              </div>
            )}
            {uptime30d && (
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                  30 day
                </span>
                <UptimeBar ratio={uptime30d} />
              </div>
            )}
            {uptime90d && (
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                  90 day
                </span>
                <UptimeBar ratio={uptime90d} />
              </div>
            )}
          </div>

          {responseTime > 0 && (
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground">
                Avg response:{' '}
                <span
                  className={cn(
                    'font-mono font-medium',
                    responseTime < 300 && 'text-emerald-600 dark:text-emerald-400',
                    responseTime >= 300 &&
                      responseTime < 1000 &&
                      'text-amber-600 dark:text-amber-400',
                    responseTime >= 1000 && 'text-red-600 dark:text-red-400'
                  )}
                >
                  {responseTime}ms
                </span>
              </span>
            </div>
          )}

          {monitor.logs && monitor.logs.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                Recent events
              </span>
              <div className="space-y-1">
                {monitor.logs.slice(0, 5).map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                        log.type === 1 && 'bg-red-500',
                        log.type === 2 && 'bg-emerald-500',
                        log.type === 98 && 'bg-blue-500',
                        log.type === 99 && 'bg-muted-foreground'
                      )}
                    />
                    <span className="font-mono tabular-nums">
                      {new Date(log.datetime * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>
                      {log.type === 1 && 'Went down'}
                      {log.type === 2 && 'Came back up'}
                      {log.type === 98 && 'Monitoring started'}
                      {log.type === 99 && 'Paused'}
                    </span>
                    {log.duration > 0 && (
                      <span className="text-muted-foreground/50">
                        ({Math.round(log.duration / 60)}m)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  const avgUptime =
    monitors.length > 0
      ? (
          monitors.reduce((sum, m) => sum + parseFloat(m.all_time_uptime_ratio || '0'), 0) /
          monitors.length
        ).toFixed(2)
      : '0';
  const avgResponse =
    monitors.length > 0
      ? Math.round(
          monitors.reduce((sum, m) => sum + parseInt(m.average_response_time || '0'), 0) /
            monitors.length
        )
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
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
            ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] to-emerald-500/[0.01]'
            : overall.downCount > 0
              ? 'border-red-500/20 bg-gradient-to-br from-red-500/[0.04] to-red-500/[0.01]'
              : 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-amber-500/[0.01]'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
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

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border/30 pt-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Monitors
            </span>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
              {monitors.length}
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
              {avgResponse}ms
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Monitor List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Services ({monitors.length})
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            <RefreshCw size={10} />
            Auto-refreshes every 60s
          </div>
        </div>
        <div className="space-y-1.5">
          {monitors.map((monitor, i) => (
            <MonitorCard key={monitor.id} monitor={monitor} index={i} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="pt-4 text-center text-xs text-muted-foreground/40">
        UptimeRobot &middot; Better Stack &middot; Railway
      </p>
    </div>
  );
}
