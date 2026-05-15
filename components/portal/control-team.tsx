'use client';

import { memo, useState, useTransition, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Crown,
  Flame,
  Loader2,
  Shield,
  User,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { hueFromId, clientAccent } from '@/lib/color-constants';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { updateUserRole, removeTeamMember, type AdminProfile } from '@/app/actions/admin';
import { adminOverrideClockOut } from '@/app/actions/work-sessions';
import type { TeamPayload, TeamTaskStub, TeamWorkloadPerson } from '@/app/actions/admin-control';
import type { Database } from '@/types/database';

type UserRole = Database['public']['Enums']['user_role'];

const ROLE_META: Record<string, { label: string; icon: typeof Shield; tone: string }> = {
  admin: {
    label: 'Owner',
    icon: Crown,
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  employee: {
    label: 'Employee',
    icon: Shield,
    tone: 'bg-primary/10 text-primary',
  },
  client: {
    label: 'Client',
    icon: User,
    tone: 'bg-muted text-muted-foreground',
  },
};

/* ======================================================================
   ControlTeam — roster + live + assignments
   ====================================================================== */

export function ControlTeam({ data }: { data: TeamPayload | undefined }) {
  if (!data || (data.members.length === 0 && data.liveStatus.length === 0)) {
    return (
      <EmptyState
        icon={Users}
        title="No team members yet"
        description="Invite team members to get started."
        compact
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryPill label="Clocked in" value={data.summary.activePeople} tone="emerald" />
        <SummaryPill label="Done this week" value={data.summary.completedThisWeek} tone="primary" />
        <SummaryPill label="Overdue work" value={data.summary.overdueTasks} tone="red" />
        <SummaryPill label="Blocked/stale" value={data.summary.blockedPeople} tone="amber" />
        <SummaryPill label="Overloaded" value={data.summary.overloadedPeople} tone="violet" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)]">
        <TeamWorkloadStrip people={data.workload} />
        <div className="flex flex-col gap-6">
          <TeamLivePanel statuses={data.liveStatus} workspaceId={data.workspaceId} />
          <TeamRoster members={data.members} />
        </div>
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'primary' | 'red' | 'amber' | 'violet';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'red'
        ? 'text-red-700 dark:text-red-400'
        : tone === 'amber'
          ? 'text-amber-700 dark:text-amber-400'
          : tone === 'violet'
            ? 'text-violet-600 dark:text-violet-400'
            : 'text-primary';
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', toneClass)}>
        {value}
      </div>
    </div>
  );
}

function TeamWorkloadStrip({ people }: { people: TeamWorkloadPerson[] }) {
  const [expanded, setExpanded] = useState<string | null>(people[0]?.profileId ?? null);

  if (people.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold tracking-tight">Workload</h3>
        <p className="mt-1 text-xs text-muted-foreground">No internal team members found.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Team workload</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Capacity, deadlines, blockers, and employee history in one operating view.
          </p>
        </div>
        <Link
          href="/admin/reports?tab=framework"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Open reports
          <ArrowRight className="size-3" />
        </Link>
      </header>
      <ul className="divide-y divide-border">
        {people.map((person) => (
          <WorkloadPersonRow
            key={person.profileId}
            person={person}
            expanded={expanded === person.profileId}
            onToggle={() => setExpanded(expanded === person.profileId ? null : person.profileId)}
          />
        ))}
      </ul>
    </section>
  );
}

function WorkloadPersonRow({
  person,
  expanded,
  onToggle,
}: {
  person: TeamWorkloadPerson;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hue = hueFromId(person.profileId);
  const overCapacity = person.capacityRatio >= 1;
  const warning =
    person.latestBlocker || person.staleTasks.length > 0 || person.overdueTasks.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full cursor-pointer grid-cols-1 gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/30 lg:grid-cols-[220px_minmax(0,1fr)_220px]"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
            style={{ background: clientAccent(hue, 50, 0.14) }}
            aria-hidden
          >
            {(person.fullName ?? '??')
              .split(/\s+/)
              .map((p) => p.charAt(0).toUpperCase())
              .slice(0, 2)
              .join('')}
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card',
                person.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
              )}
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {person.fullName ?? 'Unknown'}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {person.status === 'online'
                ? person.sessionProjectName
                  ? `On ${person.sessionProjectName}`
                  : 'Clocked in'
                : person.email}
            </span>
          </span>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {person.weightedLoad}/10 capacity · {person.activeTaskCount} active
            </span>
            <span
              className={cn(
                'font-mono text-[10px] font-semibold tabular-nums',
                overCapacity
                  ? 'text-red-600 dark:text-red-400'
                  : person.capacityRatio >= 0.8
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {Math.round(person.capacityRatio * 100)}%
            </span>
          </div>
          <CapacityBar person={person} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <SignalBadge
              icon={CheckCircle2}
              label={`${person.completedThisWeek} done`}
              tone="emerald"
            />
            <SignalBadge
              icon={Briefcase}
              label={`${person.hoursThisWeek.toFixed(1)}h`}
              tone="muted"
            />
            {person.inboxUnscheduled > 0 ? (
              <SignalBadge label={`${person.inboxUnscheduled} unscheduled`} tone="muted" />
            ) : null}
            {person.overdueTasks.length > 0 ? (
              <SignalBadge
                icon={AlertTriangle}
                label={`${person.overdueTasks.length} overdue`}
                tone="red"
              />
            ) : null}
            {person.latestBlocker ? (
              <SignalBadge
                icon={Flame}
                label={`${person.latestBlocker.gapCycles} gap`}
                tone="amber"
              />
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-end">
          <div className="min-w-0 text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              This week
            </div>
            <div className="mt-1 text-xs text-foreground">
              {person.dueThisWeek.length} due · {person.staleTasks.length} stale
            </div>
          </div>
          <ArrowRight
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
              warning && 'text-amber-600 dark:text-amber-400'
            )}
          />
        </div>
      </button>

      {expanded ? <WorkloadPersonDetails person={person} /> : null}
    </li>
  );
}

function CapacityBar({ person }: { person: TeamWorkloadPerson }) {
  if (person.projectLoads.length === 0) {
    return <div className="h-3 rounded-full bg-muted" />;
  }
  const total = Math.max(person.weightedLoad, 10);
  return (
    <div className="relative h-3 overflow-hidden rounded-full bg-muted">
      <div className="absolute left-[100%] top-0 h-full w-px bg-foreground/30" />
      <div className="flex h-full">
        {person.projectLoads.map((project) => {
          const hue = hueFromId(project.projectId ?? project.projectName);
          return (
            <span
              key={project.projectId ?? project.projectName}
              className="h-full"
              style={{
                width: `${Math.max(4, (project.weightedLoad / total) * 100)}%`,
                background: clientAccent(hue, 50, 0.16),
              }}
              title={`${project.projectName}: ${project.taskCount} work item${project.taskCount === 1 ? '' : 's'}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function SignalBadge({
  label,
  tone,
  icon: Icon,
}: {
  label: string;
  tone: 'emerald' | 'red' | 'amber' | 'muted';
  icon?: ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : tone === 'red'
        ? 'bg-red-500/10 text-red-700 dark:text-red-400'
        : tone === 'amber'
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'bg-muted text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        toneClass
      )}
    >
      {Icon ? <Icon className="size-3" aria-hidden /> : null}
      {label}
    </span>
  );
}

function WorkloadPersonDetails({ person }: { person: TeamWorkloadPerson }) {
  return (
    <div className="border-t border-dashed border-border bg-muted/20 px-4 py-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DetailPanel title="Due / overdue" icon={CalendarClock}>
          <TaskList
            rows={[...person.overdueTasks, ...person.dueThisWeek]}
            empty="No dated work at risk this week."
          />
        </DetailPanel>
        <DetailPanel title="Stale / blockers" icon={Flame}>
          {person.latestBlocker ? (
            <Link
              href={`/admin/reports?tab=framework&id=${person.latestBlocker.reportId}`}
              className="mb-2 block rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs hover:bg-amber-500/[0.09]"
            >
              <span className="font-semibold text-foreground">
                {person.latestBlocker.projectName}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-muted-foreground">
                {person.latestBlocker.notes ??
                  `${person.latestBlocker.gapCycles} gap cycles reported.`}
              </span>
            </Link>
          ) : null}
          <TaskList rows={person.staleTasks} empty="No stale in-progress work." />
        </DetailPanel>
        <DetailPanel title="Drilldowns" icon={BarChart3}>
          <div className="flex flex-col gap-2">
            <Link
              className="inline-flex items-center justify-between gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              href={`/admin/employee/${person.profileId}`}
            >
              Open full profile
              <ArrowRight className="size-3" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              href={`/admin/attendance?profile=${person.profileId}&date=30d`}
            >
              Attendance and sessions
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </DetailPanel>
      </div>
    </div>
  );
}

function DetailPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <header className="mb-2 flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        <h4 className="text-xs font-semibold tracking-tight">{title}</h4>
      </header>
      {children}
    </section>
  );
}

function TaskList({ rows, empty }: { rows: TeamTaskStub[]; empty: string }) {
  if (rows.length === 0)
    return <p className="py-2 text-xs italic text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.slice(0, 5).map((task) => (
        <li key={task.id} className="rounded-md bg-muted/40 px-2.5 py-2">
          <div className="line-clamp-1 text-xs font-medium text-foreground">{task.title}</div>
          <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span className="truncate">{task.projectName ?? 'No project'}</span>
            <span className="shrink-0 font-mono tabular-nums">{task.dueDate ?? task.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ======================================================================
   TeamRoster
   ====================================================================== */

function TeamRoster({ members }: { members: AdminProfile[] }) {
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRoleChange = (member: AdminProfile, nextRole: UserRole) => {
    if (member.role === nextRole) return;
    startTransition(async () => {
      const res = await updateUserRole(member.id, nextRole);
      if (res.success) {
        toast.success(`${member.full_name ?? 'Member'} is now ${nextRole}`);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to update role');
      }
    });
  };

  const handleConfirmRemove = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const name = deleteTarget.full_name ?? 'Member';
    setDeleteTarget(null);
    startTransition(async () => {
      const res = await removeTeamMember(id);
      if (res.success) {
        toast.success(`${name} removed`);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to remove member');
      }
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Roster</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {members.length} members
        </span>
      </header>
      <ul className="divide-y divide-border">
        {members.map((member) => (
          <RosterRow
            key={member.id}
            member={member}
            onRoleChange={handleRoleChange}
            onDelete={() => setDeleteTarget(member)}
            disabled={isPending}
          />
        ))}
      </ul>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Remove ${deleteTarget?.full_name ?? 'member'}?`}
        description="This revokes access and removes assignments. Cannot be undone."
        confirmLabel="Remove"
        onConfirm={handleConfirmRemove}
      />
    </section>
  );
}

const RosterRow = memo(function RosterRow({
  member,
  onRoleChange,
  onDelete,
  disabled,
}: {
  member: AdminProfile;
  onRoleChange: (member: AdminProfile, next: UserRole) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const meta = ROLE_META[member.role ?? 'employee'] ?? ROLE_META.employee;
  const Icon = meta.icon;
  const hue = hueFromId(member.id);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ background: clientAccent(hue, 50, 0.14) }}
        aria-hidden
      >
        {(member.full_name ?? '??')
          .split(/\s+/)
          .map((p) => p.charAt(0).toUpperCase())
          .slice(0, 2)
          .join('')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {member.full_name ?? '—'}
        </div>
        <div className="truncate text-xs text-muted-foreground">{member.email ?? '—'}</div>
      </div>
      <span
        className={cn(
          'hidden items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium md:inline-flex',
          meta.tone
        )}
      >
        <Icon className="size-3" aria-hidden />
        {meta.label}
      </span>
      <Select
        value={member.role ?? 'employee'}
        onValueChange={(v) => onRoleChange(member, v as UserRole)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-28 cursor-pointer text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="employee">Employee</SelectItem>
          <SelectItem value="client">Client</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 cursor-pointer text-xs text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
      >
        Remove
      </Button>
    </li>
  );
});

/* ======================================================================
   TeamLivePanel
   ====================================================================== */

function TeamLivePanel({
  statuses,
  workspaceId,
}: {
  statuses: TeamPayload['liveStatus'];
  workspaceId: string | null;
}) {
  const online = statuses.filter((s) => s.status === 'online');
  const router = useRouter();
  const [overrideTarget, setOverrideTarget] = useState<TeamPayload['liveStatus'][number] | null>(
    null
  );
  const [overrideReason, setOverrideReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const closeOverrideDialog = () => {
    if (isPending) return;
    setOverrideTarget(null);
    setOverrideReason('');
  };

  const handleOverride = () => {
    if (!workspaceId || !overrideTarget?.sessionId) return;
    const reason = overrideReason.trim();
    if (!reason) {
      toast.error('Override reason is required');
      return;
    }

    startTransition(async () => {
      const res = await adminOverrideClockOut(workspaceId, overrideTarget.sessionId!, reason);
      if (res.success) {
        toast.success(`${overrideTarget.fullName ?? 'Session'} force-closed`);
        setOverrideTarget(null);
        setOverrideReason('');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to force close session');
      }
    });
  };

  return (
    <aside className="sticky top-4 flex flex-col gap-5 self-start">
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            Clocked in
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {online.length} online
          </span>
        </header>
        {online.length === 0 ? (
          <p className="py-4 text-center text-xs italic text-muted-foreground">
            No one clocked in.
          </p>
        ) : (
          <ul className="divide-y divide-dashed divide-border">
            {online.map((s) => (
              <li key={s.profileId} className="flex items-center gap-3 py-2">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                  aria-hidden
                >
                  {(s.fullName ?? '??')
                    .split(/\s+/)
                    .map((p) => p.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">
                    {s.fullName ?? '—'}
                  </div>
                  {s.projectName ? (
                    <div className="truncate text-[10px] text-muted-foreground">
                      on {s.projectName}
                    </div>
                  ) : null}
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {s.sessionStartedAt
                    ? formatDistanceToNowStrict(new Date(s.sessionStartedAt))
                    : '—'}
                </span>
                {s.sessionId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 cursor-pointer px-2 text-[10px] text-muted-foreground hover:text-destructive"
                    onClick={() => setOverrideTarget(s)}
                  >
                    Force close
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!overrideTarget} onOpenChange={(open) => !open && closeOverrideDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <DialogTitle>Force close session</DialogTitle>
            </div>
            <DialogDescription>
              Use this only when an employee is stuck and cannot submit the normal clock-out flow.
              The reason is appended to the session and logged.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <div className="font-medium text-foreground">{overrideTarget?.fullName ?? '—'}</div>
            <div className="mt-0.5 text-muted-foreground">
              {overrideTarget?.projectName ? `on ${overrideTarget.projectName}` : 'No project'}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-reason" className="text-sm font-medium">
              Override reason
            </Label>
            <Textarea
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={4}
              placeholder="Explain why this session needs admin force-close..."
              className="resize-none"
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={closeOverrideDialog}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="cursor-pointer"
              onClick={handleOverride}
              disabled={isPending || !overrideReason.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Closing…
                </>
              ) : (
                'Force close'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
