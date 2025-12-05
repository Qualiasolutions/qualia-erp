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
import { createIssue, getProjects } from '@/app/actions';
import { useWorkspace } from '@/components/workspace-provider';

const ISSUE_STATUSES = ['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'];
const ISSUE_PRIORITIES = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];

interface Project {
  id: string;
  name: string;
}

export function NewIssueModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (open && currentWorkspace) {
      getProjects(currentWorkspace.id).then(setProjects);
    }
  }, [open, currentWorkspace]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    // Add workspace_id to form data
    if (currentWorkspace) {
      formData.set('workspace_id', currentWorkspace.id);
    }

    const result = await createIssue(formData);

    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error || 'Failed to create issue');
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-qualia-600 hover:bg-qualia-500">
          <Plus className="h-4 w-4" />
          <span>New Issue</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>Create New Issue</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Issue title"
              required
              className="border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the issue..."
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
                  {ISSUE_STATUSES.map((status) => (
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
                  {ISSUE_PRIORITIES.map((priority) => (
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
            <Select name="project_id">
              <SelectTrigger className="border-border bg-background">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={loading} className="bg-qualia-600 hover:bg-qualia-500">
              {loading ? 'Creating...' : 'Create Issue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
