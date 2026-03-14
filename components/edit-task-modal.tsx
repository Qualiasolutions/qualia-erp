'use client';

import { useState, useEffect, useActionState, useOptimistic } from 'react';
import { CalendarIcon, User, FolderOpen, GraduationCap, Clock } from 'lucide-react';
import { format, setHours, setMinutes, addMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { updateTask, type Task } from '@/app/actions/inbox';
import {
  useProfiles,
  useProjects,
  invalidateInboxTasks,
  invalidateProjectTasks,
  invalidateScheduledTasks,
  invalidateDailyFlow,
} from '@/lib/swr';
import { useLearnMode } from '@/components/providers/learn-mode-provider';

interface EditTaskModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskModal({ task, open, onOpenChange }: EditTaskModalProps) {
  const { profiles } = useProfiles();
  const { projects } = useProjects();
  const { learnModeEnabled, isTrainee } = useLearnMode();

  // Date picker state (controlled for calendar component)
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );

  // Project state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    task.project_id || 'no-project'
  );

  // Schedule state
  const [scheduledTime, setScheduledTime] = useState<string>(() => {
    if (task.scheduled_start_time) {
      const start = parseISO(task.scheduled_start_time);
      return `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`;
    }
    return '';
  });
  const [duration, setDuration] = useState<string>(() => {
    if (task.scheduled_start_time && task.scheduled_end_time) {
      const mins = differenceInMinutes(
        parseISO(task.scheduled_end_time),
        parseISO(task.scheduled_start_time)
      );
      return String(mins);
    }
    return '30';
  });

  // React 19: Optimistic task updates for instant UI feedback
  const [optimisticTask, updateOptimisticTask] = useOptimistic(
    task,
    (currentTask: Task, updatedFields: Partial<Task>) => ({
      ...currentTask,
      ...updatedFields,
    })
  );

  // React 19: useActionState for form handling
  const [state, formAction, isPending] = useActionState(
    async (prevState: { success: boolean; error: string | null }, formData: FormData) => {
      // Client-side validation
      const title = formData.get('title') as string;
      if (!title.trim()) {
        return { success: false, error: 'Title is required' };
      }

      // Add due date to form data if selected
      if (dueDate) {
        formData.set('due_date', format(dueDate, 'yyyy-MM-dd'));
      }

      // Add project_id to form data
      if (selectedProjectId && selectedProjectId !== 'no-project') {
        formData.set('project_id', selectedProjectId);
      } else {
        formData.set('project_id', '');
      }

      // Add scheduled time
      if (scheduledTime && scheduledTime !== 'none') {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const today = new Date();
        const startTime = setMinutes(setHours(today, hours), minutes);
        const endTime = addMinutes(startTime, parseInt(duration, 10));
        formData.set('scheduled_start_time', startTime.toISOString());
        formData.set('scheduled_end_time', endTime.toISOString());
      } else {
        formData.set('scheduled_start_time', '');
        formData.set('scheduled_end_time', '');
      }

      // Add task ID for server action
      formData.set('id', task.id);

      // Apply optimistic updates immediately for instant feedback
      const updates: Partial<Task> = {
        title: title.trim(),
        description: (formData.get('description') as string) || null,
        status: (formData.get('status') as Task['status']) || task.status,
        assignee_id: (formData.get('assignee_id') as string) || null,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        project_id: selectedProjectId !== 'no-project' ? selectedProjectId : null,
      };
      updateOptimisticTask(updates);

      // Call server action
      const result = await updateTask(formData);

      if (result.success) {
        onOpenChange(false);
        setDueDate(task.due_date ? new Date(task.due_date) : undefined);

        // Invalidate caches for refresh
        invalidateInboxTasks(true);
        invalidateScheduledTasks(undefined, true);
        invalidateDailyFlow(true);
        if (task.project_id) {
          invalidateProjectTasks(task.project_id, true);
        }
        if (
          selectedProjectId &&
          selectedProjectId !== 'no-project' &&
          selectedProjectId !== task.project_id
        ) {
          invalidateProjectTasks(selectedProjectId, true);
        }

        return { success: true, error: null };
      } else {
        // If server fails, optimistic update will be reverted automatically
        return { success: false, error: result.error || 'Failed to update task' };
      }
    },
    { success: false, error: null }
  );

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setSelectedProjectId(task.project_id || 'no-project');
      if (task.scheduled_start_time) {
        const start = parseISO(task.scheduled_start_time);
        setScheduledTime(`${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`);
      } else {
        setScheduledTime('');
      }
      if (task.scheduled_start_time && task.scheduled_end_time) {
        const mins = differenceInMinutes(
          parseISO(task.scheduled_end_time),
          parseISO(task.scheduled_start_time)
        );
        setDuration(String(mins));
      } else {
        setDuration('30');
      }
    }
  }, [open, task.due_date, task.project_id, task.scheduled_start_time, task.scheduled_end_time]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Task</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              name="title"
              defaultValue={optimisticTask.title}
              placeholder="Task title"
              required
              className="border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              name="description"
              defaultValue={optimisticTask.description || ''}
              placeholder="Task description (optional)"
              rows={3}
              className="resize-none border-border bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select name="status" defaultValue={optimisticTask.status}>
                <SelectTrigger id="edit-status" className="border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="Todo">Todo</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-assignee">Assignee</Label>
              <Select name="assignee_id" defaultValue={optimisticTask.assignee_id || 'unassigned'}>
                <SelectTrigger id="edit-assignee" className="border-border bg-background">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[11px]">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          {profile.avatar_url ? (
                            <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />
                          ) : null}
                          <AvatarFallback className="bg-qualia-600 text-[11px] text-white">
                            {getInitials(profile.full_name || profile.email || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{profile.full_name || profile.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger id="edit-project" className="border-border bg-background">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                <SelectItem value="no-project">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span>No Project</span>
                  </div>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span>{project.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-time-slot">Time Slot</Label>
              <Select
                value={scheduledTime || 'none'}
                onValueChange={(v) => setScheduledTime(v === 'none' ? '' : v)}
              >
                <SelectTrigger id="edit-time-slot" className="border-border bg-background">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="No time" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] border-border bg-card">
                  <SelectItem value="none">No time</SelectItem>
                  {Array.from({ length: 17 }, (_, i) => {
                    const totalMinutes = 7.5 * 60 + i * 30;
                    const h = Math.floor(totalMinutes / 60);
                    const m = totalMinutes % 60;
                    const label = format(setMinutes(setHours(new Date(), h), m), 'h:mm a');
                    const value = `${h}:${m.toString().padStart(2, '0')}`;
                    return (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration} disabled={!scheduledTime}>
                <SelectTrigger id="edit-duration" className="border-border bg-background">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-due_date">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start border-border bg-background text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a date (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto border-border bg-card p-0" align="start">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Learning mode section - visible when learning mode is enabled */}
          {learnModeEnabled && isTrainee && (
            <div className="space-y-2 rounded-lg border border-qualia-500/20 bg-qualia-500/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-qualia-500">
                <GraduationCap className="h-4 w-4" />
                Learning Mode
              </div>
              <p className="text-xs text-muted-foreground">
                Complete this task to earn XP and improve your skills. Remember to check the project
                documentation for guidance.
              </p>
            </div>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary font-medium hover:bg-primary/90"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
