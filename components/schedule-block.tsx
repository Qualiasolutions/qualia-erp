'use client';

import { useState, useMemo, useTransition, useCallback } from 'react';
import { Plus, Circle, CheckCircle2, ChevronDown, Clock, CalendarDays, Video } from 'lucide-react';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { quickToggleTaskStatus, createTask } from '@/app/actions/inbox';
import type { Task } from '@/app/actions/inbox';
import type { MeetingWithRelations } from '@/lib/swr';
import { invalidateScheduledTasks, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { useTimezone } from '@/lib/schedule-shared';
import { USER_COLORS } from '@/lib/color-constants';
import { EditTaskModal } from './edit-task-modal';
import { NewTaskModal } from './new-task-modal';

interface TeamMember {
  id: string;
  name: string;
  initial: string;
  profileId?: string;
}

interface ScheduleBlockProps {
  scheduledTasks: Task[];
  backlogTasks: Task[];
  meetings: MeetingWithRelations[];
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }[];
  unified?: boolean;
}

const TIME_SLOTS = [
  '8 AM',
  '9 AM',
  '10 AM',
  '11 AM',
  '12 PM',
  '1 PM',
  '2 PM',
  '3 PM',
  '4 PM',
  '5 PM',
];
const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function getTagColor(tag?: string | null) {
  if (!tag) return '';
  const map: Record<string, string> = {
    Testing: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    Production: 'bg-qualia-50 text-qualia-700 dark:bg-qualia-500/10 dark:text-qualia-400',
    Client: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    Review: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
    Strategy: 'bg-qualia-50 text-qualia-700 dark:bg-qualia-500/10 dark:text-qualia-400',
    Research: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    Analytics: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    Design: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
    Operations: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
    Meeting: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  };
  return map[tag] || 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400';
}

function getPriorityFromTask(priority: string): 'high' | 'normal' {
  return priority === 'Urgent' || priority === 'High' ? 'high' : 'normal';
}

function getPhaseTag(task: Task): string | null {
  if (task.phase_name) return task.phase_name;
  if (task.project?.project_type) {
    const typeMap: Record<string, string> = {
      web_design: 'Design',
      ai_agent: 'AI',
      voice_agent: 'Voice',
      seo: 'SEO',
      ads: 'Ads',
    };
    return typeMap[task.project.project_type] || null;
  }
  return null;
}

