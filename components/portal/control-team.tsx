'use client';

import { memo, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { Crown, Shield, User, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { hueFromId, clientAccent } from '@/lib/color-constants';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { updateUserRole, removeTeamMember, type AdminProfile } from '@/app/actions/admin';
import type { TeamPayload, AssignmentProject } from '@/app/actions/admin-control';
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-6">
        <TeamRoster members={data.members} />
        <TeamAssignmentsGrid
          employees={data.assignments.employees}
          projects={data.assignments.projects}
          matrix={data.assignments.matrix}
        />
      </div>
      <TeamLivePanel statuses={data.liveStatus} />
    </div>
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
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-sm font-semibold tracking-tight">Roster</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
    <li className="flex items-center gap-3 border-b border-border px-6 py-3 transition-colors last:border-b-0 hover:bg-muted/30">
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

function TeamLivePanel({ statuses }: { statuses: TeamPayload['liveStatus'] }) {
  const online = statuses.filter((s) => s.status === 'online');

  return (
    <aside className="sticky top-4 flex flex-col gap-5 self-start">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            Clocked in
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {online.length} online
          </span>
        </header>
        {online.length === 0 ? (
          <p className="px-6 py-8 text-center text-xs italic text-muted-foreground">
            No one clocked in.
          </p>
        ) : (
          <ul>
            {online.map((s) => (
              <li
                key={s.profileId}
                className="flex items-center gap-3 border-b border-border px-6 py-3 transition-colors last:border-b-0 hover:bg-muted/30"
              >
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

/* ======================================================================
   TeamAssignmentsGrid
   ====================================================================== */

function TeamAssignmentsGrid({
  employees,
  projects,
  matrix,
}: {
  employees: TeamPayload['assignments']['employees'];
  projects: AssignmentProject[];
  matrix: TeamPayload['assignments']['matrix'];
}) {
  const columns = useMemo(() => projects.slice(0, 12), [projects]);

  if (employees.length === 0 || projects.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-1 text-sm font-semibold tracking-tight">Assignments</h3>
        <p className="text-xs text-muted-foreground">No active project assignments yet.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-sm font-semibold tracking-tight">Assignments</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {employees.length} x {projects.length}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-[500px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 border-b border-r border-border bg-card px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
              >
                Employee
              </th>
              {columns.map((p) => {
                const hue = hueFromId(p.client_id ?? p.id);
                return (
                  <th
                    key={p.id}
                    scope="col"
                    className="border-b border-border px-2 py-2 text-center font-mono text-[10px] font-medium uppercase tracking-[0.06em]"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className="size-1.5 rounded-full"
                        aria-hidden
                        style={{ background: clientAccent(hue, 55, 0.14) }}
                      />
                      <span className="max-w-[7ch] truncate text-foreground">{p.name}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const assigned = new Set(matrix[emp.id] ?? []);
              return (
                <tr key={emp.id}>
                  <th
                    scope="row"
                    className="sticky left-0 border-b border-r border-border bg-card px-3 py-2 text-left text-xs font-medium text-foreground"
                  >
                    <div className="truncate">{emp.full_name ?? '—'}</div>
                  </th>
                  {columns.map((p) => (
                    <td key={p.id} className="border-b border-border px-2 py-2 text-center">
                      {assigned.has(p.id) ? (
                        <span
                          className="inline-block size-2 rounded-full bg-primary"
                          aria-label="Assigned"
                        />
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {projects.length > columns.length ? (
        <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          Showing {columns.length} of {projects.length} projects.
        </div>
      ) : null}
    </section>
  );
}
