'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Users, ClipboardList, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamTaskDashboard } from '@/lib/swr';
import { TeamTaskCard } from './team-task-card';
import type { TeamMemberTasks } from '@/app/actions/team-dashboard';
import type { DailyCheckin } from '@/app/actions/checkins';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TeamTaskSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border border-border/40 bg-card">
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
            <div className="size-7 rounded-full bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="ml-auto h-5 w-8 rounded-full bg-muted" />
          </div>
          <div className="divide-y divide-border/30">
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3">
                <div className="size-2 rounded-full bg-muted" />
                <div className="size-3.5 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/3 rounded bg-muted" />
                </div>
                <div className="h-5 w-14 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Member Group (Admin view) ────────────────────────────────────────────────

interface MemberGroupProps {
  member: TeamMemberTasks;
  defaultOpen?: boolean;
}

function MemberGroup({ member, defaultOpen = true }: MemberGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { profile, tasks } = member;

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className="overflow-hidden rounded-lg border border-border/40 bg-card">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar className="size-7 shrink-0">
          <AvatarImage
            src={profile.avatar_url ?? undefined}
            alt={profile.full_name ?? 'Team member'}
          />
          <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
        <span className="flex-1 text-sm font-semibold text-foreground">
          {profile.full_name ?? 'Unknown'}
        </span>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {tasks.length}
        </Badge>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Tasks */}
      {open && (
        <div className="divide-y divide-border/30">
          {tasks.length === 0 ? (
            <p className="px-4 py-4 text-center text-xs text-muted-foreground">No active tasks</p>
          ) : (
            tasks.map((task) => <TeamTaskCard key={task.id} task={task} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Admin Check-ins Section ──────────────────────────────────────────────────

interface AdminCheckinsSectionProps {
  workspaceId: string;
  profiles: { id: string; full_name: string | null }[];
}

function AdminCheckinsSection({ workspaceId, profiles }: AdminCheckinsSectionProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('all');
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCheckins = useCallback(
    async (date: string) => {
      setLoading(true);
      try {
        const { getCheckins } = await import('@/app/actions/checkins');
        const result = await getCheckins(workspaceId, { date, limit: 100 });
        setCheckins(result);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const handleOpen = () => {
    if (!open) loadCheckins(selectedDate);
    setOpen((v) => !v);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    if (open) loadCheckins(newDate);
  };

  const filteredCheckins =
    selectedProfileId === 'all'
      ? checkins
      : checkins.filter((c) => c.profile_id === selectedProfileId);

  return (
    <div className="overflow-hidden rounded-lg border border-border/40 bg-card">
      {/* Header toggle */}
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        onClick={handleOpen}
      >
        <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm font-semibold text-foreground">Today&apos;s Check-ins</span>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border/40">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/30 bg-muted/20 px-4 py-2">
            <Filter className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="rounded border border-border/50 bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-qualia-500"
            />
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checkins list */}
          <div className="max-h-80 divide-y divide-border/30 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : filteredCheckins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  No check-ins for {format(new Date(selectedDate + 'T12:00:00'), 'MMMM d')}
                </p>
              </div>
            ) : (
              filteredCheckins.map((checkin) => <CheckinRow key={checkin.id} checkin={checkin} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckinRow({ checkin }: { checkin: DailyCheckin }) {
  const initials = checkin.profile?.full_name
    ? checkin.profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const isMorning = checkin.checkin_type === 'morning';

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Avatar className="size-6 shrink-0">
          <AvatarImage
            src={checkin.profile?.avatar_url ?? undefined}
            alt={checkin.profile?.full_name ?? 'Member'}
          />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-foreground">
          {checkin.profile?.full_name ?? 'Unknown'}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'ml-1 shrink-0 text-xs',
            isMorning
              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
              : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400'
          )}
        >
          {isMorning ? 'Morning' : 'Evening'}
        </Badge>
      </div>

      {isMorning ? (
        <div className="space-y-1 pl-8">
          {(checkin.planned_tasks ?? []).length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Planned:</p>
              <ul className="space-y-0.5">
                {checkin.planned_tasks.map((task, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-foreground before:mr-1.5 before:content-['·']"
                  >
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {checkin.blockers && (
            <p className="text-xs text-red-600 dark:text-red-400">
              <span className="font-medium">Blocker:</span> {checkin.blockers}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1 pl-8">
          {(checkin.completed_tasks ?? []).length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Completed:</p>
              <ul className="space-y-0.5">
                {checkin.completed_tasks.map((task, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-foreground before:mr-1.5 before:content-['·']"
                  >
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {checkin.wins && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              <span className="font-medium">Win:</span> {checkin.wins}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Container ────────────────────────────────────────────────────────────

interface TeamTaskContainerProps {
  workspaceId: string;
  userRole: string | null;
}

export function TeamTaskContainer({ workspaceId, userRole }: TeamTaskContainerProps) {
  const isAdmin = userRole === 'admin';
  const { members, isLoading, isError } = useTeamTaskDashboard(workspaceId);

  // Build flat profile list for check-in filter
  const profiles = members.map((m) => ({
    id: m.profile.id,
    full_name: m.profile.full_name,
  }));

  return (
    <div className="mt-4 space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Team Tasks</h2>
      </div>

      {/* Loading */}
      {isLoading && <TeamTaskSkeleton />}

      {/* Error */}
      {isError && !isLoading && (
        <p className="text-xs text-destructive">Failed to load team tasks.</p>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <div className="max-h-[600px] space-y-3 overflow-y-auto pr-0.5">
          {isAdmin ? (
            <>
              {/* Admin: grouped by person */}
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-border/40 bg-card py-10 text-center">
                  <Users className="mb-2 size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No team members found</p>
                </div>
              ) : (
                members.map((member) => (
                  <MemberGroup key={member.profile.id} member={member} defaultOpen />
                ))
              )}

              {/* Admin check-ins collapsible */}
              <AdminCheckinsSection workspaceId={workspaceId} profiles={profiles} />
            </>
          ) : (
            /* Employee: flat list of own tasks */
            <div className="overflow-hidden rounded-lg border border-border/40 bg-card">
              {members.length === 0 || members[0]?.tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ClipboardList className="mb-2 size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No active tasks</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    All caught up — great work!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {members[0].tasks.map((task) => (
                    <TeamTaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
