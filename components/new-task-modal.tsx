'use client';

import { useState, useEffect } from 'react';
import { Plus, CalendarIcon, User, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { createTask } from '@/app/actions/inbox';
import { useProfiles, useProjects, invalidateInboxTasks, invalidateProjectTasks } from '@/lib/swr';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';

export function NewTaskModal() {
  const router = useRouter();
  const { profiles } = useProfiles();
  const { projects } = useProjects();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Todo' | 'In Progress' | 'Done'>('Todo');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showInInbox, setShowInInbox] = useState(true);

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setTitle('');
      setDescription('');
      setStatus('Todo');
      setAssigneeId(null);
      setDueDate(undefined);
      setProjectId(null);
      setShowInInbox(true);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!projectId) {
      setError('Please select a project');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set('title', title);
    if (description) formData.set('description', description);
    formData.set('status', status);
    if (assigneeId) {
      formData.set('assignee_id', assigneeId);
    }
    if (dueDate) {
      formData.set('due_date', format(dueDate, 'yyyy-MM-dd'));
    }
    formData.set('project_id', projectId);
    formData.set('show_in_inbox', showInInbox.toString());

    const result = await createTask(formData);

    if (result.success) {
      setOpen(false);
      // Invalidate caches for instant refresh
      invalidateInboxTasks();
      invalidateProjectTasks(projectId);
      router.refresh();
    } else {
      setError(result.error || 'Failed to create task');
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              className="border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description (optional)"
              rows={3}
              className="resize-none border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger id="status" className="border-border bg-background">
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
            <Label htmlFor="assignee">Assignee</Label>
            <Select
              value={assigneeId || 'unassigned'}
              onValueChange={(v) => setAssigneeId(v === 'unassigned' ? null : v)}
            >
              <SelectTrigger id="assignee" className="border-border bg-background">
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
            <Label htmlFor="due_date">Due Date</Label>
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

          {/* Project selection (required) */}
          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select value={projectId || ''} onValueChange={(v) => setProjectId(v)}>
              <SelectTrigger
                id="project"
                className={cn('border-border bg-background', !projectId && 'text-muted-foreground')}
              >
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent className="max-h-60 border-border bg-card">
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span className="truncate">{project.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show in Inbox toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="show_in_inbox" className="text-sm font-medium">
                Show in Inbox
              </Label>
              <p className="text-xs text-muted-foreground">
                Task will appear in your inbox for quick access
              </p>
            </div>
            <Switch id="show_in_inbox" checked={showInInbox} onCheckedChange={setShowInInbox} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !title.trim() || !projectId}
            className="w-full bg-primary font-medium hover:bg-primary/90"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
