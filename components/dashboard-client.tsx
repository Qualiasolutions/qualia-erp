'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Video,
  VideoOff,
  Plus,
  Clock,
  Copy,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { createInstantMeeting, updateMeetingLink, deleteMeeting } from '@/app/actions';
import { quickUpdateTask, type Task } from '@/app/actions/inbox';
import { createGoogleMeetLink } from '@/lib/google-meet';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  workspaceId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
  creator?: { id: string; full_name: string | null } | null;
}

interface DashboardClientProps {
  greeting: string;
  dateString: string;
  user?: DashboardUser;
  todaysTasks?: Task[];
  upcomingMeetings?: Meeting[];
  pendingTasks?: Task[];
}

function TaskItem({
  task,
  onComplete,
  isPending,
}: {
  task: Task;
  onComplete: (id: string) => void;
  isPending: boolean;
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/15 bg-card/60 p-4 transition-all hover:border-white/30 hover:bg-card/80">
      <button
        onClick={() => onComplete(task.id)}
        disabled={isPending}
        className="flex h-6 w-6 shrink-0 items-center justify-center"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Circle className="h-6 w-6 text-white/30 transition-colors group-hover:text-primary" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{task.title}</p>
        {task.project && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{task.project.name}</p>
        )}
      </div>
      {isOverdue && (
        <span className="shrink-0 rounded-md bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
          Overdue
        </span>
      )}
    </div>
  );
}

