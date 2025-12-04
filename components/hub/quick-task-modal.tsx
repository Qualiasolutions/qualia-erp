'use client';

import { useState, useEffect } from 'react';
import { createIssue } from '@/app/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Loader2 } from 'lucide-react';
import { getProjects, getWorkspaceMembers } from '@/app/actions';

interface QuickTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onCreated: () => void;
}

const PRIORITIES = ['No Priority', 'Low', 'Medium', 'High', 'Urgent'] as const;

interface Project {
  id: string;
  name: string;
}

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

export function QuickTaskModal({
  open,
  onOpenChange,
  workspaceId,
  onCreated,
}: QuickTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      Promise.all([getProjects(workspaceId), getWorkspaceMembers(workspaceId)]).then(([p, m]) => {
        setProjects(p);
        setMembers(m);
      });
    } else {
      // Reset selections when modal closes
      setSelectedProject(null);
      setSelectedAssignee(null);
      setError(null);
    }
  }, [open, workspaceId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set('workspace_id', workspaceId);
    formData.set('status', 'Todo');
    if (selectedProject) formData.set('project_id', selectedProject);
    if (selectedAssignee) formData.set('assignee_id', selectedAssignee);

    const result = await createIssue(formData);

    if (result.success) {
      onCreated();
    } else {
      setError(result.error || 'Failed to create task');
    }
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Add Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              name="title"
              placeholder="Task title..."
              className="bg-background"
              autoFocus
              required
            />
          </div>

          <div>
            <Textarea
              name="description"
              placeholder="Description (optional)"
              className="h-20 resize-none bg-background"
            />
          </div>
          <div>
            <Combobox
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              value={selectedProject ?? undefined}
              onSelect={setSelectedProject}
              placeholder="Select Project..."
              searchPlaceholder="Search projects..."
            />
          </div>

          <div>
            <Combobox
              options={members.map((m) => ({
                value: m.id,
                label: m.full_name || m.email || 'Unknown',
              }))}
              value={selectedAssignee ?? undefined}
              onSelect={setSelectedAssignee}
              placeholder="Assignee..."
              searchPlaceholder="Search members..."
            />
          </div>

          <div>
            <Select name="priority" defaultValue="No Priority">
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-qualia-600 hover:bg-qualia-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
