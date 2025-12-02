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
import { createPhaseItem } from '@/app/actions';

interface AddItemDialogProps {
  phaseId: string;
  projectId: string;
  onSuccess: () => void;
  nextOrder: number;
}

export function AddItemDialog({ phaseId, onSuccess, nextOrder }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [helperText, setHelperText] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const formData = new FormData();
    formData.set('phase_id', phaseId);
    formData.set('title', title.trim());
    formData.set('description', description.trim() || '');
    formData.set('helper_text', helperText.trim() || '');
    formData.set('display_order', String(nextOrder));
    formData.set('is_custom', 'true');

    const result = await createPhaseItem(formData);
    setLoading(false);

    if (result.success) {
      setTitle('');
      setDescription('');
      setHelperText('');
      setOpen(false);
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>Add a custom task to this phase.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review deployment logs"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this task"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="helperText">Helper Text (optional)</Label>
            <Input
              id="helperText"
              value={helperText}
              onChange={(e) => setHelperText(e.target.value)}
              placeholder="Quick tip or guidance"
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
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
