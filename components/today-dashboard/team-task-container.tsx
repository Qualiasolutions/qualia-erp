'use client';

import { useState, useCallback, useRef, memo } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ChevronDown,
  Users,
  ClipboardList,
  Filter,
  Plus,
  Loader2,
  CheckCircle2,
  Folder,
  Circle,
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
  useTeamStatus,
  invalidateInboxTasks,
  invalidateDailyFlow,
  invalidateTeamDashboard,
} from '@/lib/swr';
import { createTask } from '@/app/actions/inbox';
import { useRealtimeTasks } from '@/lib/hooks/use-realtime-tasks';
import { TeamTaskCard } from './team-task-card';
import type { TeamMemberTasks, TeamMemberTask } from '@/app/actions/team-dashboard';
import type { DailyCheckin } from '@/app/actions/checkins';

import { getProjectTypeStyle } from '@/lib/project-type-config';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    if (t.project && !map.has(t.project.id)) map.set(t.project.id, t.project);
  }
  return [...map.values()];
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function TeamTaskSkeleton() {
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 h-4 w-20 rounded bg-muted/60" />
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="divide-y divide-border/20">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex animate-pulse items-center gap-3 px-4 py-3">
                <div className="size-1.5 rounded-full bg-muted" />
                <div className="size-4 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="mb-2 h-4 w-16 rounded bg-muted/60" />
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-muted" />
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="ml-auto h-3 w-12 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Inline Quick-Add ───────────────────────────────────────────────────────

function InlineTaskAdd({
  assigneeId,
  workspaceId,
  onCreated,
}: {
  assigneeId: string;
  workspaceId: string;
  onCreated?: () => void;
}) {
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
    } else {
      toast.error(result.error || 'Failed to create task');
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
        className="flex w-full items-center gap-2 rounded-b-xl px-4 py-2 text-left text-[12px] text-muted-foreground/40 transition-colors hover:bg-muted/20 hover:text-muted-foreground/60"
      >
        <Plus className="size-3" />
        <span>Add task</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Plus className="size-3 shrink-0 text-muted-foreground/30" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') {
            setValue('');
            setActive(false);
          }
        }}
        onBlur={() => {
          if (!value.trim()) setActive(false);
        }}
        placeholder="Task name — Enter to save, Esc to cancel"
        disabled={loading}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/35 focus:outline-none"
      />
      {loading && <Loader2 className="size-3 shrink-0 animate-spin text-primary" />}
    </div>
  );
}

// ─── Person Task Section (expandable) ───────────────────────────────────────

