'use client';

import { memo } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { CalendarDays, Clock, Flag, ListChecks, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CapacityBar } from '@/components/ui/capacity-bar';
import { HoursHeatmap } from './hours-heatmap';
import type { EmployeeProfilePayload, EmployeeTaskStub } from '@/app/actions/admin-control';

const PRIORITY_COLOR: Record<string, string> = {
  Urgent: 'text-rose-700 dark:text-rose-400 bg-rose-500/10',
  High: 'text-amber-700 dark:text-amber-400 bg-amber-500/10',
  Medium: 'text-foreground bg-muted',
  Low: 'text-muted-foreground bg-muted/60',
  'No Priority': 'text-muted-foreground/70 bg-muted/40',
};

const PRIORITY_DOT: Record<string, string> = {
  Urgent: 'bg-rose-500',
  High: 'bg-amber-500',
  Medium: 'bg-foreground/50',
  Low: 'bg-foreground/25',
  'No Priority': 'bg-foreground/15',
};

function dueLabel(task: EmployeeTaskStub): string {
  if (!task.dueDate) return '—';
  const d = new Date(`${task.dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return '1d late';
  if (days < 0) return `${Math.abs(days)}d late`;
  if (days < 7) return `in ${days}d`;
  return d.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' });
}

export const TasksTab = memo(function TasksTab({ profile }: { profile: EmployeeProfilePayload }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* LEFT — work list */}
      <div className="flex flex-col gap-5">
        {profile.overdue.length > 0 ? (
          <Section title="Overdue" count={profile.overdue.length} icon={Flag} tone="critical">
            <TaskList tasks={profile.overdue} highlightOverdue />
          </Section>
        ) : null}

        <Section
          title="In progress"
          count={profile.inProgress.length}
          icon={Clock}
          emptyText="Nothing in progress right now."
        >
          <TaskList tasks={profile.inProgress} />
        </Section>

        <Section
          title="Todo"
          count={profile.todo.length}
          icon={ListChecks}
          emptyText="Empty queue."
        >
          <TaskList tasks={profile.todo} />
        </Section>

        <Section
          title={`Done · ${profile.periodLabel.split('·')[0].trim()}`}
          count={profile.doneInPeriod.length}
          icon={Sparkles}
          tone="positive"
          emptyText="No work completed yet."
        >
          <TaskList tasks={profile.doneInPeriod.slice(0, 25)} muted />
        </Section>
      </div>

      {/* RIGHT — sidebar */}
      <aside className="flex flex-col gap-5">
        {/* Project split */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Project split
            </h3>
            <span className="font-mono text-[10px] tabular-nums text-foreground">
              {profile.summary.hoursThisPeriod.toFixed(1)}h total
            </span>
          </div>
          {profile.projectSplit.length === 0 ? (
            <p className="py-4 text-center text-[11px] italic text-muted-foreground">
              No tracked time in this period.
            </p>
          ) : (
            <CapacityBar
              segments={profile.projectSplit.map((p) => ({
                id: p.projectId ?? p.projectName,
                label: p.projectName,
                value: p.hours,
                hue: p.hue,
              }))}
              capacity={Math.max(profile.summary.hoursThisPeriod, 8)}
              showLegend
              compact
            />
          )}
        </div>

        {/* Hours heatmap */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Hours worked
          </h3>
          <HoursHeatmap weeks={profile.hoursHeatmap} />
        </div>

        {/* Latest check-in / 1:1 prep */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Last check-in
          </h3>
          {profile.latestCheckin ? (
            <div className="flex flex-col gap-2 text-[12px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden />
                <span className="font-mono">
                  {formatDistanceToNowStrict(new Date(`${profile.latestCheckin.date}T12:00:00`), {
                    addSuffix: true,
                  })}
                </span>
                {profile.latestCheckin.mood != null ? (
                  <span className="ml-auto font-mono text-[10px] tabular-nums">
                    mood {profile.latestCheckin.mood}/5
                  </span>
                ) : null}
              </div>
              {profile.latestCheckin.wins ? (
                <p className="rounded-md bg-emerald-500/[0.06] p-2 text-[12px] leading-relaxed text-foreground">
                  <span className="font-mono text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Win
                  </span>
                  <br />
                  {profile.latestCheckin.wins}
                </p>
              ) : null}
              {profile.latestCheckin.blockers ? (
                <p className="rounded-md bg-amber-500/[0.06] p-2 text-[12px] leading-relaxed text-foreground">
                  <span className="font-mono text-[9px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    Blocker
                  </span>
                  <br />
                  {profile.latestCheckin.blockers}
                </p>
              ) : null}
              {profile.latestCheckin.tomorrowPlan ? (
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  <span className="font-mono text-[9px] uppercase tracking-wide">Plan</span>
                  <br />
                  {profile.latestCheckin.tomorrowPlan}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="py-2 text-[11px] italic text-muted-foreground">
              No check-ins recorded yet.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
});

function Section({
  title,
  count,
  icon: Icon,
  tone = 'neutral',
  emptyText,
  children,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'positive' | 'critical';
  emptyText?: string;
  children: React.ReactNode;
}) {
  const headerTone =
    tone === 'critical'
      ? 'text-rose-700 dark:text-rose-400'
      : tone === 'positive'
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-foreground';

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className={cn('size-3.5', headerTone)} aria-hidden />
          <h3 className={cn('text-sm font-semibold tracking-tight', headerTone)}>{title}</h3>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{count}</span>
      </header>
      {count === 0 ? (
        <p className="px-4 py-3 text-[11px] italic text-muted-foreground">
          {emptyText ?? 'Nothing here.'}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function TaskList({
  tasks,
  highlightOverdue,
  muted,
}: {
  tasks: EmployeeTaskStub[];
  highlightOverdue?: boolean;
  muted?: boolean;
}) {
  return (
    <ul className="divide-y divide-dashed divide-border">
      {tasks.map((task) => (
        <li key={task.id}>
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
              muted ? 'opacity-70' : '',
              highlightOverdue ? 'hover:bg-rose-500/[0.04]' : 'hover:bg-muted/40'
            )}
          >
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                PRIORITY_DOT[task.priority] ?? 'bg-foreground/20'
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {task.title}
            </span>
            {task.projectName ? (
              <span className="hidden shrink-0 truncate text-xs text-muted-foreground md:inline">
                {task.projectName}
              </span>
            ) : null}
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tabular-nums',
                PRIORITY_COLOR[task.priority] ?? 'bg-muted'
              )}
            >
              {task.priority === 'No Priority' ? '—' : task.priority.charAt(0)}
            </span>
            <span
              className={cn(
                'shrink-0 font-mono text-[11px] tabular-nums',
                task.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
              )}
            >
              {task.completedAt ? '✓' : dueLabel(task)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
