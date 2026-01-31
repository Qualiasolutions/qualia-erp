'use client';

import { useState, useEffect, useActionState, useOptimistic } from 'react';
import { CalendarIcon, User, FolderOpen, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
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
import { useProfiles, useProjects, invalidateInboxTasks, invalidateProjectTasks } from '@/lib/swr';
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
        invalidateInboxTasks();
        if (task.project_id) {
          invalidateProjectTasks(task.project_id);
        }
        if (
          selectedProjectId &&
          selectedProjectId !== 'no-project' &&
          selectedProjectId !== task.project_id
        ) {
          invalidateProjectTasks(selectedProjectId);
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
    }
  }, [open, task.due_date, task.project_id]);

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
                        <AvatarFallback className="text-[10px]">
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
                          <AvatarFallback className="bg-qualia-600 text-[10px] text-white">
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
