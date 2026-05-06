'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

import { cn } from '@/lib/utils';
import { hueFromId, clientAccent } from '@/lib/color-constants';
import { StatCard } from '@/components/ui/stat-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EmployeeProfilePayload, Period } from '@/app/actions/admin-control';

import { TasksTab } from './tasks-tab';
import { TrendsTab } from './trends-tab';
import { HistoryTab } from './history-tab';

type TabKey = 'tasks' | 'trends' | 'history';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_30d', label: 'Last 30 days' },
];

const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'trends', label: 'Trends' },
  { value: 'history', label: 'History' },
];

export function EmployeeProfileShell({
  profile,
  initialTab,
}: {
  profile: EmployeeProfilePayload;
  initialTab: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const initials = (profile.profile.fullName ?? '??')
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  const hue = hueFromId(profile.profile.id);

  const setPeriod = (next: Period) => {
    const params = new URLSearchParams();
    if (tab !== 'tasks') params.set('tab', tab);
    params.set('period', next);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const setTabAndUrl = (next: TabKey) => {
    setTab(next);
    const params = new URLSearchParams();
    if (next !== 'tasks') params.set('tab', next);
    params.set('period', profile.period);
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-muted/30 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href="/admin?tab=team"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" aria-hidden />
            Back to team
          </Link>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span
                className="flex size-14 items-center justify-center rounded-full text-base font-semibold text-white"
                style={{ background: clientAccent(hue, 50, 0.15) }}
                aria-hidden
              >
                {initials}
              </span>
              <span
                className={cn(
                  'absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background',
                  profile.isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                )}
                aria-label={profile.isOnline ? 'Online' : 'Offline'}
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {profile.profile.fullName ?? 'Unnamed'}
              </h1>
              <p className="mt-0.5 flex items-center gap-2 text-[13px] text-muted-foreground">
                <span className="capitalize">{profile.profile.role ?? 'employee'}</span>
                {profile.profile.email ? (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-mono text-[11px]">{profile.profile.email}</span>
                  </>
                ) : null}
                {profile.isOnline && profile.liveSessionStartedAt ? (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                      Clocked in{' '}
                      {formatDistanceToNowStrict(new Date(profile.liveSessionStartedAt), {
                        addSuffix: true,
                      })}
                      {profile.liveSessionProjectName
                        ? ` on ${profile.liveSessionProjectName}`
                        : ''}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {/* Period selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                {PERIOD_OPTIONS.find((p) => p.value === profile.period)?.label ?? 'Period'}
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PERIOD_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onSelect={() => setPeriod(opt.value)}
                  className={cn(opt.value === profile.period && 'font-semibold text-primary')}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tab strip */}
        <div className="mt-6 flex gap-6 border-b border-border">
          {TAB_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTabAndUrl(opt.value)}
              className={cn(
                'relative -mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors',
                tab === opt.value
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* Summary bar — visible on every tab so you always have the headline numbers */}
      <div className="border-b border-border bg-card/30 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Hours"
            value={`${profile.summary.hoursThisPeriod.toFixed(1)}h`}
            deltaPct={profile.summary.hoursDeltaPct}
            deltaLabel="vs prev"
            compact
          />
          <StatCard
            label="Tasks done"
            value={profile.summary.tasksCompleted.toString()}
            deltaPct={profile.summary.tasksDeltaPct}
            deltaLabel="vs prev"
            compact
          />
          <StatCard
            label="Completion"
            value={
              profile.summary.completionPct != null ? `${profile.summary.completionPct}%` : '—'
            }
            helperText={
              profile.summary.carryoverPct != null
                ? `${profile.summary.carryoverPct}% carryover`
                : undefined
            }
            compact
          />
          <StatCard
            label="Mood"
            value={profile.summary.averageMood != null ? `${profile.summary.averageMood}/5` : '—'}
            helperText={
              profile.summary.averageEnergy != null
                ? `energy ${profile.summary.averageEnergy}/5`
                : 'no check-ins'
            }
            compact
          />
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {tab === 'tasks' ? <TasksTab profile={profile} /> : null}
        {tab === 'trends' ? <TrendsTab profileId={profile.profile.id} /> : null}
        {tab === 'history' ? <HistoryTab profileId={profile.profile.id} /> : null}
      </div>
    </div>
  );
}