const PersonTaskSection = memo(function PersonTaskSection({
  member,
  isMe = false,
  isOnline,
  currentUserId,
  onTaskUpdate,
  workspaceId,
  defaultExpanded = false,
}: {
  member: TeamMemberTasks;
  isMe?: boolean;
  isOnline?: boolean;
  currentUserId?: string | null;
  onTaskUpdate?: () => void;
  workspaceId: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showCompleted, setShowCompleted] = useState(false);
  const { profile, tasks } = member;
  const activeTasks = tasks.filter((t) => t.status !== 'Done');
  const completedTasks = tasks.filter((t) => t.status === 'Done');
  const inProgress = activeTasks.filter((t) => t.status === 'In Progress').length;
  const projects = getUniqueProjects(activeTasks);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border transition-colors duration-200',
        isMe
          ? 'border-primary/15 bg-card shadow-sm'
          : expanded
            ? 'border-border bg-card shadow-sm'
            : 'border-border/60 bg-card/50 hover:border-border hover:bg-card'
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150',
          expanded && 'border-b border-border/30'
        )}
      >
        <div className="relative shrink-0">
          <Avatar className={cn('size-7 ring-1', isMe ? 'ring-primary/20' : 'ring-border/30')}>
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? ''} />
            <AvatarFallback
              className={cn(
                'text-[11px] font-semibold',
                isMe ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground/60'
              )}
            >
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          {isOnline !== undefined && (
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full ring-2 ring-card',
                isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/25'
              )}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[13px] font-semibold',
                isMe ? 'text-foreground' : 'text-foreground/90'
              )}
            >
              {isMe ? 'My Tasks' : (profile.full_name ?? 'Unknown')}
            </span>
            {isMe && profile.full_name && (
              <span className="text-[11px] text-muted-foreground/40">
                {profile.full_name.split(' ')[0]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] tabular-nums text-muted-foreground/50">
              {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}
            </span>
            {inProgress > 0 && (
              <>
                <span className="text-[11px] text-muted-foreground/20">&middot;</span>
                <span className="text-[11px] font-medium text-blue-500">{inProgress} active</span>
              </>
            )}
            {completedTasks.length > 0 && (
              <>
                <span className="text-[11px] text-muted-foreground/20">&middot;</span>
                <span className="text-[11px] text-emerald-500/70">
                  {completedTasks.length} done
                </span>
              </>
            )}
          </div>
        </div>
        {!expanded && projects.length > 0 && (
          <div className="hidden flex-wrap gap-1 sm:flex">
            {projects.slice(0, 3).map((p) => {
              const style = getProjectTypeStyle(p.project_type ?? null);
              const Icon = style?.icon || Folder;
              return (
                <span
                  key={p.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                    style
                      ? `${style.bg} ${style.border} ${style.color}`
                      : 'border-border bg-muted/30 text-muted-foreground/60'
                  )}
                >
                  <Icon className="size-2.5" />
                  {p.name}
                </span>
              );
            })}
            {projects.length > 3 && (
              <span className="text-[10px] text-muted-foreground/40">+{projects.length - 3}</span>
            )}
          </div>
        )}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground/30 transition-transform duration-200',
            !expanded && '-rotate-90'
          )}
        />
      </button>

      {expanded && (
        <div>
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <CheckCircle2 className="mb-1 size-4 text-emerald-500/30" />
              <p className="text-[12px] text-muted-foreground/50">All caught up</p>
            </div>
          ) : (
            <div className="divide-y divide-border/15">
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
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-[12px] transition-colors hover:bg-muted/15"
                  >
                    <CheckCircle2 className="size-3 text-emerald-500/60" />
                    <span className="font-medium text-emerald-600/60 dark:text-emerald-400/60">
                      {completedTasks.length} done today
                    </span>
                    <ChevronDown
                      className={cn(
                        'ml-auto size-3 text-muted-foreground/30 transition-transform duration-200',
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
      )}
    </div>
  );
});

// ─── Admin Check-ins ────────────────────────────────────────────────────────

