'use client';

import { useState, useEffect, useActionState, useOptimistic } from 'react';
import { CalendarIcon, User, FolderOpen } from 'lucide-react';
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
import { useProfiles, invalidateInboxTasks, invalidateProjectTasks } from '@/lib/swr';

interface EditTaskModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskModal({ task, open, onOpenChange }: EditTaskModalProps) {
  const { profiles } = useProfiles();

  // Date picker state (controlled for calendar component)
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
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

      // Add task ID for server action
      formData.set('id', task.id);

      // Apply optimistic updates immediately for instant feedback
      const updates: Partial<Task> = {
        title: title.trim(),
        description: (formData.get('description') as string) || null,
        status: (formData.get('status') as Task['status']) || task.status,
        assignee_id: (formData.get('assignee_id') as string) || null,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
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
    }
  }, [open, task.due_date]);

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

          {/* Project display (read-only - tasks can't change projects) */}
          <div className="space-y-2">
            <Label>Project</Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              <FolderOpen className="h-4 w-4 text-primary" />
              <span>{task.project?.name || 'Unknown Project'}</span>
            </div>
          </div>

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
