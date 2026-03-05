'use client';

import { useState } from 'react';
import { createFeatureRequest } from '@/app/actions/client-requests';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
}

interface PortalRequestDialogProps {
  projects: Project[];
}

const requestCategories = [
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'question', label: 'Question' },
];

export function PortalRequestDialog({ projects }: PortalRequestDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('feature_request');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setPriority('medium');
    setCategory('feature_request');
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);

    const result = await createFeatureRequest({
      title: `[${requestCategories.find((c) => c.value === category)?.label}] ${title}`,
      description: description || undefined,
      project_id: projectId || undefined,
      priority,
    });

    setLoading(false);

    if (result.success) {
      setSubmitted(true);
      router.refresh();
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset after close animation
      setTimeout(resetForm, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {submitted ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Request Submitted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ll review your request and respond with updates.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New Request</DialogTitle>
              <DialogDescription>
                Submit a feature request, bug report, or question.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Category
                  </label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {requestCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Priority
                  </label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of your request"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more details..."
                  rows={4}
                />
              </div>

              {projects.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Project (optional)
                  </label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !title.trim()}>
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
