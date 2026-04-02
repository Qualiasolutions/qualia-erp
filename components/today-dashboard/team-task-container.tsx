'use client';

import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  Users,
  ClipboardList,
  Filter,
  Plus,
  Loader2,
  CheckCircle2,
  Globe,
  Bot,
  Phone,
  Sparkles,
  TrendingUp,
  Smartphone,
  Megaphone,
  Folder,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import {
  useTeamTaskDashboard,
  invalidateInboxTasks,
  invalidateDailyFlow,
  invalidateTeamDashboard,
} from '@/lib/swr';
import { createTask } from '@/app/actions/inbox';
import { TeamTaskCard } from './team-task-card';
import type { TeamMemberTasks, TeamMemberTask } from '@/app/actions/team-dashboard';
import type { DailyCheckin } from '@/app/actions/checkins';

// ─── Project Type Styles (shared with team-task-card) ────────────────────────

const PROJECT_TYPE_STYLES: Record<
  string,
  { icon: typeof Globe; color: string; bg: string; border: string }
> = {
  ai_agent: {
    icon: Bot,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  ai_platform: {
    icon: Sparkles,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  web_design: {
    icon: Globe,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  seo: {
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  app: {
    icon: Smartphone,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
  },
  ads: {
    icon: Megaphone,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getUniqueProjects(tasks: TeamMemberTask[]) {
  const map = new Map<string, { id: string; name: string; project_type: string | null }>();
  for (const t of tasks) {
    if (t.project && !map.has(t.project.id)) {
      map.set(t.project.id, t.project);
    }
  }
  return [...map.values()];
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TeamTaskSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* My tasks skeleton */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border/30">
          {[0, 1, 2].map((j) => (
            <div key={j} className="flex items-center gap-3 px-4 py-2.5">
              <div className="size-1.5 rounded-full bg-muted" />
              <div className="size-3.5 rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Team overview skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-3">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-muted" />
              <div className="h-3.5 w-16 rounded bg-muted" />
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline Quick-Add ─────────────────────────────────────────────────────────

interface InlineTaskAddProps {
  assigneeId: string;
  workspaceId: string;
  onCreated?: () => void;
}

function InlineTaskAdd({ assigneeId, workspaceId, onCreated }: InlineTaskAddProps) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    const fd = new FormData();
    fd.set('title', trimmed);
    fd.set('status', 'Todo');
    fd.set('show_in_inbox', 'true');
    fd.set('assignee_id', assigneeId);
    fd.set('due_date', format(new Date(), 'yyyy-MM-dd'));

    const result = await createTask(fd);
    setLoading(false);

    if (result.success) {
      setValue('');
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      invalidateTeamDashboard(workspaceId);
      onCreated?.();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setValue('');
      setActive(false);
    }
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => {
          setActive(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-muted-foreground/50 transition-colors hover:bg-muted/30 hover:text-muted-foreground"
      >
        <Plus className="size-3" />
        <span>Add task</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Plus className="size-3 shrink-0 text-muted-foreground/40" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!value.trim()) setActive(false);
        }}
        placeholder="Task name — Enter to create, Esc to cancel"
        disabled={loading}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
      />
      {loading && <Loader2 className="size-3 shrink-0 animate-spin text-primary" />}
    </div>
  );
}

// ─── My Tasks (full interactive task list) ───────────────────────────────────

function MyTaskList({
  member,
  currentUserId,
  onTaskUpdate,
  workspaceId,
}: {
  member: TeamMemberTasks;
  currentUserId?: string | null;
  onTaskUpdate?: () => void;
  workspaceId: string;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const activeTasks = member.tasks.filter((t) => t.status !== 'Done');
  const completedTasks = member.tasks.filter((t) => t.status === 'Done');

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="mb-2 size-6 text-emerald-500/40" />
          <p className="text-sm text-muted-foreground/70">All caught up</p>
        </div>
      ) : (
        <div className="divide-y divide-border/20">
          {activeTasks.map((task) => (
            <TeamTaskCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onTaskUpdate={onTaskUpdate}
              workspaceId={workspaceId}
              canInteract
            />
          ))}

          {completedTasks.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors hover:bg-muted/20"
              >
                <CheckCircle2 className="size-3 text-emerald-500" />
                <span className="font-medium text-emerald-500/80">
                  {completedTasks.length} done today
                </span>
                <ChevronDown
                  className={cn(
                    'ml-auto size-3 text-muted-foreground/40 transition-transform duration-200',
                    !showCompleted && '-rotate-90'
                  )}
                />
              </button>
              {showCompleted &&
                completedTasks.map((task) => (
                  <TeamTaskCard
                    key={task.id}
                    task={task}
                    currentUserId={currentUserId}
                    onTaskUpdate={onTaskUpdate}
                    workspaceId={workspaceId}
                    canInteract
                  />
                ))}
            </div>
          )}
        </div>
      )}
      <InlineTaskAdd
        assigneeId={member.profile.id}
        workspaceId={workspaceId}
        onCreated={onTaskUpdate}
      />
    </div>
  );
}

// ─── Team Overview Card (compact — projects + task count) ────────────────────

function TeamOverviewCard({ member }: { member: TeamMemberTasks }) {
  const { profile, tasks } = member;
  const activeTasks = tasks.filter((t) => t.status !== 'Done');
  const inProgress = activeTasks.filter((t) => t.status === 'In Progress').length;
  const projects = getUniqueProjects(activeTasks);

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/20">
      {/* Name row */}
      <div className="flex items-center gap-2">
        <Avatar className="size-7 shrink-0 ring-1 ring-border/20">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? ''} />
          <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
            {getInitials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {profile.full_name ?? 'Unknown'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}
            {inProgress > 0 && <span className="text-blue-500"> · {inProgress} active</span>}
          </p>
        </div>
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {projects.map((p) => {
            const style = p.project_type ? PROJECT_TYPE_STYLES[p.project_type] : null;
            const Icon = style?.icon || Folder;
            return (
              <span
                key={p.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                  style
                    ? `${style.bg} ${style.border} ${style.color}`
                    : 'border-border bg-muted/30 text-muted-foreground/70'
                )}
              >
                <Icon className="size-2.5" />
                {p.name}
              </span>
            );
          })}
        </div>
      )}

      {projects.length === 0 && activeTasks.length === 0 && (
        <p className="mt-1.5 text-[10px] text-muted-foreground/50">No active work</p>
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
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-all duration-200 hover:bg-muted/20"
        onClick={handleOpen}
      >
        <div className="flex size-6 items-center justify-center rounded-md bg-muted/40">
          <ClipboardList className="size-3.5 shrink-0 text-muted-foreground/70" />
        </div>
        <span className="flex-1 text-[13px] font-semibold tracking-tight text-foreground">
          Today&apos;s Check-ins
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2">
            <Filter className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="h-7 w-36 text-xs"
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
  const isMorning = checkin.checkin_type === 'morning';

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Avatar className="size-6 shrink-0">
          <AvatarImage
            src={checkin.profile?.avatar_url ?? undefined}
            alt={checkin.profile?.full_name ?? 'Member'}
          />
          <AvatarFallback className="text-xs">
            {getInitials(checkin.profile?.full_name ?? null)}
          </AvatarFallback>
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
              : 'border-primary/20 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10'
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

// ─── Main Container ──────────────────────────────────────────────────────────

interface TeamTaskContainerProps {
  workspaceId: string;
  userRole: string | null;
  currentUserId?: string | null;
  viewingAs?: boolean;
}

export function TeamTaskContainer({
  workspaceId,
  userRole,
  currentUserId,
  viewingAs = false,
}: TeamTaskContainerProps) {
  const isAdmin = userRole === 'admin' && !viewingAs;
  const { members, isLoading, isError, revalidate } = useTeamTaskDashboard(workspaceId);

  const handleTaskUpdate = useCallback(() => {
    revalidate();
  }, [revalidate]);

  const profiles = members.map((m) => ({
    id: m.profile.id,
    full_name: m.profile.full_name,
  }));

  // Find the current user's member data (for "My Tasks")
  const myMember = members.find((m) => m.profile.id === currentUserId) ?? null;
  // Everyone else (for "Team" overview)
  const otherMembers = members.filter((m) => m.profile.id !== currentUserId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {isLoading && <TeamTaskSkeleton />}

      {isError && !isLoading && (
        <p className="text-xs text-destructive">Failed to load team tasks.</p>
      )}

      {!isLoading && !isError && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
          {/* ── My Tasks ── */}
          {myMember && (
            <MyTaskList
              member={myMember}
              currentUserId={currentUserId}
              onTaskUpdate={handleTaskUpdate}
              workspaceId={workspaceId}
            />
          )}

          {/* ── Team Overview ── */}
          {otherMembers.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <Users className="size-3.5 text-muted-foreground/60" />
                <span className="text-xs font-semibold tracking-tight text-muted-foreground">
                  Team
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {otherMembers.map((member) => (
                  <TeamOverviewCard key={member.profile.id} member={member} />
                ))}
              </div>
            </div>
          )}

          {/* Admin: show all members as overview when not in the list */}
          {isAdmin && !myMember && members.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <Users className="size-3.5 text-muted-foreground/60" />
                <span className="text-xs font-semibold tracking-tight text-muted-foreground">
                  Team
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {members.map((member) => (
                  <TeamOverviewCard key={member.profile.id} member={member} />
                ))}
              </div>
            </div>
          )}

          {members.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-10 text-center">
              <Users className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground/70">No team members found</p>
            </div>
          )}

          {/* Admin check-ins */}
          {isAdmin && <AdminCheckinsSection workspaceId={workspaceId} profiles={profiles} />}
        </div>
      )}
    </div>
  );
}
