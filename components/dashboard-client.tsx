'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
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
import { createInstantMeeting, updateMeetingLink } from '@/app/actions';
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
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-3 transition-all hover:border-border hover:bg-card">
      <button
        onClick={() => onComplete(task.id)}
        disabled={isPending}
        className="flex h-5 w-5 shrink-0 items-center justify-center"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/50 transition-colors group-hover:text-primary" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
        {task.project && (
          <p className="truncate text-xs text-muted-foreground">{task.project.name}</p>
        )}
      </div>
      {isOverdue && <span className="shrink-0 text-xs font-medium text-red-500">Overdue</span>}
    </div>
  );
}

function MeetingItem({
  meeting,
  onUpdateLink,
  currentUserId,
  autoShowLinkInput = false,
}: {
  meeting: Meeting;
  onUpdateLink: (meetingId: string, link: string) => void;
  currentUserId?: string;
  autoShowLinkInput?: boolean;
}) {
  const [showLinkInput, setShowLinkInput] = useState(autoShowLinkInput);
  const [linkValue, setLinkValue] = useState('');
  const [copied, setCopied] = useState(false);

  const startTime = new Date(meeting.start_time);
  const isNow = isToday(startTime) && startTime <= new Date();
  const isCreator = meeting.creator?.id === currentUserId;
  const hasLink = !!meeting.meeting_link;

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
        'rounded-lg border p-4 transition-all',
        isNow
          ? 'border-primary/50 bg-primary/5'
          : 'border-border/60 bg-card/50 hover:border-border hover:bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isNow && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Live
              </span>
            )}
            <h3 className="truncate text-sm font-medium text-foreground">{meeting.title}</h3>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {format(startTime, 'h:mm a')}
              {!isToday(startTime) && ` - ${format(startTime, 'MMM d')}`}
            </span>
            {meeting.client && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{meeting.client.display_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {hasLink ? (
            <>
              <button
                onClick={copyLink}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
              <a
                href={meeting.meeting_link!}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
                  isNow
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border bg-background text-foreground hover:bg-muted'
                )}
              >
                <Video className="h-3.5 w-3.5" />
                Join
              </a>
            </>
          ) : isCreator ? (
            showLinkInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="Paste Meet link..."
                  className="h-7 w-40 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button
                  onClick={handleSaveLink}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowLinkInput(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLinkInput(true)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <Video className="h-3.5 w-3.5" />
                Add Link
              </button>
            )
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <VideoOff className="h-3.5 w-3.5" />
              No link yet
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
      <div className="border-b border-border px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-foreground">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dateString}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Tasks */}
          <div className="space-y-6">
            {/* Today's Tasks */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Today&apos;s Tasks
                </h2>
                <span className="text-xs text-muted-foreground">
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onComplete={handleCompleteTask}
                      isPending={completingTaskId === task.id}
                    />
                  ))}
                  {tasks.length > 5 && (
                    <p className="pt-1 text-center text-xs text-muted-foreground">
                      +{tasks.length - 5} more tasks
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 py-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/50" />
                  <p className="mt-2 text-sm text-muted-foreground">All caught up!</p>
                </div>
              )}
            </section>

            {/* Pending Items */}
            {pendingTasks.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Waiting on You
                  </h2>
                  <span className="text-xs text-muted-foreground">{pendingTasks.length}</span>
                </div>
                <div className="space-y-2">
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
          <div>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Meetings
                </h2>
                <button
                  onClick={handleCreateInstantMeeting}
                  disabled={isCreatingMeeting || isPending}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    'border border-primary/50 text-primary hover:bg-primary/10',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {isCreatingMeeting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Start Instant Meeting
                </button>
              </div>

              <div className="space-y-4">
                {/* Today's Meetings */}
                {todayMeetings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Today</p>
                    {todayMeetings.map((meeting) => (
                      <MeetingItem
                        key={meeting.id}
                        meeting={meeting}
                        onUpdateLink={handleUpdateMeetingLink}
                        currentUserId={user?.id}
                        autoShowLinkInput={meeting.id === justCreatedMeetingId}
                      />
                    ))}
                  </div>
                )}

                {/* Upcoming Meetings */}
                {upcomingOtherMeetings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
                    {upcomingOtherMeetings.slice(0, 3).map((meeting) => (
                      <MeetingItem
                        key={meeting.id}
                        meeting={meeting}
                        onUpdateLink={handleUpdateMeetingLink}
                        currentUserId={user?.id}
                        autoShowLinkInput={meeting.id === justCreatedMeetingId}
                      />
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {meetings.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/60 py-8 text-center">
                    <Video className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">No meetings scheduled</p>
                    <button
                      onClick={handleCreateInstantMeeting}
                      disabled={isCreatingMeeting}
                      className="mt-3 text-xs font-medium text-primary hover:underline"
                    >
                      Start an instant meeting
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Press{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>{' '}
            for quick navigation
          </p>
        </div>
      </div>
    </div>
  );
}
