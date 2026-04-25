'use client';

import { useState } from 'react';
import { createClientActionItem } from '@/app/actions/client-portal/action-items';
import { invalidateClientActionItems } from '@/lib/swr';
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
import { ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_TYPES = [
  { value: 'approval', label: 'Approval' },
  { value: 'upload', label: 'Upload' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'payment', label: 'Payment' },
  { value: 'general', label: 'General' },
] as const;

interface AdminActionItemsPanelProps {
  clientId: string;
  projects: Array<{ id: string; name: string }>;
}

export function AdminActionItemsPanel({ clientId, projects }: AdminActionItemsPanelProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setTitle('');
    setDescription('');
    setActionType('');
    setDueDate('');
    setProjectId('');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim() || !projectId || !actionType) return;

    setIsSubmitting(true);
    try {
      const result = await createClientActionItem({
        projectId,
        clientId,
        title: title.trim(),
        description: description.trim() || undefined,
        actionType,
        dueDate: dueDate || undefined,
      });

      if (result.success) {
        toast.success('Action item created');
        invalidateClientActionItems(clientId);
        resetForm();
      } else {
        toast.error(result.error || 'Failed to create action item');
      }
    } catch {
      toast.error('Failed to create action item');
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = title.trim().length >= 2 && projectId && actionType && !isSubmitting;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Create Action Item</h3>
          <p className="text-xs text-muted-foreground">Assign tasks to clients</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="action-item-title"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="action-item-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Review wireframes for homepage"
            required
            minLength={2}
            disabled={isSubmitting}
            className="h-10"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="action-item-description"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Description
          </label>
          <Textarea
            id="action-item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details about what needs to be done..."
            disabled={isSubmitting}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Row: Action Type + Project */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Action Type */}
          <div className="space-y-1.5">
            <label
              htmlFor="action-item-type"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Action Type <span className="text-red-500">*</span>
            </label>
            <Select value={actionType} onValueChange={setActionType} disabled={isSubmitting}>
              <SelectTrigger id="action-item-type" className="h-10 cursor-pointer">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="cursor-pointer">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <label
              htmlFor="action-item-project"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Project <span className="text-red-500">*</span>
            </label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isSubmitting}>
              <SelectTrigger id="action-item-project" className="h-10 cursor-pointer">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="cursor-pointer">
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-1.5">
          <label
            htmlFor="action-item-due-date"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Due Date
          </label>
          <Input
            id="action-item-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
            className="h-10 cursor-pointer"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={!canSubmit} className="cursor-pointer gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Action Item'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
