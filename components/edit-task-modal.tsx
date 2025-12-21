'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, User, Folder, FolderOpen } from 'lucide-react';
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
import { useProfiles, useProjects } from '@/lib/swr';
import { getProjectPhases } from '@/app/actions/roadmap';
import { useRouter } from 'next/navigation';

type Phase = {
  id: string;
  name: string;
};

interface EditTaskModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskModal({ task, open, onOpenChange }: EditTaskModalProps) {
  const router = useRouter();
  const { profiles } = useProfiles();
  const { projects } = useProjects();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<Task['status']>(task.status);
  const [priority, setPriority] = useState<Task['priority']>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assignee_id);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [projectId, setProjectId] = useState<string | null>(task.project_id);
  const [phaseId, setPhaseId] = useState<string | null>(task.phase_id);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form when modal opens with current task data
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeId(task.assignee_id);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setProjectId(task.project_id);
      setPhaseId(task.phase_id);
      setError(null);

      // Load phases if task has a project
      if (task.project_id) {
        setLoadingPhases(true);
        getProjectPhases(task.project_id).then((data) => {
          setPhases(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
          setLoadingPhases(false);
        });
      } else {
        setPhases([]);
      }
    }
  }, [open, task]);

  // Fetch phases when project changes
  useEffect(() => {
    if (projectId && projectId !== task.project_id) {
      setLoadingPhases(true);
      setPhaseId(null);
      getProjectPhases(projectId).then((data) => {
        setPhases(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        setLoadingPhases(false);
      });
    } else if (!projectId) {
      setPhases([]);
      setPhaseId(null);
    }
  }, [projectId, task.project_id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set('id', task.id);
    formData.set('title', title);
    if (description !== task.description) {
      formData.set('description', description);
    }
    if (status !== task.status) {
      formData.set('status', status);
    }
    if (priority !== task.priority) {
      formData.set('priority', priority);
    }
    const dueDateStr = dueDate ? format(dueDate, 'yyyy-MM-dd') : '';
    if (dueDateStr !== (task.due_date || '')) {
      formData.set('due_date', dueDateStr || '');
    }
    if (assigneeId !== task.assignee_id) {
      formData.set('assignee_id', assigneeId || '');
    }
    if (projectId !== task.project_id) {
      formData.set('project_id', projectId || '');
    }
    if (phaseId !== task.phase_id) {
      formData.set('phase_id', phaseId || '');
    }

    const result = await updateTask(formData);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setError(result.error || 'Failed to update task');
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              className="border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description (optional)"
              rows={3}
              className="resize-none border-border bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task['status'])}>
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
              <Label htmlFor="edit-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
                <SelectTrigger id="edit-priority" className="border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="No Priority">No Priority</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-assignee">Assignee</Label>
            <Select
              value={assigneeId || 'unassigned'}
              onValueChange={(v) => setAssigneeId(v === 'unassigned' ? null : v)}
            >
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

          {/* Project linking */}
          <div className="space-y-2">
            <Label htmlFor="edit-project">Link to Project</Label>
            <Select
              value={projectId || 'none'}
              onValueChange={(v) => setProjectId(v === 'none' ? null : v)}
            >
              <SelectTrigger id="edit-project" className="border-border bg-background">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent className="max-h-60 border-border bg-card">
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span>No project</span>
                  </div>
                </SelectItem>
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

          {/* Phase selector - only shown when project is selected */}
          {projectId && (
            <div className="space-y-2">
              <Label htmlFor="edit-phase">Link to Phase</Label>
              <Select
                value={phaseId || 'none'}
                onValueChange={(v) => setPhaseId(v === 'none' ? null : v)}
                disabled={loadingPhases}
              >
                <SelectTrigger id="edit-phase" className="border-border bg-background">
                  <SelectValue placeholder={loadingPhases ? 'Loading...' : 'No phase'} />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="none">No phase (general project task)</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

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
              disabled={loading || !title.trim()}
              className="flex-1 bg-primary font-medium hover:bg-primary/90"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
