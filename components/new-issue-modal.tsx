'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectWithOther } from '@/components/ui/select-with-other';
import { createIssue, getProjects } from '@/app/actions';
import { useWorkspace } from '@/components/workspace-provider';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/lib/constants/task-config';

interface Project {
  id: string;
  name: string;
}

interface NewIssueModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStartTime?: Date | null;
  defaultEndTime?: Date | null;
}

export function NewIssueModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultStartTime,
  defaultEndTime,
}: NewIssueModalProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [customProjectName, setCustomProjectName] = useState<string>('');
  const { currentWorkspace } = useWorkspace();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  useEffect(() => {
    if (open && currentWorkspace) {
      getProjects(currentWorkspace.id).then(setProjects);
      setSelectedProjectId('');
      setCustomProjectName('');
    }
  }, [open, currentWorkspace]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    // Add workspace_id to form data
    if (currentWorkspace) {
      formData.set('workspace_id', currentWorkspace.id);
    }

    // Add project info
    if (selectedProjectId) {
      formData.set('project_id', selectedProjectId);
    }
    if (customProjectName) {
      formData.set('custom_project_name', customProjectName);
    }

    // Add scheduling info if provided
    if (defaultStartTime) {
      formData.set('scheduled_start_time', defaultStartTime.toISOString());
    }
    if (defaultEndTime) {
      formData.set('scheduled_end_time', defaultEndTime.toISOString());
    }

    const result = await createIssue(formData);

    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error || 'Failed to create task');
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2 bg-primary hover:bg-primary">
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>{defaultStartTime ? 'Schedule New Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Task title"
              required
              className="border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the task..."
              className="min-h-[100px] border-border bg-background"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue="Yet to Start">
                <SelectTrigger className="border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {STATUS_OPTIONS.filter((s) => s !== 'Canceled').map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" defaultValue="No Priority">
                <SelectTrigger className="border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Project</Label>
            <SelectWithOther
              options={projects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
              value={customProjectName || selectedProjectId}
              onChange={(value, isCustom) => {
                if (isCustom) {
                  setSelectedProjectId('');
                  setCustomProjectName(value);
                } else {
                  setSelectedProjectId(value);
                  setCustomProjectName('');
                }
              }}
              placeholder="Select project"
              otherLabel="Other project..."
              otherPlaceholder="Project name..."
              className="w-full"
              triggerClassName="w-full justify-between border-border bg-background"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary">
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
