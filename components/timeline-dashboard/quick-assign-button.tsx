'use client';

import { memo, useState, useTransition } from 'react';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USER_COLORS } from '@/lib/color-constants';
import type { TimelineTask, TeamMember } from '@/app/actions/timeline-dashboard';
import { assignTaskToMember } from '@/app/actions/timeline-dashboard';
import { invalidateTimeline } from '@/lib/swr';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QuickAssignButtonProps {
  tasks: TimelineTask[];
  teamMembers: TeamMember[];
  currentUserId: string | null;
  className?: string;
}

/**
 * Quick assign button for the lead to assign tasks to team members
 * Shows a dropdown with unassigned tasks and team members
 */
export const QuickAssignButton = memo(function QuickAssignButton({
  tasks,
  teamMembers,
  currentUserId,
  className,
}: QuickAssignButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);
  const [step, setStep] = useState<'task' | 'member'>('task');

  // Get unassigned or lead's tasks that can be assigned
  const assignableTasks = tasks.filter((t) => !t.assignee_id || t.assignee_id === currentUserId);

  // Get other team members (not the lead)
  const otherMembers = teamMembers.filter((m) => m.id !== currentUserId);

  const handleAssign = (taskId: string, assigneeId: string) => {
    startTransition(async () => {
      const result = await assignTaskToMember(taskId, assigneeId);
      if (result.success) {
        invalidateTimeline(true);
      }
      setSelectedTask(null);
      setStep('task');
    });
  };

  const handleTaskSelect = (task: TimelineTask) => {
    setSelectedTask(task);
    setStep('member');
  };

  const handleBack = () => {
    setSelectedTask(null);
    setStep('task');
  };

  if (assignableTasks.length === 0 || otherMembers.length === 0) {
    return null;
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          setSelectedTask(null);
          setStep('task');
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-qualia-500/50 hover:bg-qualia-500/5 hover:text-qualia-500',
            isPending && 'opacity-50',
            className
          )}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          <span>Assign Task</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {step === 'task' ? (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Select a task to assign
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-60 overflow-y-auto">
              {assignableTasks.slice(0, 10).map((task) => (
                <DropdownMenuItem
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="truncate font-medium">{task.title}</span>
                  {task.project?.name && (
                    <span className="text-[10px] text-muted-foreground">{task.project.name}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
            {assignableTasks.length > 10 && (
              <div className="border-t border-border px-2 py-1.5 text-center text-[10px] text-muted-foreground">
                +{assignableTasks.length - 10} more tasks
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 py-1.5">
              <button
                onClick={handleBack}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                &larr; Back
              </button>
              <span className="text-xs font-medium text-muted-foreground">Assign to</span>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <span className="truncate text-xs font-medium">{selectedTask?.title}</span>
            </div>
            <DropdownMenuSeparator />
            {otherMembers.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onClick={() => {
                  if (selectedTask) {
                    handleAssign(selectedTask.id, member.id);
                  }
                }}
              >
                <div
                  className={cn('mr-2 h-2 w-2 rounded-full', USER_COLORS[member.colorKey].dot)}
                />
                {member.full_name || member.email}
                {selectedTask?.assignee_id === member.id && (
                  <Check className="ml-auto h-4 w-4 text-qualia-500" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
