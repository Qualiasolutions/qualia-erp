'use client';

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useDailyFlow, invalidateDailyFlow } from '@/lib/swr';
import { createInstantMeeting } from '@/app/actions';
import { quickUpdateTask } from '@/app/actions/inbox';
import { DailyFlowHeader } from './daily-flow-header';
import { VisualTimeline } from './visual-timeline';
import { YourFocusSection } from './your-focus-section';
import { TeamSummary } from './team-summary';
import { CollapsibleSection } from './collapsible-section';
import { ProjectFocusBar } from './project-focus-bar';
import { CommandPalette } from './command-palette';
import { KeyboardShortcutsDialog, useKeyboardShortcuts } from './keyboard-shortcuts';
import { EditTaskModal } from '@/components/edit-task-modal';
import type { Task } from '@/app/actions/inbox';

/**
 * Daily Flow - Things 3 inspired unified dashboard
 * Clean, focused, keyboard-driven
 */
export function DailyFlowClient() {
  const {
    meetings,
    tasks,
    focusProject,
    teamMembers,
    currentUserId,
    isLoading,
    isValidating,
    revalidate,
  } = useDailyFlow();

  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current user's sorted tasks for keyboard navigation
  const myTasks = useMemo(() => {
    if (!currentUserId) return [];
    return tasks
      .filter(
        (t) =>
          t.assignee_id === currentUserId && (t.status === 'Todo' || t.status === 'In Progress')
      )
      .sort((a, b) => {
        // In Progress first
        if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
        if (b.status === 'In Progress' && a.status !== 'In Progress') return 1;
        // Then by priority
        const priorityOrder: Record<string, number> = {
          Urgent: 0,
          High: 1,
          Medium: 2,
          Low: 3,
          'No Priority': 4,
        };
        return (
          (priorityOrder[a.priority || 'No Priority'] ?? 4) -
          (priorityOrder[b.priority || 'No Priority'] ?? 4)
        );
      });
  }, [tasks, currentUserId]);

  // Handlers
  const handleStartMeeting = async () => {
    startTransition(async () => {
      const result = await createInstantMeeting();
      if (result.success && result.data) {
        const meeting = result.data as { meeting_link?: string };
        if (meeting.meeting_link) {
          window.open(meeting.meeting_link, '_blank');
        }
        invalidateDailyFlow(true);
      }
    });
  };

  const handleRefresh = useCallback(() => {
    revalidate();
  }, [revalidate]);

  const handleTaskModalClose = useCallback(() => {
    setSelectedTask(null);
    invalidateDailyFlow(true);
  }, []);

  const handleToggleFocus = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  const handleOpenCommandPalette = useCallback(() => {
    setCommandOpen(true);
  }, []);

  const handleOpenShortcuts = useCallback(() => {
    setShortcutsOpen(true);
  }, []);

  const handleNavigateUp = useCallback(() => {
    setSelectedTaskIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNavigateDown = useCallback(() => {
    setSelectedTaskIndex((prev) => Math.min(myTasks.length - 1, prev + 1));
  }, [myTasks.length]);

  const handleSelectTask = useCallback(() => {
    if (myTasks[selectedTaskIndex]) {
      setSelectedTask(myTasks[selectedTaskIndex]);
    }
  }, [myTasks, selectedTaskIndex]);

  const handleCompleteTask = useCallback(async () => {
    const task = myTasks[selectedTaskIndex];
    if (task) {
      await quickUpdateTask(task.id, { status: 'Done' });
      invalidateDailyFlow(true);
    }
  }, [myTasks, selectedTaskIndex]);

  const handleCyclePriority = useCallback(async () => {
    const task = myTasks[selectedTaskIndex];
    if (!task) return;

    type PriorityType = 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
    const priorityCycle: Record<PriorityType, PriorityType> = {
      Urgent: 'High',
      High: 'Medium',
      Medium: 'Low',
      Low: 'No Priority',
      'No Priority': 'Urgent',
    };
    const currentPriority = (task.priority as PriorityType) || 'No Priority';
    const newPriority: PriorityType = priorityCycle[currentPriority] || 'Urgent';

    await quickUpdateTask(task.id, { priority: newPriority });
    invalidateDailyFlow(true);
  }, [myTasks, selectedTaskIndex]);

  const handleSnooze = useCallback(async () => {
    const task = myTasks[selectedTaskIndex];
    if (!task) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await quickUpdateTask(task.id, { due_date: tomorrow.toISOString() });
    invalidateDailyFlow(true);
  }, [myTasks, selectedTaskIndex]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNavigateUp: handleNavigateUp,
    onNavigateDown: handleNavigateDown,
    onSelect: handleSelectTask,
    onComplete: handleCompleteTask,
    onPriorityCycle: handleCyclePriority,
    onSnooze: handleSnooze,
    onToggleFocus: handleToggleFocus,
    onOpenCommandPalette: handleOpenCommandPalette,
    onOpenShortcuts: handleOpenShortcuts,
    onRefresh: handleRefresh,
  });

  if (!mounted || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DailyFlowHeader
        isValidating={isValidating}
        isPending={isPending}
        focusMode={focusMode}
        onRefresh={handleRefresh}
        onStartMeeting={handleStartMeeting}
        onToggleFocus={handleToggleFocus}
        onOpenCommandPalette={handleOpenCommandPalette}
        onOpenShortcuts={handleOpenShortcuts}
      />

      {/* Timeline - Compact */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Timeline
          </h2>
          {meetings.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <VisualTimeline meetings={meetings} />
      </section>

      {/* Your Focus - Primary section */}
      <YourFocusSection
        tasks={tasks}
        currentUserId={currentUserId}
        selectedTaskId={myTasks[selectedTaskIndex]?.id}
        onTaskSelect={(task) => {
          const index = myTasks.findIndex((t) => t.id === task.id);
          if (index >= 0) setSelectedTaskIndex(index);
        }}
        onTaskClick={setSelectedTask}
      />

      {/* Team Schedule - Collapsible, hidden in focus mode */}
      {!focusMode && (
        <TeamSummary
          tasks={tasks}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onTaskClick={setSelectedTask}
          onAssignTask={() => {
            window.location.href = '/projects';
          }}
          defaultOpen={false}
        />
      )}

      {/* Focus Project - Collapsible, hidden in focus mode */}
      {!focusMode && (
        <CollapsibleSection title="Focus Project" badge={focusProject?.name} defaultOpen={false}>
          <ProjectFocusBar
            project={focusProject}
            tasks={tasks}
            meetings={meetings}
            onSwitchProject={() => {
              window.location.href = '/projects';
            }}
          />
        </CollapsibleSection>
      )}

      {/* Command Palette */}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        tasks={tasks}
        meetings={meetings}
        onTaskSelect={setSelectedTask}
        onRefresh={handleRefresh}
        onToggleFocus={handleToggleFocus}
        onStartMeeting={handleStartMeeting}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Edit Task Modal */}
      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          open={true}
          onOpenChange={(open) => !open && handleTaskModalClose()}
        />
      )}
    </div>
  );
}

export default DailyFlowClient;
