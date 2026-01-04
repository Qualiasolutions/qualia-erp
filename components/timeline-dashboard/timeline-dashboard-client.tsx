'use client';

import { useState, useTransition, useCallback } from 'react';
import { useTimelineDashboard, invalidateTimeline } from '@/lib/swr';
import { TimelineHeader } from './timeline-header';
import { DualTimeline } from './dual-timeline';
import { assignTaskToMember, markAssignmentSeen } from '@/app/actions/timeline-dashboard';
import { createInstantMeeting } from '@/app/actions';
import { EditTaskModal } from '@/components/edit-task-modal';
import type { TimelineTask } from '@/app/actions/timeline-dashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Main Timeline Dashboard client component
 * Orchestrates all timeline components and handles data fetching
 */
export function TimelineDashboardClient() {
  const {
    meetings,
    tasks,
    teamMembers,
    currentUserId,
    newAssignments,
    isLoading,
    isValidating,
    revalidate,
  } = useTimelineDashboard();

  const [isPending, startTransition] = useTransition();
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Handle task assignment
  const handleAssign = useCallback((taskId: string, assigneeId: string) => {
    startTransition(async () => {
      const result = await assignTaskToMember(taskId, assigneeId);
      if (result.success) {
        invalidateTimeline(true);
      }
    });
  }, []);

  // Handle assignment seen (clear highlight)
  const handleAssignmentSeen = useCallback((taskId: string) => {
    startTransition(async () => {
      await markAssignmentSeen(taskId);
      invalidateTimeline(true);
    });
  }, []);

  // Handle task click
  const handleTaskClick = useCallback(
    (task: TimelineTask) => {
      // Clear highlight if this is a newly assigned task
      if (newAssignments.includes(task.id)) {
        handleAssignmentSeen(task.id);
      }
      setSelectedTask(task);
    },
    [newAssignments, handleAssignmentSeen]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    revalidate();
  }, [revalidate]);

  // Handle start meeting
  const handleStartMeeting = useCallback(() => {
    startTransition(async () => {
      await createInstantMeeting();
      invalidateTimeline(true);
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-qualia-500" />
          <span className="text-sm text-muted-foreground">Loading timeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header */}
      <TimelineHeader
        tasks={tasks}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        isValidating={isValidating || isPending}
        onRefresh={handleRefresh}
        onStartMeeting={handleStartMeeting}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      {/* Main content: Dual timeline */}
      <div className="min-h-0 flex-1">
        <DualTimeline
          meetings={meetings}
          tasks={tasks}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          newAssignments={newAssignments}
          onAssign={handleAssign}
          onTaskClick={handleTaskClick}
        />
      </div>

      {/* Edit Task Modal */}
      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTask(null);
              invalidateTimeline(true);
            }
          }}
        />
      )}

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <ShortcutRow keys={['R']} description="Refresh data" />
            <ShortcutRow keys={['?']} description="Show shortcuts" />
            <ShortcutRow keys={['Esc']} description="Close dialogs" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