function MeetingItem({
  meeting,
  onUpdateLink,
  onDelete,
  currentUserId,
  autoShowLinkInput = false,
}: {
  meeting: Meeting;
  onUpdateLink: (meetingId: string, link: string) => void;
  onDelete: (meetingId: string) => void;
  currentUserId?: string;
  autoShowLinkInput?: boolean;
}) {
  const [showLinkInput, setShowLinkInput] = useState(autoShowLinkInput);
  const [linkValue, setLinkValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const startTime = new Date(meeting.start_time);
  const isNow = isToday(startTime) && startTime <= new Date();
  const isCreator = meeting.creator?.id === currentUserId;
  const hasLink = !!meeting.meeting_link;

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete(meeting.id);
  };

  const handleSaveLink = () => {
    if (linkValue.trim()) {
      onUpdateLink(meeting.id, linkValue.trim());
      setShowLinkInput(false);
      setLinkValue('');
    }
  };

  const copyLink = () => {
    if (meeting.meeting_link) {
      navigator.clipboard.writeText(meeting.meeting_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-all',
        isNow
          ? 'border-primary/60 bg-primary/10'
          : 'border-white/15 bg-card/60 hover:border-white/30 hover:bg-card/80'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {isNow && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                Live
              </span>
            )}
            <h3 className="truncate text-base font-semibold text-foreground">{meeting.title}</h3>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(startTime, 'h:mm a')}
              {!isToday(startTime) && ` - ${format(startTime, 'MMM d')}`}
            </span>
            {meeting.client && (
              <>
                <span className="text-white/20">·</span>
                <span>{meeting.client.display_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Delete button for creator */}
          {isCreator && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          )}
          {hasLink ? (
            <>
              <button
                onClick={copyLink}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground hover:border-white/30 hover:bg-white/5 hover:text-foreground"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <a
                href={meeting.meeting_link!}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                  isNow
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-white/20 bg-white/5 text-foreground hover:border-white/40 hover:bg-white/10'
                )}
              >
                <Video className="h-4 w-4" />
                Join
              </a>
            </>
          ) : isCreator ? (
            showLinkInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="Paste Meet link..."
                  className="h-9 w-44 rounded-lg border border-white/20 bg-white/5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button
                  onClick={handleSaveLink}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowLinkInput(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLinkInput(true)}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-foreground hover:border-white/40 hover:bg-white/10"
              >
                <Video className="h-4 w-4" />
                Add Link
              </button>
            )
          ) : (
            <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
              <VideoOff className="h-4 w-4" />
              No link
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({
  greeting,
  dateString,
  user,
  todaysTasks = [],
  upcomingMeetings = [],
  pendingTasks = [],
}: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState(upcomingMeetings);
  const [tasks, setTasks] = useState(todaysTasks);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [justCreatedMeetingId, setJustCreatedMeetingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMeetings(upcomingMeetings);
  }, [upcomingMeetings]);

  useEffect(() => {
    setTasks(todaysTasks);
  }, [todaysTasks]);

  const handleCompleteTask = useCallback((taskId: string) => {
    setCompletingTaskId(taskId);
    startTransition(async () => {
      await quickUpdateTask(taskId, { status: 'Done' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setCompletingTaskId(null);
    });
  }, []);

  const handleCreateInstantMeeting = useCallback(() => {
    setIsCreatingMeeting(true);
    startTransition(async () => {
      const result = await createInstantMeeting();
      if (result.success && result.data) {
        const newMeeting = result.data as Meeting;
        setMeetings((prev) => [newMeeting, ...prev]);
        // Track this meeting so the link input auto-shows
        setJustCreatedMeetingId(newMeeting.id);
        // Open Google Meet in new tab
        window.open(createGoogleMeetLink(), '_blank');
      }
      setIsCreatingMeeting(false);
    });
  }, []);

  const handleUpdateMeetingLink = useCallback(
    (meetingId: string, link: string) => {
      startTransition(async () => {
        const result = await updateMeetingLink(meetingId, link);
        if (result.success) {
          setMeetings((prev) =>
            prev.map((m) => (m.id === meetingId ? { ...m, meeting_link: link } : m))
          );
          // Clear the just-created flag once link is saved
          if (meetingId === justCreatedMeetingId) {
            setJustCreatedMeetingId(null);
          }
        }
      });
    },
    [justCreatedMeetingId]
  );

  const handleDeleteMeeting = useCallback((meetingId: string) => {
    startTransition(async () => {
      const result = await deleteMeeting(meetingId);
      if (result.success) {
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      }
    });
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const todayMeetings = meetings.filter((m) => isToday(new Date(m.start_time)));
  const upcomingOtherMeetings = meetings.filter((m) => !isToday(new Date(m.start_time)));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10 bg-card/30 px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-foreground">{greeting}</h1>
          <p className="mt-2 text-base text-muted-foreground">{dateString}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Tasks */}
          <div className="space-y-8">
            {/* Today's Tasks */}
            <section className="rounded-2xl border border-white/10 bg-card/40 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Today&apos;s Tasks</h2>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {tasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/projects"
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-white/30 hover:text-foreground"
                  >
                    View All
                  </Link>
                  <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-3.5 w-3.5" />
                    Add Task
                  </button>
                </div>
              </div>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onComplete={handleCompleteTask}
                      isPending={completingTaskId === task.id}
                    />
                  ))}
                  {tasks.length > 5 && (
                    <button className="w-full rounded-lg border border-white/10 py-3 text-center text-sm font-medium text-muted-foreground hover:border-white/20 hover:text-foreground">
                      +{tasks.length - 5} more tasks
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/20 py-12 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/60" />
                  <p className="mt-3 text-base text-muted-foreground">All caught up!</p>
                  <button className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-foreground hover:bg-white/15">
                    Add a new task
                  </button>
                </div>
              )}
            </section>

            {/* Pending Items */}
            {pendingTasks.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-card/40 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">Waiting on You</h2>
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                      {pendingTasks.length}
                    </span>
                  </div>
                  <button className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-white/30 hover:text-foreground">
                    Mark All Done
                  </button>
                </div>
                <div className="space-y-3">
                  {pendingTasks.slice(0, 3).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onComplete={handleCompleteTask}
                      isPending={completingTaskId === task.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Meetings */}
          <div className="space-y-8">
            <section className="rounded-2xl border border-white/10 bg-card/40 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Meetings</h2>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {meetings.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/schedule"
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-white/30 hover:text-foreground"
                  >
                    View Calendar
                  </a>
                  <button
                    onClick={handleCreateInstantMeeting}
                    disabled={isCreatingMeeting || isPending}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                      'bg-primary text-primary-foreground hover:bg-primary/90',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                  >
                    {isCreatingMeeting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Instant Meeting
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {/* Today's Meetings */}
                {todayMeetings.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Today</p>
                    {todayMeetings.map((meeting) => (
                      <MeetingItem
                        key={meeting.id}
                        meeting={meeting}
                        onUpdateLink={handleUpdateMeetingLink}
                        onDelete={handleDeleteMeeting}
                        currentUserId={user?.id}
                        autoShowLinkInput={meeting.id === justCreatedMeetingId}
                      />
                    ))}
                  </div>
                )}

                {/* Upcoming Meetings */}
                {upcomingOtherMeetings.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                    {upcomingOtherMeetings.slice(0, 3).map((meeting) => (
                      <MeetingItem
                        key={meeting.id}
                        meeting={meeting}
                        onUpdateLink={handleUpdateMeetingLink}
                        onDelete={handleDeleteMeeting}
                        currentUserId={user?.id}
                        autoShowLinkInput={meeting.id === justCreatedMeetingId}
                      />
                    ))}
                    {upcomingOtherMeetings.length > 3 && (
                      <a
                        href="/schedule"
                        className="block w-full rounded-lg border border-white/10 py-3 text-center text-sm font-medium text-muted-foreground hover:border-white/20 hover:text-foreground"
                      >
                        +{upcomingOtherMeetings.length - 3} more meetings
                      </a>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {meetings.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/20 py-12 text-center">
                    <Video className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 text-base text-muted-foreground">No meetings scheduled</p>
                    <button
                      onClick={handleCreateInstantMeeting}
                      disabled={isCreatingMeeting}
                      className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Start Instant Meeting
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Quick Actions Panel */}
            <section className="rounded-2xl border border-white/10 bg-card/40 p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/projects"
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center transition-all hover:border-white/25 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                    <Plus className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">New Project</span>
                </Link>
                <Link
                  href="/clients"
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center transition-all hover:border-white/25 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Plus className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">New Client</span>
                </Link>
                <Link
                  href="/documents"
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center transition-all hover:border-white/25 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                    <Plus className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">New Document</span>
                </Link>
                <button
                  onClick={handleCreateInstantMeeting}
                  disabled={isCreatingMeeting}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center transition-all hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                    <Video className="h-5 w-5 text-orange-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Quick Meet</span>
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Press{' '}
            <kbd className="rounded-md border border-white/20 bg-white/5 px-2 py-1 font-mono text-xs text-foreground">
              ⌘K
            </kbd>{' '}
            for quick navigation
          </p>
        </div>
      </div>
    </div>
  );
}
