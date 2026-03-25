'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createOwnerUpdate } from '@/app/actions/owner-updates';
import { invalidateOwnerUpdates } from '@/lib/swr';

interface OwnerUpdatesComposeProps {
  workspaceId: string;
  profiles: { id: string; full_name: string | null }[];
}

export function OwnerUpdatesCompose({ workspaceId, profiles }: OwnerUpdatesComposeProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUserId, setTargetUserId] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and message are required.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createOwnerUpdate(workspaceId, title, body, {
        targetUserId: targetUserId === 'all' ? undefined : targetUserId,
      });

      if (!result.success) {
        setError(result.error ?? 'Failed to post update.');
        return;
      }

      // Reset form
      setTitle('');
      setBody('');
      setTargetUserId('all');
      setSuccess(true);
      invalidateOwnerUpdates(workspaceId, true);

      // Auto-clear success flash
      setTimeout(() => setSuccess(false), 2500);
    });
  };

  return (
    <div className="h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Toggle header */}
      <button
        type="button"
        className="flex w-full items-center gap-2.5 border-b border-border bg-muted/10 px-4 py-3 text-left transition-all duration-200 hover:bg-muted/20"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Send className="size-3.5 shrink-0 text-primary" />
        </div>
        <span className="flex-1 text-[13px] font-semibold tracking-tight text-foreground">
          Post update to team
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4 pt-3">
          {/* Title */}
          <Input
            placeholder="Update title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm"
            disabled={isPending}
          />

          {/* Body */}
          <Textarea
            placeholder="Write your update…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="resize-none text-sm"
            disabled={isPending}
          />

          {/* Target selector + submit */}
          <div className="flex items-center gap-2">
            <Select value={targetUserId} onValueChange={setTargetUserId} disabled={isPending}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue placeholder="Send to…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All team members</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-xs',
                success && 'bg-emerald-600 hover:bg-emerald-600'
              )}
              onClick={handleSubmit}
              disabled={isPending || !title.trim() || !body.trim()}
            >
              {isPending ? (
                'Posting…'
              ) : success ? (
                'Posted!'
              ) : (
                <>
                  <Send className="size-3" />
                  Post update
                </>
              )}
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
