'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { OwnerUpdate } from '@/app/actions/owner-updates';

interface OwnerUpdatesBannerProps {
  workspaceId: string;
}

const PRIORITY_ACCENT: Record<string, string> = {
  urgent: 'text-red-500',
  high: 'text-amber-500',
  normal: 'text-primary',
  low: 'text-muted-foreground',
};

const PRIORITY_BG: Record<string, string> = {
  urgent: 'bg-red-500/10 border-red-500/20',
  high: 'bg-amber-500/10 border-amber-500/20',
  normal: 'bg-primary/10 border-primary/20',
  low: 'bg-muted/50 border-border',
};

export function OwnerUpdatesBanner({ workspaceId }: OwnerUpdatesBannerProps) {
  const [updates, setUpdates] = useState<OwnerUpdate[]>([]);
  const [index, setIndex] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { getOwnerUpdates } = await import('@/app/actions/owner-updates');
    const data = await getOwnerUpdates(workspaceId, { unreadOnly: true });
    setUpdates(data);
    setIndex(0);
    if (data.length > 0) setOpen(true);
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (updates.length === 0) return null;

  const current = updates[index];
  if (!current) return null;

  const accentColor = PRIORITY_ACCENT[current.priority] ?? PRIORITY_ACCENT.normal;
  const bgStyle = PRIORITY_BG[current.priority] ?? PRIORITY_BG.normal;

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      const { acknowledgeOwnerUpdate } = await import('@/app/actions/owner-updates');
      await acknowledgeOwnerUpdate(current.id);
      const next = updates.filter((u) => u.id !== current.id);
      setUpdates(next);
      setIndex((prev) => Math.min(prev, next.length - 1));
      if (next.length === 0) setOpen(false);
    } finally {
      setAcknowledging(false);
    }
  };

  // Parse markdown-like bold and code formatting
  const formatBody = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="mb-1 mt-3 text-[13px] font-semibold text-foreground">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('- ')) {
        const content = line.slice(2).replace(/`([^`]+)`/g, '<code>$1</code>');
        return (
          <li
            key={i}
            className="ml-1 text-[12px] text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      }
      if (/^\d+\./.test(line)) {
        const content = line.replace(/^\d+\.\s*/, '').replace(/`([^`]+)`/g, '<code>$1</code>');
        return (
          <li
            key={i}
            className="ml-1 list-decimal text-[12px] text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      }
      if (!line.trim()) return <div key={i} className="h-1.5" />;
      const content = line
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      return (
        <p
          key={i}
          className="text-[12px] leading-relaxed text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className={cn('border-b px-5 pb-4 pt-5', bgStyle)}>
          <div className="flex items-center gap-2.5">
            <div className={cn('flex size-8 items-center justify-center rounded-lg', bgStyle)}>
              <Megaphone className={cn('size-4', accentColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[15px] font-semibold leading-tight">
                {current.title}
              </DialogTitle>
              {updates.length > 1 && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {index + 1} of {updates.length} announcements
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
          <div className="space-y-0 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[10px] [&_strong]:font-semibold [&_strong]:text-foreground">
            {formatBody(current.body)}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-row items-center border-t bg-muted/20 px-5 py-3.5">
          {/* Pagination */}
          {updates.length > 1 && (
            <div className="mr-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={index === updates.length - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleAcknowledge}
            disabled={acknowledging}
          >
            {acknowledging ? (
              'Saving…'
            ) : (
              <>
                <X className="size-3.5" />
                Got it
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