export function ScheduleBlock({
  scheduledTasks,
  backlogTasks,
  meetings,
  profiles,
  unified = false,
}: ScheduleBlockProps) {
  const { timezone } = useTimezone();
  const [isPending, startTransition] = useTransition();
  const [completedOptimistic, setCompletedOptimistic] = useState<Set<string>>(new Set());
  const [uncompletedOptimistic, setUncompletedOptimistic] = useState<Set<string>>(new Set());
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [quickAddValue, setQuickAddValue] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTime, setNewTaskTime] = useState<string | null>(null);
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string | null>(null);

  // Build team members from profiles
  const teamMembers: TeamMember[] = useMemo(() => {
    return profiles.map((p) => ({
      id: p.full_name?.toLowerCase().replace(/\s+/g, '-') || p.id,
      name: p.full_name?.split(' ')[0] || 'Unknown',
      initial: (p.full_name?.[0] || 'U').toUpperCase(),
      profileId: p.id,
    }));
  }, [profiles]);

  // Get current date in timezone
  const currentDate = useMemo(() => toZonedTime(new Date(), timezone), [timezone]);

  // Group scheduled tasks by member and time slot
  const memberSchedule = useMemo(() => {
    const schedule = new Map<
      string,
      Map<number, (Task & { isMeeting?: boolean; meetingLink?: string | null })[]>
    >();

    // Initialize for each member
    for (const member of teamMembers) {
      const memberSlots = new Map<
        number,
        (Task & { isMeeting?: boolean; meetingLink?: string | null })[]
      >();
      for (const hour of SLOT_HOURS) {
        memberSlots.set(hour, []);
      }
      schedule.set(member.profileId || member.id, memberSlots);
    }

    // Place tasks into slots
    for (const task of scheduledTasks) {
      if (!task.scheduled_start_time) continue;

      const startTime = toZonedTime(parseISO(task.scheduled_start_time), timezone);
      if (!isSameDay(startTime, startOfDay(currentDate))) continue;

      const hour = startTime.getHours();
      const assigneeId = task.assignee?.id;

      if (assigneeId && schedule.has(assigneeId)) {
        const memberSlots = schedule.get(assigneeId)!;
        const slotTasks = memberSlots.get(hour) || [];
        slotTasks.push(task);
        memberSlots.set(hour, slotTasks);
      } else {
        // Unassigned - add to first member
        const firstMemberId = teamMembers[0]?.profileId || teamMembers[0]?.id;
        if (firstMemberId && schedule.has(firstMemberId)) {
          const memberSlots = schedule.get(firstMemberId)!;
          const slotTasks = memberSlots.get(hour) || [];
          slotTasks.push(task);
          memberSlots.set(hour, slotTasks);
        }
      }
    }

    // Place meetings into slots
    for (const meeting of meetings) {
      if (!meeting.start_time) continue;

      const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
      if (!isSameDay(startTime, startOfDay(currentDate))) continue;

      const hour = startTime.getHours();
      const endTime = meeting.end_time ? toZonedTime(parseISO(meeting.end_time), timezone) : null;

      // Create a pseudo-task for the meeting
      const meetingTask: Task & { isMeeting?: boolean; meetingLink?: string | null } = {
        id: `meeting-${meeting.id}`,
        workspace_id: '',
        creator_id: null,
        assignee_id: null,
        project_id: null,
        title: meeting.title,
        description: meeting.description,
        status: 'Todo' as const,
        priority: 'No Priority' as const,
        item_type: 'task' as const,
        phase_name: 'Meeting',
        sort_order: 0,
        due_date: null,
        completed_at: null,
        scheduled_start_time: meeting.start_time,
        scheduled_end_time: meeting.end_time,
        show_in_inbox: false,
        created_at: meeting.created_at,
        updated_at: meeting.created_at,
        isMeeting: true,
        meetingLink: meeting.meeting_link,
        project: meeting.project
          ? { id: meeting.project.id, name: meeting.project.name, project_type: null }
          : null,
      };

      // Add meeting to attendees or creator
      const attendeeIds =
        meeting.attendees
          ?.map((a) => {
            const profile = Array.isArray(a.profile) ? a.profile[0] : a.profile;
            return profile?.id;
          })
          .filter(Boolean) || [];
      const creatorId = (Array.isArray(meeting.creator) ? meeting.creator[0] : meeting.creator)?.id;

      const targetIds = attendeeIds.length > 0 ? attendeeIds : creatorId ? [creatorId] : [];

      if (targetIds.length === 0 && teamMembers.length > 0) {
        // No attendees - add to all members
        for (const member of teamMembers) {
          const memberId = member.profileId || member.id;
          if (schedule.has(memberId)) {
            const memberSlots = schedule.get(memberId)!;
            const slotTasks = memberSlots.get(hour) || [];
            slotTasks.push({
              ...meetingTask,
              scheduled_end_time: endTime ? meeting.end_time : null,
            });
            memberSlots.set(hour, slotTasks);
            break; // Only add to first member if no assignees
          }
        }
      } else {
        for (const targetId of targetIds) {
          if (targetId && schedule.has(targetId)) {
            const memberSlots = schedule.get(targetId)!;
            const slotTasks = memberSlots.get(hour) || [];
            slotTasks.push(meetingTask);
            memberSlots.set(hour, slotTasks);
          }
        }
      }
    }

    return schedule;
  }, [scheduledTasks, meetings, teamMembers, currentDate, timezone]);

  // Build unified schedule when unified=true
  const unifiedSchedule = useMemo(() => {
    if (!unified) return null;

    const schedule = new Map<
      number,
      (Task & { isMeeting?: boolean; meetingLink?: string | null })[]
    >();

    // Initialize all time slots
    for (const hour of SLOT_HOURS) {
      schedule.set(hour, []);
    }

    // Add all scheduled tasks (regardless of assignee)
    for (const task of scheduledTasks) {
      if (!task.scheduled_start_time) continue;

      const startTime = toZonedTime(parseISO(task.scheduled_start_time), timezone);
      if (!isSameDay(startTime, startOfDay(currentDate))) continue;

      const hour = startTime.getHours();
      const slotTasks = schedule.get(hour) || [];
      slotTasks.push(task);
      schedule.set(hour, slotTasks);
    }

    // Add all meetings
    for (const meeting of meetings) {
      if (!meeting.start_time) continue;

      const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
      if (!isSameDay(startTime, startOfDay(currentDate))) continue;

      const hour = startTime.getHours();

      // Create pseudo-task for meeting
      const meetingTask: Task & { isMeeting?: boolean; meetingLink?: string | null } = {
        id: `meeting-${meeting.id}`,
        workspace_id: '',
        creator_id: null,
        assignee_id: null,
        project_id: null,
        title: meeting.title,
        description: meeting.description,
        status: 'Todo' as const,
        priority: 'No Priority' as const,
        item_type: 'task' as const,
        phase_name: 'Meeting',
        sort_order: 0,
        due_date: null,
        completed_at: null,
        scheduled_start_time: meeting.start_time,
        scheduled_end_time: meeting.end_time,
        show_in_inbox: false,
        created_at: meeting.created_at,
        updated_at: meeting.created_at,
        isMeeting: true,
        meetingLink: meeting.meeting_link,
        project: meeting.project
          ? { id: meeting.project.id, name: meeting.project.name, project_type: null }
          : null,
      };

      const slotTasks = schedule.get(hour) || [];
      slotTasks.push(meetingTask);
      schedule.set(hour, slotTasks);
    }

    return schedule;
  }, [unified, scheduledTasks, meetings, currentDate, timezone]);

  // Stats
  const totalTasks = scheduledTasks.filter((t) => {
    const start = t.scheduled_start_time
      ? toZonedTime(parseISO(t.scheduled_start_time), timezone)
      : null;
    return start && isSameDay(start, startOfDay(currentDate));
  }).length;

  const doneTasks = scheduledTasks.filter((t) => {
    const start = t.scheduled_start_time
      ? toZonedTime(parseISO(t.scheduled_start_time), timezone)
      : null;
    if (!start || !isSameDay(start, startOfDay(currentDate))) return false;

    const isOptimisticallyDone = completedOptimistic.has(t.id);
    const isOptimisticallyUndone = uncompletedOptimistic.has(t.id);
    if (isOptimisticallyDone) return true;
    if (isOptimisticallyUndone) return false;
    return t.status === 'Done';
  }).length;

  const todayMeetings = meetings.filter((m) => {
    const start = toZonedTime(parseISO(m.start_time), timezone);
    return isSameDay(start, startOfDay(currentDate));
  });

  const isTaskDone = useCallback(
    (task: Task) => {
      if (completedOptimistic.has(task.id)) return true;
      if (uncompletedOptimistic.has(task.id)) return false;
      return task.status === 'Done';
    },
    [completedOptimistic, uncompletedOptimistic]
  );

  const toggleComplete = useCallback(
    (task: Task) => {
      const wasDone = isTaskDone(task);

      // Optimistic update
      if (wasDone) {
        setCompletedOptimistic((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        setUncompletedOptimistic((prev) => new Set(prev).add(task.id));
      } else {
        setUncompletedOptimistic((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        setCompletedOptimistic((prev) => new Set(prev).add(task.id));
      }

      startTransition(async () => {
        await quickToggleTaskStatus(task.id);
        invalidateScheduledTasks(undefined, true);
        invalidateDailyFlow(true);
      });
    },
    [isTaskDone]
  );

  const handleQuickAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickAddValue.trim()) return;

      const formData = new FormData();
      formData.set('title', quickAddValue.trim());
      formData.set('status', 'Todo');
      formData.set('show_in_inbox', 'true');

      // Auto-assign to the filtered member
      if (activeFilter !== 'all') {
        formData.set('assignee_id', activeFilter);
      }

      startTransition(async () => {
        await createTask(formData);
        setQuickAddValue('');
        invalidateInboxTasks(true);
        invalidateScheduledTasks(undefined, true);
        invalidateDailyFlow(true);
      });
    },
    [quickAddValue, activeFilter]
  );

  // Filter members by profileId for reliable matching
  const filteredMembers = useMemo(() => {
    if (unified) {
      // Unified mode: single virtual column
      return [{ id: 'unified', name: 'Schedule', initial: 'S' }];
    }
    if (activeFilter === 'all') return teamMembers;
    return teamMembers.filter((m) => m.profileId === activeFilter);
  }, [unified, activeFilter, teamMembers]);

  // Build filter options from team members — All first, then member names
  const filterOptions = useMemo(() => {
    const options: { key: string; label: string }[] = [{ key: 'all', label: 'All' }];
    for (const m of teamMembers) {
      options.push({ key: m.profileId || m.id, label: m.name });
    }
    return options;
  }, [teamMembers]);

  // Current filter label for display
  const activeFilterLabel = useMemo(() => {
    return filterOptions.find((f) => f.key === activeFilter)?.label || 'All';
  }, [filterOptions, activeFilter]);

  // Determine first/last active time slot
  const activeTimeRange = useMemo(() => {
    let earliest = 17;
    let latest = 8;

    for (const [, memberSlots] of memberSchedule) {
      for (const [hour, tasks] of memberSlots) {
        if (tasks.length > 0) {
          earliest = Math.min(earliest, hour);
          latest = Math.max(latest, hour);
        }
      }
    }

    return { start: earliest, end: latest };
  }, [memberSchedule]);

  return (
    <>
      <div className="w-full">
        {/* Top Bar */}
        <div className="mb-4 flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">Schedule</p>
              <p className="mt-0.5 text-xs tracking-wide text-muted-foreground">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            {/* Member Toggle */}
            {!unified && filterOptions.length > 2 && (
              <div className="flex items-center rounded-lg border border-border bg-card">
                {filterOptions.map((f, i) => (
                  <button
                    type="button"
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={cn(
                      'h-8 px-3.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                      i === 0 && 'rounded-l-lg',
                      i === filterOptions.length - 1 && 'rounded-r-lg',
                      activeFilter === f.key
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs font-medium text-foreground">{totalTasks} tasks</span>
              <span className="mx-1 h-3 w-px bg-border" />
              <span className="text-xs font-medium text-qualia-600 dark:text-qualia-400">
                {doneTasks} done
              </span>
            </div>
            {todayMeetings.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
                <Video className="h-3.5 w-3.5 text-violet-500" strokeWidth={1.5} />
                <span className="text-xs font-medium text-foreground">
                  {todayMeetings.length} meeting{todayMeetings.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs font-medium text-foreground">
                {activeTimeRange.start > 12
                  ? `${activeTimeRange.start - 12} PM`
                  : `${activeTimeRange.start} AM`}
                {' \u2013 '}
                {activeTimeRange.end + 1 > 12
                  ? `${activeTimeRange.end + 1 - 12} PM`
                  : `${activeTimeRange.end + 1} AM`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick-add */}
        <div className="mb-3">
          <form onSubmit={handleQuickAdd} className="relative">
            <input
              type="text"
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder={
                activeFilter !== 'all'
                  ? `Quick add task for ${activeFilterLabel}...`
                  : 'Quick add task...'
              }
              className="h-9 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-qualia-500/50 focus:ring-1 focus:ring-qualia-500/20"
            />
          </form>
        </div>

        {/* Backlog Toggle */}
        <button
          type="button"
          onClick={() => setBacklogOpen(!backlogOpen)}
          className="mb-3 flex items-center gap-2 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', backlogOpen && 'rotate-180')}
            strokeWidth={1.5}
          />
          <span className="font-medium uppercase tracking-wide">Backlog</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
            {backlogTasks.length}
          </span>
        </button>

        {backlogOpen && (
          <div className="mb-3 space-y-1 rounded-xl border border-border bg-card p-3">
            {backlogTasks.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No backlog tasks</p>
            ) : (
              backlogTasks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/60"
                >
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {item.title}
                  </span>
                  {item.assignee && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {item.assignee.full_name?.[0] || '?'}
                    </span>
                  )}
                  {item.project && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {item.project.name}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Schedule Grid */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Member Headers */}
          <div
            className="grid border-b border-border"
            style={{
              gridTemplateColumns: `56px repeat(${filteredMembers.length}, 1fr)`,
            }}
          >
            <div className="border-r border-border" />
            {filteredMembers.map((member, i) => {
              const memberKey = member.name.toLowerCase() as keyof typeof USER_COLORS;
              const colors = USER_COLORS[memberKey];

              return (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center justify-between px-5 py-3',
                    i < filteredMembers.length - 1 && 'border-r border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {!unified && (
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold',
                          colors ? `${colors.bg} ${colors.text}` : 'bg-foreground text-background'
                        )}
                      >
                        {member.initial}
                      </div>
                    )}
                    <span className="text-sm font-semibold tracking-wide text-foreground">
                      {member.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <ScrollArea className="h-[560px]">
            {TIME_SLOTS.map((time, timeIdx) => {
              const hour = SLOT_HOURS[timeIdx];

              return (
                <div
                  key={time}
                  className={cn(
                    'grid',
                    timeIdx < TIME_SLOTS.length - 1 && 'border-b border-border/50'
                  )}
                  style={{
                    gridTemplateColumns: `56px repeat(${filteredMembers.length}, 1fr)`,
                  }}
                >
                  {/* Time Label */}
                  <div className="flex items-start justify-end border-r border-border px-2.5 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {time}
                    </span>
                  </div>

                  {/* Task Cells */}
                  {filteredMembers.map((member, memberIdx) => {
                    // Use unified schedule if unified mode, otherwise use member schedule
                    let slotItems: (Task & { isMeeting?: boolean; meetingLink?: string | null })[] =
                      [];
                    if (unified) {
                      slotItems = unifiedSchedule?.get(hour) || [];
                    } else {
                      const memberId = member.profileId || member.id;
                      const memberSlots = memberSchedule.get(memberId);
                      slotItems = memberSlots?.get(hour) || [];
                    }

                    // For unified mode, show all items; for member mode, show first item only
                    const displayItems = unified ? slotItems : slotItems.slice(0, 1);
                    const task = displayItems[0] as
                      | (Task & { isMeeting?: boolean; meetingLink?: string | null })
                      | undefined;
                    const isDone = task ? (task.isMeeting ? false : isTaskDone(task)) : false;
                    const isInProgress = task?.status === 'In Progress' && !isDone;
                    const isMeetingItem = task?.isMeeting;

                    return (
                      <div
                        key={`${member.id}-${time}`}
                        className={cn(
                          'group relative min-h-[72px] px-4 py-3 transition-all',
                          memberIdx < filteredMembers.length - 1 && 'border-r border-border/50',
                          isInProgress && 'border-l-2 border-l-qualia-500 bg-qualia-500/[0.03]',
                          isMeetingItem &&
                            !isInProgress &&
                            'border-l-2 border-l-violet-500 bg-violet-500/[0.03]'
                        )}
                      >
                        {displayItems.length > 0 ? (
                          <div className="space-y-3">
                            {displayItems.map((item, itemIdx) => {
                              const itemIsDone = item.isMeeting ? false : isTaskDone(item);
                              const itemIsInProgress = item.status === 'In Progress' && !itemIsDone;
                              const itemIsMeeting = item.isMeeting;

                              return (
                                <div
                                  key={item.id}
                                  className={cn(
                                    'flex items-start gap-3 transition-opacity duration-300',
                                    itemIsDone && 'opacity-35',
                                    itemIdx > 0 && 'border-t border-border/30 pt-3'
                                  )}
                                >
                                  {!itemIsMeeting ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleComplete(item)}
                                      disabled={isPending}
                                      className="mt-[1px] shrink-0 transition-transform active:scale-90"
                                      aria-label={itemIsDone ? 'Mark incomplete' : 'Mark complete'}
                                    >
                                      {itemIsDone ? (
                                        <CheckCircle2
                                          className="h-[15px] w-[15px] text-qualia-500"
                                          strokeWidth={2}
                                        />
                                      ) : (
                                        <Circle
                                          className={cn(
                                            'h-[15px] w-[15px] transition-colors',
                                            itemIsInProgress
                                              ? 'text-qualia-500'
                                              : 'text-border hover:text-foreground/40'
                                          )}
                                          strokeWidth={1.5}
                                        />
                                      )}
                                    </button>
                                  ) : (
                                    <Video
                                      className="mt-[1px] h-[15px] w-[15px] shrink-0 text-violet-500"
                                      strokeWidth={1.5}
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={cn(
                                        'text-[13px] leading-[1.45]',
                                        itemIsDone
                                          ? 'text-muted-foreground line-through decoration-muted-foreground/30'
                                          : itemIsInProgress
                                            ? 'font-medium text-foreground'
                                            : itemIsMeeting
                                              ? 'font-medium text-foreground'
                                              : 'text-foreground/90'
                                      )}
                                    >
                                      {item.title}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                      {item.scheduled_start_time && item.scheduled_end_time && (
                                        <span className="text-[10px] tracking-wide text-muted-foreground/70">
                                          {format(
                                            toZonedTime(
                                              parseISO(item.scheduled_start_time),
                                              timezone
                                            ),
                                            'h:mm'
                                          )}
                                          {' \u2013 '}
                                          {format(
                                            toZonedTime(
                                              parseISO(item.scheduled_end_time),
                                              timezone
                                            ),
                                            'h:mm a'
                                          )}
                                        </span>
                                      )}
                                      {!itemIsDone && (
                                        <>
                                          {itemIsMeeting && (
                                            <span
                                              className={cn(
                                                'rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider',
                                                getTagColor('Meeting')
                                              )}
                                            >
                                              Meeting
                                            </span>
                                          )}
                                          {!itemIsMeeting && getPhaseTag(item) && (
                                            <span
                                              className={cn(
                                                'rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider',
                                                getTagColor(getPhaseTag(item))
                                              )}
                                            >
                                              {getPhaseTag(item)}
                                            </span>
                                          )}
                                          {item.project && (
                                            <span className="truncate text-[10px] text-muted-foreground/60">
                                              {item.project.name}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    {itemIsMeeting &&
                                      (item as Task & { meetingLink?: string | null })
                                        .meetingLink &&
                                      !itemIsDone && (
                                        <a
                                          href={
                                            (item as Task & { meetingLink?: string | null })
                                              .meetingLink!
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Video className="h-2.5 w-2.5" />
                                          Join
                                        </a>
                                      )}
                                  </div>
                                  {!itemIsMeeting &&
                                    getPriorityFromTask(item.priority) === 'high' &&
                                    !itemIsDone && (
                                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-qualia-500" />
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewTaskTime(`${hour}:00`);
                              setNewTaskAssigneeId(unified ? null : member.profileId || null);
                              setIsTaskModalOpen(true);
                            }}
                            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Add task"
                          >
                            <Plus className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </ScrollArea>

          {/* Bottom summary strip */}
          <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {doneTasks} of {totalTasks} completed
              </span>
              <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-qualia-500 transition-all duration-500"
                  style={{
                    width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewTaskAssigneeId(activeFilter !== 'all' ? activeFilter : null);
                setIsTaskModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3 w-3" strokeWidth={1.5} />
              Add task
            </button>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}

      {/* New Task Modal */}
      <NewTaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        defaultAssigneeId={newTaskAssigneeId}
        defaultScheduledTime={newTaskTime}
      />
    </>
  );
}
