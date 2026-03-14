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
import { useTimezone } from '@/lib/schedule-utils';
import { USER_COLORS } from '@/lib/color-constants';
import { EditTaskModal } from './edit-task-modal';
import { EditMeetingModal } from './edit-meeting-modal';
import { NewTaskModal } from './new-task-modal';
import { TaskDetailDialog } from './task-detail-dialog';
import { MeetingDetailDialog } from './meeting-detail-dialog';

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
  readOnly?: boolean;
  meetingsSidebar?: React.ReactNode;
}

const DEFAULT_SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const HASAN_SLOT_HOURS = [18, 19, 20, 21, 22, 23];
const SLOT_HEIGHT = 72; // must match min-h-[72px] on grid cells

function getTimeLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

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
    Operations: 'bg-muted text-muted-foreground',
    Meeting: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  };
  return map[tag] || 'bg-muted text-muted-foreground';
}

// Calculate span info for an item within a member's slot range
function calcSpanInfo(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  memberHours: number[]
): { spanHours: number; topOffsetPx: number; heightPx: number } {
  const lastSlot = memberHours[memberHours.length - 1];
  // How many whole grid rows this item covers (for hiding cells underneath)
  const effectiveEnd = Math.min(endMinute > 0 ? endHour + 1 : endHour, lastSlot + 1);
  const spanHours = Math.max(1, effectiveEnd - startHour);
  // Pixel offset from top of starting cell (e.g., :30 start = half-cell down)
  const topOffsetPx = (startMinute / 60) * SLOT_HEIGHT;
  // Actual pixel height based on exact duration
  const totalStartMin = startHour * 60 + startMinute;
  const totalEndMin = endHour * 60 + endMinute;
  const durationMin = totalEndMin - totalStartMin;
  const heightPx = Math.max(SLOT_HEIGHT * 0.5, (durationMin / 60) * SLOT_HEIGHT);
  return { spanHours, topOffsetPx, heightPx };
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
  readOnly = false,
  meetingsSidebar,
}: ScheduleBlockProps) {
  const { timezone } = useTimezone();
  const [isPending, startTransition] = useTransition();
  const [completedOptimistic, setCompletedOptimistic] = useState<Set<string>>(new Set());
  const [uncompletedOptimistic, setUncompletedOptimistic] = useState<Set<string>>(new Set());
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [quickAddValue, setQuickAddValue] = useState('');
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<MeetingWithRelations | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<MeetingWithRelations | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTime, setNewTaskTime] = useState<string | null>(null);
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string | null>(null);

  // Build team members from profiles (exclude profiles without names)
  const teamMembers: TeamMember[] = useMemo(() => {
    return profiles
      .filter((p) => p.full_name)
      .map((p) => ({
        id: p.full_name!.toLowerCase().replace(/\s+/g, '-'),
        name: p.full_name!.split(' ')[0],
        initial: p.full_name![0].toUpperCase(),
        profileId: p.id,
      }));
  }, [profiles]);

  // Determine slot hours per member (Hasan gets evening hours)
  const getMemberSlotHours = useCallback((member: TeamMember): number[] => {
    if (member.name.toLowerCase() === 'hasan') return HASAN_SLOT_HOURS;
    return DEFAULT_SLOT_HOURS;
  }, []);

  // Meetings lookup for editing (meeting pseudo-task id → original meeting)
  const meetingsMap = useMemo(() => {
    const map = new Map<string, MeetingWithRelations>();
    for (const m of meetings) {
      map.set(`meeting-${m.id}`, m);
    }
    return map;
  }, [meetings]);

  // Get current date in timezone
  const currentDate = useMemo(() => toZonedTime(new Date(), timezone), [timezone]);

  // Extended task type with span info
  type SpannableTask = Task & {
    isMeeting?: boolean;
    meetingLink?: string | null;
    spanHours?: number; // how many whole hour slots this item covers (for grid cell hiding)
    topOffsetPx?: number; // pixel offset from top of starting cell
    heightPx?: number; // actual pixel height based on duration
  };

  // Group scheduled tasks by member — items placed at their start hour with span info
  const memberSchedule = useMemo(() => {
    const schedule = new Map<string, Map<number, SpannableTask[]>>();

    // Initialize for each member with their specific hours
    for (const member of teamMembers) {
      const memberSlots = new Map<number, SpannableTask[]>();
      const hours = getMemberSlotHours(member);
      for (const hour of hours) {
        memberSlots.set(hour, []);
      }
      schedule.set(member.profileId || member.id, memberSlots);
    }

    // Place tasks into slots
    for (const task of scheduledTasks) {
      if (!task.scheduled_start_time) continue;

      const startTime = toZonedTime(parseISO(task.scheduled_start_time), timezone);
      if (!isSameDay(startTime, startOfDay(currentDate))) continue;

      const startHour = startTime.getHours();
      const assigneeId = task.assignee?.id;

      // Calculate span
      let spanHours = 1;
      let topOffsetPx = (startTime.getMinutes() / 60) * SLOT_HEIGHT;
      let heightPx = SLOT_HEIGHT;
      if (task.scheduled_end_time) {
        const endTime = toZonedTime(parseISO(task.scheduled_end_time), timezone);
        const member = teamMembers.find((m) => (m.profileId || m.id) === assigneeId);
        const memberHours = member ? getMemberSlotHours(member) : DEFAULT_SLOT_HOURS;
        const info = calcSpanInfo(
          startHour,
          startTime.getMinutes(),
          endTime.getHours(),
          endTime.getMinutes(),
          memberHours
        );
        spanHours = info.spanHours;
        topOffsetPx = info.topOffsetPx;
        heightPx = info.heightPx;
      }

      const spannableTask: SpannableTask = { ...task, spanHours, topOffsetPx, heightPx };

      if (assigneeId && schedule.has(assigneeId)) {
        const memberSlots = schedule.get(assigneeId)!;
        const slotTasks = memberSlots.get(startHour) || [];
        slotTasks.push(spannableTask);
        memberSlots.set(startHour, slotTasks);
      } else {
        const firstMemberId = teamMembers[0]?.profileId || teamMembers[0]?.id;
        if (firstMemberId && schedule.has(firstMemberId)) {
          const memberSlots = schedule.get(firstMemberId)!;
          const slotTasks = memberSlots.get(startHour) || [];
          slotTasks.push(spannableTask);
          memberSlots.set(startHour, slotTasks);
        }
      }
    }

    // Place meetings into slots
    for (const meeting of meetings) {
      if (!meeting.start_time) continue;

      const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
      if (!isSameDay(startTime, startOfDay(currentDate))) continue;

      const startHour = startTime.getHours();
      const endTime = meeting.end_time ? toZonedTime(parseISO(meeting.end_time), timezone) : null;

      // Create a pseudo-task for the meeting
      const meetingTask: SpannableTask = {
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
        spanHours: 1,
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

      // Calculate span for each target member
      const addToMember = (memberId: string) => {
        if (!schedule.has(memberId)) return;
        const memberSlots = schedule.get(memberId)!;
        const member = teamMembers.find((m) => (m.profileId || m.id) === memberId);
        const memberHours = member ? getMemberSlotHours(member) : DEFAULT_SLOT_HOURS;
        const startMinute = startTime.getMinutes();
        if (endTime) {
          const info = calcSpanInfo(
            startHour,
            startMinute,
            endTime.getHours(),
            endTime.getMinutes(),
            memberHours
          );
          const slotTasks = memberSlots.get(startHour) || [];
          slotTasks.push({
            ...meetingTask,
            spanHours: info.spanHours,
            topOffsetPx: info.topOffsetPx,
            heightPx: info.heightPx,
          });
          memberSlots.set(startHour, slotTasks);
        } else {
          const slotTasks = memberSlots.get(startHour) || [];
          slotTasks.push({
            ...meetingTask,
            spanHours: 1,
            topOffsetPx: (startMinute / 60) * SLOT_HEIGHT,
            heightPx: SLOT_HEIGHT,
          });
          memberSlots.set(startHour, slotTasks);
        }
      };

      if (targetIds.length === 0 && teamMembers.length > 0) {
        // No attendees - add to first member only
        const memberId = teamMembers[0]?.profileId || teamMembers[0]?.id;
        if (memberId) addToMember(memberId);
      } else {
        for (const targetId of targetIds) {
          if (targetId) addToMember(targetId);
        }
      }
    }

    return schedule;
  }, [scheduledTasks, meetings, teamMembers, currentDate, timezone, getMemberSlotHours]);

  // Build unified schedule when unified=true
  const unifiedSchedule = useMemo(() => {
    if (!unified) return null;

    const schedule = new Map<number, SpannableTask[]>();

    // Use the actual member's hours (e.g. Hasan gets evening slots)
    const member = teamMembers[0];
    const slotHours = member ? getMemberSlotHours(member) : DEFAULT_SLOT_HOURS;

    for (const hour of slotHours) {
      schedule.set(hour, []);
    }

    // Add all scheduled tasks (regardless of assignee)
    for (const task of scheduledTasks) {
      if (!task.scheduled_start_time) continue;

      const startTime = toZonedTime(parseISO(task.scheduled_start_time), timezone);
      if (!isSameDay(startTime, startOfDay(currentDate))) continue;

      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      let spanHours = 1;
      let topOffsetPx = (startMinute / 60) * SLOT_HEIGHT;
      let heightPx = SLOT_HEIGHT;
      if (task.scheduled_end_time) {
        const endTime = toZonedTime(parseISO(task.scheduled_end_time), timezone);
        const info = calcSpanInfo(
          startHour,
          startMinute,
          endTime.getHours(),
          endTime.getMinutes(),
          slotHours
        );
        spanHours = info.spanHours;
        topOffsetPx = info.topOffsetPx;
        heightPx = info.heightPx;
      }

      const slotTasks = schedule.get(startHour) || [];
      slotTasks.push({ ...task, spanHours, topOffsetPx, heightPx });
      schedule.set(startHour, slotTasks);
    }

    // Add all meetings
    for (const meeting of meetings) {
      if (!meeting.start_time) continue;

      const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
      if (!isSameDay(startTime, startOfDay(currentDate))) continue;

      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const endTime = meeting.end_time ? toZonedTime(parseISO(meeting.end_time), timezone) : null;

      let spanHours = 1;
      let topOffsetPx = (startMinute / 60) * SLOT_HEIGHT;
      let heightPx = SLOT_HEIGHT;
      if (endTime) {
        const info = calcSpanInfo(
          startHour,
          startMinute,
          endTime.getHours(),
          endTime.getMinutes(),
          slotHours
        );
        spanHours = info.spanHours;
        topOffsetPx = info.topOffsetPx;
        heightPx = info.heightPx;
      }

      const meetingTask: SpannableTask = {
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
        spanHours,
        topOffsetPx,
        heightPx,
      };

      const slotTasks = schedule.get(startHour) || [];
      slotTasks.push(meetingTask);
      schedule.set(startHour, slotTasks);
    }

    return schedule;
  }, [unified, scheduledTasks, meetings, currentDate, timezone, teamMembers, getMemberSlotHours]);

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
      // Unified mode: use the single team member's name (not generic "Schedule")
      const member = teamMembers[0];
      return [
        {
          id: 'unified',
          name: member?.name || 'My Schedule',
          initial: member?.initial || 'S',
          profileId: member?.profileId,
        },
      ];
    }
    if (activeFilter === 'all') return teamMembers;
    return teamMembers.filter((m) => m.profileId === activeFilter);
  }, [unified, activeFilter, teamMembers]);

  // Compute union of all hour slots across visible members
  const visibleSlotHours = useMemo(() => {
    if (unified) {
      // Use the actual member's hours (e.g. Hasan gets evening slots)
      const member = teamMembers[0];
      if (member) return getMemberSlotHours(member);
      return DEFAULT_SLOT_HOURS;
    }
    const hourSet = new Set<number>();
    for (const member of filteredMembers) {
      const hours = getMemberSlotHours(member);
      for (const h of hours) hourSet.add(h);
    }
    return Array.from(hourSet).sort((a, b) => a - b);
  }, [unified, filteredMembers, getMemberSlotHours]);

  // Which hours each member is active (for dimming out-of-range cells)
  const memberActiveHours = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const member of filteredMembers) {
      const hours = getMemberSlotHours(member);
      map.set(member.profileId || member.id, new Set(hours));
    }
    return map;
  }, [filteredMembers, getMemberSlotHours]);

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
    let earliest = visibleSlotHours[visibleSlotHours.length - 1] || 17;
    let latest = visibleSlotHours[0] || 8;

    for (const [, memberSlots] of memberSchedule) {
      for (const [hour, tasks] of memberSlots) {
        if (tasks.length > 0) {
          earliest = Math.min(earliest, hour);
          latest = Math.max(latest, hour);
        }
      }
    }

    return { start: earliest, end: latest };
  }, [memberSchedule, visibleSlotHours]);

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
        {!readOnly && (
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
        )}

        {/* Backlog Toggle */}
        {!readOnly && (
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
        )}

        {backlogOpen && !readOnly && (
          <div className="mb-3 space-y-1 rounded-xl border border-border bg-card p-3">
            {backlogTasks.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No backlog tasks</p>
            ) : (
              backlogTasks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/60"
                >
                  <button
                    type="button"
                    onClick={() => toggleComplete(item)}
                    disabled={isPending}
                    className="group/check flex size-7 shrink-0 items-center justify-center rounded-full transition-all hover:bg-muted/60 active:scale-90"
                    aria-label="Mark complete"
                  >
                    <Circle
                      className="size-4 text-muted-foreground/40 transition-colors group-hover/check:text-qualia-400"
                      strokeWidth={1.5}
                    />
                  </button>
                  <span
                    className="min-w-0 flex-1 cursor-pointer truncate text-sm text-foreground transition-colors hover:text-foreground/80"
                    onClick={() => setViewingTask(item)}
                  >
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

        {/* Schedule Grid + Meetings Sidebar */}
        <div className="flex gap-4">
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
              {(() => {
                // Pre-compute which cells are "covered" by a spanning item from a previous row
                // Key: `${memberId}-${hour}` → true if covered
                const coveredCells = new Set<string>();

                for (const member of filteredMembers) {
                  const memberId = member.profileId || member.id;
                  const slots = unified ? unifiedSchedule : memberSchedule.get(memberId);
                  if (!slots) continue;

                  for (const [startHour, items] of slots) {
                    for (const item of items) {
                      const span = (item as SpannableTask).spanHours || 1;
                      if (span > 1) {
                        for (let h = 1; h < span; h++) {
                          coveredCells.add(`${memberId}-${startHour + h}`);
                        }
                      }
                    }
                  }
                }

                return (
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `56px repeat(${filteredMembers.length}, 1fr)`,
                      gridTemplateRows: `repeat(${visibleSlotHours.length}, minmax(${SLOT_HEIGHT}px, auto))`,
                    }}
                  >
                    {visibleSlotHours.flatMap((hour, timeIdx) => {
                      const rowStart = timeIdx + 1;
                      const isLastRow = timeIdx === visibleSlotHours.length - 1;

                      const cells = [
                        /* Time Label */
                        <div
                          key={`time-${hour}`}
                          className={cn(
                            'flex items-start justify-end border-r border-border px-2.5 pt-3',
                            !isLastRow && 'border-b border-border/50'
                          )}
                          style={{ gridRow: rowStart, gridColumn: 1 }}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {getTimeLabel(hour)}
                          </span>
                        </div>,
                      ];

                      /* Task Cells */
                      filteredMembers.forEach((member, memberIdx) => {
                        const memberId = member.profileId || member.id;
                        const activeHours = memberActiveHours.get(memberId);
                        const isOutOfRange = activeHours && !activeHours.has(hour);
                        const colIdx = memberIdx + 2;

                        // Covered by a spanning item — skip (the spanning cell above covers it)
                        if (coveredCells.has(`${memberId}-${hour}`)) return;

                        // Get items for this slot
                        let slotItems: SpannableTask[] = [];
                        if (unified) {
                          slotItems = unifiedSchedule?.get(hour) || [];
                        } else {
                          const memberSlots = memberSchedule.get(memberId);
                          slotItems = (memberSlots?.get(hour) || []) as SpannableTask[];
                        }

                        const displayItems = unified ? slotItems : slotItems.slice(0, 1);
                        const task = displayItems[0];
                        const isDone = task ? (task.isMeeting ? false : isTaskDone(task)) : false;
                        const isInProgress = task?.status === 'In Progress' && !isDone;
                        const isMeetingItem = task?.isMeeting;
                        const spanRows = task?.spanHours || 1;

                        // Get precise pixel values from the first item
                        const itemTopOffset = task?.topOffsetPx || 0;
                        const itemHeight = task?.heightPx || SLOT_HEIGHT;

                        cells.push(
                          <div
                            key={`${member.id}-${hour}`}
                            className={cn(
                              'group relative min-h-[72px] transition-all',
                              memberIdx < filteredMembers.length - 1 && 'border-r border-border/50',
                              // Only add bottom border if this cell doesn't span to the last row
                              !isLastRow &&
                                timeIdx + spanRows - 1 < visibleSlotHours.length - 1 &&
                                'border-b border-border/50',
                              isOutOfRange && !displayItems.length && 'bg-muted/10'
                            )}
                            style={{
                              gridRow: spanRows > 1 ? `${rowStart} / span ${spanRows}` : rowStart,
                              gridColumn: colIdx,
                            }}
                          >
                            {displayItems.length > 0 ? (
                              <div
                                className={cn(
                                  'absolute left-0 right-0 z-10 overflow-hidden px-4 py-3',
                                  isInProgress &&
                                    'border-l-2 border-l-qualia-500 bg-qualia-500/[0.03]',
                                  isMeetingItem &&
                                    !isInProgress &&
                                    'border-l-2 border-l-violet-500 bg-violet-500/[0.03]'
                                )}
                                style={{
                                  top: `${itemTopOffset}px`,
                                  height: `${itemHeight}px`,
                                }}
                              >
                                {displayItems.map((item, itemIdx) => {
                                  const itemIsDone = item.isMeeting ? false : isTaskDone(item);
                                  const itemIsInProgress =
                                    item.status === 'In Progress' && !itemIsDone;
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
                                          className="group/check -ml-1 flex size-7 shrink-0 items-center justify-center rounded-full transition-all hover:bg-muted/60 active:scale-90"
                                          aria-label={
                                            itemIsDone ? 'Mark incomplete' : 'Mark complete'
                                          }
                                        >
                                          {itemIsDone ? (
                                            <CheckCircle2
                                              className="size-4 text-qualia-500 transition-colors group-hover/check:text-qualia-400"
                                              strokeWidth={2}
                                            />
                                          ) : (
                                            <Circle
                                              className={cn(
                                                'size-4 transition-colors group-hover/check:text-qualia-400',
                                                itemIsInProgress ? 'text-qualia-500' : 'text-border'
                                              )}
                                              strokeWidth={1.5}
                                            />
                                          )}
                                        </button>
                                      ) : (
                                        <div className="flex size-7 shrink-0 items-center justify-center">
                                          <Video
                                            className="size-4 text-violet-500"
                                            strokeWidth={1.5}
                                          />
                                        </div>
                                      )}
                                      <div
                                        className="min-w-0 flex-1 cursor-pointer"
                                        onClick={() => {
                                          if (itemIsMeeting) {
                                            const original = meetingsMap.get(item.id);
                                            if (original) setViewingMeeting(original);
                                          } else {
                                            setViewingTask(item);
                                          }
                                        }}
                                      >
                                        <p
                                          className={cn(
                                            'text-[13px] leading-[1.45] transition-colors',
                                            itemIsDone
                                              ? 'text-muted-foreground line-through decoration-muted-foreground/30'
                                              : itemIsInProgress
                                                ? 'font-medium text-foreground hover:text-qualia-600 dark:hover:text-qualia-400'
                                                : itemIsMeeting
                                                  ? 'font-medium text-foreground hover:text-violet-600 dark:hover:text-violet-400'
                                                  : 'text-foreground/90 hover:text-foreground'
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
                                          (item as SpannableTask & { meetingLink?: string | null })
                                            .meetingLink &&
                                          !itemIsDone && (
                                            <a
                                              href={
                                                (
                                                  item as SpannableTask & {
                                                    meetingLink?: string | null;
                                                  }
                                                ).meetingLink!
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
                            ) : !readOnly ? (
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
                                <Plus
                                  className="h-4 w-4 text-muted-foreground/40"
                                  strokeWidth={1.5}
                                />
                              </button>
                            ) : null}
                          </div>
                        );
                      });

                      return cells;
                    })}
                  </div>
                );
              })()}
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
              {!readOnly && (
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
              )}
            </div>
          </div>
          {/* Meetings Sidebar — same height as schedule grid */}
          {meetingsSidebar && (
            <div className="hidden w-[22%] min-w-[220px] max-w-[300px] shrink-0 lg:block">
              {meetingsSidebar}
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={viewingTask}
        open={!!viewingTask}
        onOpenChange={(open) => {
          if (!open) setViewingTask(null);
        }}
        onEdit={(task) => {
          setViewingTask(null);
          setEditingTask(task);
        }}
        onToggleDone={(task) => {
          toggleComplete(task);
        }}
        isDone={viewingTask ? isTaskDone(viewingTask) : false}
      />

      {/* Meeting Detail Dialog */}
      <MeetingDetailDialog
        meeting={viewingMeeting}
        open={!!viewingMeeting}
        onOpenChange={(open) => {
          if (!open) setViewingMeeting(null);
        }}
        onEdit={(meeting) => {
          setViewingMeeting(null);
          setEditingMeeting(meeting);
        }}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTask(null);
              invalidateScheduledTasks(undefined, true);
              invalidateDailyFlow(true);
            }
          }}
        />
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <EditMeetingModal
          meeting={{
            id: editingMeeting.id,
            title: editingMeeting.title,
            description: editingMeeting.description,
            start_time: editingMeeting.start_time,
            end_time: editingMeeting.end_time,
            meeting_link: editingMeeting.meeting_link,
            project: editingMeeting.project
              ? {
                  id: (Array.isArray(editingMeeting.project)
                    ? editingMeeting.project[0]
                    : editingMeeting.project
                  ).id,
                  name: (Array.isArray(editingMeeting.project)
                    ? editingMeeting.project[0]
                    : editingMeeting.project
                  ).name,
                }
              : null,
            attendees: editingMeeting.attendees,
          }}
          open={!!editingMeeting}
          onOpenChange={(open) => {
            if (!open) {
              setEditingMeeting(null);
              invalidateScheduledTasks(undefined, true);
              invalidateDailyFlow(true);
            }
          }}
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
