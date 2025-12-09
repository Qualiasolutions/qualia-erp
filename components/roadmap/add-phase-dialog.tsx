'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPhase } from '@/app/actions';

interface AddPhaseDialogProps {
  projectId: string;
  workspaceId: string;
  onSuccess: () => void;
  nextOrder: number;
  variant?: 'default' | 'primary';
}

export function AddPhaseDialog({
  projectId,
  workspaceId,
  onSuccess,
  nextOrder,
  variant = 'default',
}: AddPhaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [helperText, setHelperText] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const formData = new FormData();
    formData.set('project_id', projectId);
    formData.set('workspace_id', workspaceId);
    formData.set('name', name.trim());
    formData.set('description', description.trim() || '');
    formData.set('helper_text', helperText.trim() || '');
    formData.set('display_order', String(nextOrder));
    formData.set('is_custom', 'true');

    const result = await createPhase(formData);
    setLoading(false);

    if (result.success) {
      setName('');
      setDescription('');
      setHelperText('');
      setOpen(false);
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant === 'primary' ? 'default' : 'outline'} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Phase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Phase</DialogTitle>
          <DialogDescription>Create a new phase to organize your project tasks.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Phase Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Testing & QA"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this phase"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="helperText">Helper Text (optional)</Label>
            <Input
              id="helperText"
              value={helperText}
              onChange={(e) => setHelperText(e.target.value)}
              placeholder="Guidance tip for this phase"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Phase
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