function AdminCheckinsSection({
  workspaceId,
  profiles,
}: {
  workspaceId: string;
  profiles: { id: string; full_name: string | null }[];
}) {
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
        setCheckins(await getCheckins(workspaceId, { date, limit: 100 }));
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const filteredCheckins =
    selectedProfileId === 'all'
      ? checkins
      : checkins.filter((c) => c.profile_id === selectedProfileId);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-colors hover:border-border hover:bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/15"
        onClick={() => {
          if (!open) loadCheckins(selectedDate);
          setOpen((v) => !v);
        }}
      >
        <ClipboardList className="size-4 shrink-0 text-muted-foreground/40" />
        <span className="flex-1 text-[13px] font-semibold text-foreground/80">Check-ins</span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground/30 transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border/30">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/30 bg-muted/10 px-4 py-2">
            <Filter className="size-3 shrink-0 text-muted-foreground/40" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                if (open) loadCheckins(e.target.value);
              }}
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
          <div className="max-h-72 divide-y divide-border/20 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
              </div>
            ) : filteredCheckins.length === 0 ? (
              <div className="py-8 text-center">
                <ClipboardList className="mx-auto mb-2 size-6 text-muted-foreground/20" />
                <p className="text-[12px] text-muted-foreground/40">
                  No check-ins for {format(new Date(selectedDate + 'T12:00:00'), 'MMMM d')}
                </p>
              </div>
            ) : (
              filteredCheckins.map((c) => <CheckinRow key={c.id} checkin={c} />)
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
      <div className="mb-1.5 flex items-center gap-2">
        <Avatar className="size-5 shrink-0">
          <AvatarImage src={checkin.profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[8px]">
            {getInitials(checkin.profile?.full_name ?? null)}
          </AvatarFallback>
        </Avatar>
        <span className="text-[12px] font-medium text-foreground/80">
          {checkin.profile?.full_name ?? 'Unknown'}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'ml-1 h-4 shrink-0 px-1.5 text-[9px]',
            isMorning
              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
              : 'border-primary/20 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10'
          )}
        >
          {isMorning ? 'AM' : 'PM'}
        </Badge>
      </div>
      <div className="space-y-1 pl-7">
        {isMorning ? (
          <>
            {(checkin.planned_tasks ?? []).map((task, i) => (
              <p key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                <Circle className="mt-1 size-1.5 shrink-0 fill-muted-foreground/30 text-muted-foreground/30" />
                {task}
              </p>
            ))}
            {checkin.blockers && (
              <p className="text-[11px] text-red-600 dark:text-red-400">
                <span className="font-medium">Blocker:</span> {checkin.blockers}
              </p>
            )}
          </>
        ) : (
          <>
            {(checkin.completed_tasks ?? []).map((task, i) => (
              <p key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                <CheckCircle2 className="mt-0.5 size-2.5 shrink-0 text-emerald-500/50" />
                {task}
              </p>
            ))}
            {checkin.wins && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                <span className="font-medium">Win:</span> {checkin.wins}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Container ─────────────────────────────────────────────────────────

export function TeamTaskContainer({
  workspaceId,
  userRole,
  currentUserId,
  viewingAs = false,
}: {
  workspaceId: string;
  userRole: string | null;
  currentUserId?: string | null;
  viewingAs?: boolean;
}) {
  const isAdmin = userRole === 'admin' && !viewingAs;
  const { members, isLoading, isError, revalidate } = useTeamTaskDashboard(workspaceId);
  const { members: teamStatusMembers } = useTeamStatus(isAdmin ? workspaceId : null);
  useRealtimeTasks(workspaceId);
  const handleTaskUpdate = useCallback(() => {
    revalidate();
  }, [revalidate]);

  const onlineMap = new Map<string, boolean>();
  for (const m of teamStatusMembers) onlineMap.set(m.profileId, m.status === 'online');

  const profiles = members.map((m) => ({ id: m.profile.id, full_name: m.profile.full_name }));
  const myMember = members.find((m) => m.profile.id === currentUserId) ?? null;
  const otherMembers = members.filter((m) => m.profile.id !== currentUserId);
  const totalActive = members.reduce(
    (s, m) => s + m.tasks.filter((t) => t.status !== 'Done').length,
    0
  );
  const totalDone = members.reduce(
    (s, m) => s + m.tasks.filter((t) => t.status === 'Done').length,
    0
  );

  return (
    <div className="space-y-2.5">
      {isLoading && <TeamTaskSkeleton />}
      {isError && !isLoading && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-[13px] text-destructive">Failed to load team tasks.</p>
        </div>
      )}
      {!isLoading && !isError && (
        <>
          {(totalActive > 0 || totalDone > 0) && (
            <div className="flex items-center gap-4 text-[11px] tabular-nums text-muted-foreground/50">
              <span>
                <span className="font-semibold text-foreground/70">{totalActive}</span> active
              </span>
              {totalDone > 0 && (
                <span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {totalDone}
                  </span>{' '}
                  done today
                </span>
              )}
              <span>
                <span className="font-semibold text-foreground/70">{members.length}</span> members
              </span>
            </div>
          )}
          {myMember && (
            <PersonTaskSection
              member={myMember}
              isMe
              isOnline={onlineMap.get(myMember.profile.id)}
              currentUserId={currentUserId}
              onTaskUpdate={handleTaskUpdate}
              workspaceId={workspaceId}
              defaultExpanded
            />
          )}
          {/* Team members — show otherMembers if I'm in the list, otherwise all members */}
          {(myMember ? otherMembers : members).length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-0.5">
                <Users className="size-3.5 text-muted-foreground/40" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  Team
                </span>
              </div>
              <div className="space-y-1.5">
                {(myMember ? otherMembers : members).map((m) => (
                  <PersonTaskSection
                    key={m.profile.id}
                    member={m}
                    isOnline={onlineMap.get(m.profile.id)}
                    currentUserId={currentUserId}
                    onTaskUpdate={handleTaskUpdate}
                    workspaceId={workspaceId}
                  />
                ))}
              </div>
            </div>
          )}
          {members.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card/50 py-12 text-center">
              <Users className="mb-2 size-7 text-muted-foreground/20" />
              <p className="text-[13px] text-muted-foreground/50">No team members found</p>
            </div>
          )}
          {isAdmin && <AdminCheckinsSection workspaceId={workspaceId} profiles={profiles} />}
        </>
      )}
    </div>
  );
}
