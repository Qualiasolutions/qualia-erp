'use client';

import * as React from 'react';
import { useTransition, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodaysTasks, useTodaysMeetings, invalidateTodaysSchedule } from '@/lib/swr';
import { quickUpdateTask } from '@/app/actions/inbox';
import { ScheduleHeader } from './schedule-header';
import { TimeBlockGrid } from './time-block-grid';
import { ProductivityPanel } from './productivity-panel';
import { EditTaskModal } from '@/components/edit-task-modal';
import type { Task } from '@/app/actions/inbox';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
}

interface DailyScheduleHubProps {
  initialTasks?: Task[];
  initialMeetings?: Meeting[];
}

export function DailyScheduleHub({
  initialTasks = [],
  initialMeetings = [],
}: DailyScheduleHubProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Use SWR hooks with fallback to initial data
  const { tasks, isValidating: isTasksValidating, revalidate: revalidateTasks } = useTodaysTasks();
  const {
    meetings,
    isValidating: isMeetingsValidating,
    revalidate: revalidateMeetings,
  } = useTodaysMeetings();

  // Use fetched data or fall back to initial
  const displayTasks = tasks.length > 0 ? tasks : initialTasks;
  const displayMeetings = meetings.length > 0 ? meetings : initialMeetings;

  const isRefreshing = isTasksValidating || isMeetingsValidating || isPending;

  // Handle task completion
  const handleTaskComplete = useCallback((taskId: string) => {
    startTransition(async () => {
      await quickUpdateTask(taskId, { status: 'Done' });
      invalidateTodaysSchedule(true);
    });
  }, []);

  // Handle task click (open edit modal)
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  }, []);

  // Handle meeting click
  const handleMeetingClick = useCallback((meeting: Meeting) => {
    if (meeting.meeting_link) {
      window.open(meeting.meeting_link, '_blank');
    }
  }, []);

  // Handle timer start
  const handleStartTimer = useCallback((blockId: string) => {
    // Scroll to productivity panel and focus timer
    const panel = document.querySelector('[data-productivity-panel]');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth' });
    }
    console.log('Starting timer for block:', blockId);
  }, []);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    revalidateTasks();
    revalidateMeetings();
  }, [revalidateTasks, revalidateMeetings]);

  // Handle edit modal close
  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedTask(null);
    invalidateTodaysSchedule(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Team Schedule</h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                'border border-border hover:bg-muted',
                isRefreshing && 'opacity-50'
              )}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
          <ScheduleHeader />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="space-y-6">
          {/* Time Block Grid */}
          <section>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Daily Schedule
            </h2>
            <TimeBlockGrid
              tasks={displayTasks}
              meetings={displayMeetings}
              onTaskComplete={handleTaskComplete}
              onTaskClick={handleTaskClick}
              onMeetingClick={handleMeetingClick}
              onStartTimer={handleStartTimer}
            />
          </section>

          {/* Productivity Panel */}
          <section data-productivity-panel>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Productivity Tools
            </h2>
            <ProductivityPanel />
          </section>
        </div>
      </div>

      {/* Edit Task Modal */}
      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          open={isEditModalOpen}
          onOpenChange={(open) => {
            if (!open) handleEditModalClose();
          }}
        />
      )}
    </div>
  );
}
