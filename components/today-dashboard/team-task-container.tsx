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
import type { TeamMemberTasks } from '@/app/actions/team-dashboard';
import type { DailyCheckin } from '@/app/actions/checkins';

// ─── Brand Accent ────────────────────────────────────────────────────────────

const MEMBER_ACCENT = {
  bar: 'bg-primary',
  light: 'bg-primary/10',
  text: 'text-primary',
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TeamTaskSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="h-1 w-full bg-muted" />
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="size-9 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
          <div className="mx-4 mb-2 h-1 rounded-full bg-muted" />
          <div className="divide-y divide-border/30 border-t border-border/30">
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
      ))}
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

// ─── Member Group (2×2 Grid Card) ────────────────────────────────────────────

interface MemberGroupProps {
  member: TeamMemberTasks;
  workspaceId: string;
  canInteract?: boolean;
  isOwner?: boolean;
  currentUserId?: string | null;
  onTaskUpdate?: () => void;
}

function MemberGroup({
  member,
  workspaceId,
  canInteract = false,
  isOwner = false,
  currentUserId,
  onTaskUpdate,
}: MemberGroupProps) {
  const [open, setOpen] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const { profile, tasks: allTasks } = member;
  const activeTasks = allTasks.filter((t) => t.status !== 'Done');
  const completedTasks = allTasks.filter((t) => t.status === 'Done');
  const inProgressCount = activeTasks.filter((t) => t.status === 'In Progress').length;
  const accent = MEMBER_ACCENT;

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-md',
        isOwner ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
      )}
    >
      {/* Accent bar */}
      <div className={cn('h-1 w-full', accent.bar)} />

      {/* Header */}
      <button
        type="button"
        className="flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 hover:bg-muted/20"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar
          className={cn('size-9 shrink-0 ring-2', isOwner ? 'ring-primary/30' : 'ring-border/20')}
        >
          <AvatarImage
            src={profile.avatar_url ?? undefined}
            alt={profile.full_name ?? 'Team member'}
          />
          <AvatarFallback className={cn('text-xs font-semibold', accent.light, accent.text)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {profile.full_name ?? 'Unknown'}
            </span>
            {isOwner && (
              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{activeTasks.length} active</span>
            {inProgressCount > 0 && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-blue-500">{inProgressCount} in progress</span>
              </>
            )}
            {completedTasks.length > 0 && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-emerald-500">{completedTasks.length} done</span>
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
      </button>

      {/* Progress bar */}
      {allTasks.length > 0 && (
        <div className="mx-4 mb-2 h-1 overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full rounded-full bg-emerald-500/70 transition-all duration-500"
            style={{
              width: `${(completedTasks.length / allTasks.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Tasks */}
      {open && (
        <div className="flex-1 divide-y divide-border/20 border-t border-border/30">
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <p className="px-4 py-4 text-center text-xs text-muted-foreground/60">
              No active tasks
            </p>
          ) : (
            <>
              {activeTasks.map((task) => (
                <TeamTaskCard
                  key={task.id}
                  task={task}
                  currentUserId={currentUserId}
                  onTaskUpdate={onTaskUpdate}
                  workspaceId={workspaceId}
                  canInteract={canInteract}
                />
              ))}

              {/* Completed today section */}
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
                        canInteract={canInteract}
                      />
                    ))}
                </div>
              )}
            </>
          )}
          {canInteract && (
            <InlineTaskAdd
              assigneeId={profile.id}
              workspaceId={workspaceId}
              onCreated={onTaskUpdate}
            />
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
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Header toggle */}
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
          {/* Filter bar */}
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Loading */}
      {isLoading && <TeamTaskSkeleton />}

      {/* Error */}
      {isError && !isLoading && (
        <p className="text-xs text-destructive">Failed to load team tasks.</p>
      )}

      {/* Content — 2×2 grid for all roles */}
      {!isLoading && !isError && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-10 text-center">
              <Users className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground/70">No team members found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {members.map((member, i) => (
                <div
                  key={member.profile.id}
                  className="animate-stagger-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <MemberGroup
                    member={member}
                    workspaceId={workspaceId}
                    canInteract={member.profile.id === currentUserId || isAdmin}
                    isOwner={member.profile.id === currentUserId}
                    currentUserId={currentUserId}
                    onTaskUpdate={handleTaskUpdate}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Admin check-ins — below the grid */}
          {isAdmin && <AdminCheckinsSection workspaceId={workspaceId} profiles={profiles} />}
        </div>
      )}
    </div>
  );
}
