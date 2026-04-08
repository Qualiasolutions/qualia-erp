'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OwnerUpdate } from '@/app/actions/owner-updates';

interface OwnerUpdatesBannerProps {
  workspaceId: string;
}

export function OwnerUpdatesBanner({ workspaceId }: OwnerUpdatesBannerProps) {
  const [updates, setUpdates] = useState<OwnerUpdate[]>([]);
  const [index, setIndex] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    const { getOwnerUpdates } = await import('@/app/actions/owner-updates');
    const data = await getOwnerUpdates(workspaceId, { unreadOnly: true });
    setUpdates(data);
    setIndex(0);
    if (data.length > 0) {
      setTimeout(() => setOpen(true), 300);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (updates.length === 0) return null;

  const current = updates[index];
  if (!current) return null;

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      const { acknowledgeOwnerUpdate } = await import('@/app/actions/owner-updates');
      await acknowledgeOwnerUpdate(current.id);
      const next = updates.filter((u) => u.id !== current.id);
      setUpdates(next);
      setIndex((prev) => Math.min(prev, next.length - 1));
      if (next.length === 0) {
        setClosing(true);
        setTimeout(() => setOpen(false), 300);
      }
    } finally {
      setAcknowledging(false);
    }
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setOpen(false), 300);
  };

  const formatBody = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-3" />;
      const html = line
        .replace(
          /`([^`]+)`/g,
          '<code class="rounded bg-qualia-900/10 dark:bg-qualia-400/10 px-1.5 py-0.5 font-mono text-[11px] text-qualia-700 dark:text-qualia-300">$1</code>'
        )
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-medium text-foreground">$1</strong>');
      return (
        <p
          key={i}
          className="text-[13px] leading-[1.7] text-foreground/70"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-overlay bg-black/80 transition-opacity duration-300',
          closing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed left-1/2 top-1/2 z-modal w-full max-w-md -translate-x-1/2 -translate-y-1/2 transition-all duration-300',
          closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 dark:shadow-black/30">
          {/* Title area */}
          <div className="px-7 pb-2 pt-7">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
              {current.title}
            </h2>
          </div>

          {/* Body */}
          <div className="px-7 pb-5 pt-1">{formatBody(current.body)}</div>

          {/* Divider */}
          <div className="mx-7 h-px bg-border" />

          {/* Footer */}
          <div className="flex items-center justify-between px-7 py-4">
            {/* Pagination */}
            <div className="flex items-center gap-1">
              {updates.length > 1 && (
                <>
                  <button
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => setIndex((i) => i - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="px-1 text-[11px] tabular-nums text-muted-foreground">
                    {index + 1}/{updates.length}
                  </span>
                  <button
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    disabled={index === updates.length - 1}
                    onClick={() => setIndex((i) => i + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}
            </div>

            <Button
              size="sm"
              className="h-8 rounded-lg px-5 text-[12px] font-medium"
              onClick={handleAcknowledge}
              disabled={acknowledging}
            >
              {acknowledging ? 'Closing...' : 'Understood'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
