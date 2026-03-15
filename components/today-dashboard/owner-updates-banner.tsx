'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OwnerUpdate } from '@/app/actions/owner-updates';

interface OwnerUpdatesBannerProps {
  workspaceId: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-500/5',
  high: 'border-l-amber-500 bg-amber-500/5',
  normal: 'border-l-qualia-500 bg-qualia-500/5',
  low: 'border-l-muted-foreground/40 bg-muted/30',
};

export function OwnerUpdatesBanner({ workspaceId }: OwnerUpdatesBannerProps) {
  const [updates, setUpdates] = useState<OwnerUpdate[]>([]);
  const [index, setIndex] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    const { getOwnerUpdates } = await import('@/app/actions/owner-updates');
    const data = await getOwnerUpdates(workspaceId, { unreadOnly: true });
    setUpdates(data);
    setIndex(0);
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (dismissed || updates.length === 0) return null;

  const current = updates[index];
  if (!current) return null;

  const priorityStyle = PRIORITY_STYLES[current.priority] ?? PRIORITY_STYLES.normal;

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      const { acknowledgeOwnerUpdate } = await import('@/app/actions/owner-updates');
      await acknowledgeOwnerUpdate(current.id);
      const next = updates.filter((u) => u.id !== current.id);
      setUpdates(next);
      setIndex((prev) => Math.min(prev, next.length - 1));
      if (next.length === 0) setDismissed(true);
    } finally {
      setAcknowledging(false);
    }
  };

  const handleDismissAll = () => setDismissed(true);

  return (
    <div
      className={cn(
        'mb-4 flex items-start gap-3 rounded-r-md border-l-4 px-4 py-3 transition-all duration-200',
        priorityStyle
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{current.title}</p>
          {updates.length > 1 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {index + 1}/{updates.length}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {current.body}
        </p>
        {current.author?.full_name && (
          <p className="mt-1 text-xs text-muted-foreground/60">— {current.author.full_name}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Pagination (if multiple) */}
        {updates.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              aria-label="Previous update"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={index === updates.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              aria-label="Next update"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </>
        )}

        {/* Acknowledge */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleAcknowledge}
          disabled={acknowledging}
        >
          {acknowledging ? 'Saving…' : 'Acknowledge'}
        </Button>

        {/* Dismiss all */}
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground/60 hover:text-muted-foreground"
          onClick={handleDismissAll}
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
