'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * One-shot announcement for internal users (admin + employee) telling them
 * to update qualia-framework. Dismissed via localStorage so it only nags
 * once per release. Bump `STORAGE_KEY` to re-trigger after the next release.
 *
 * Mounted from app/(portal)/layout.tsx and gated to internal roles only —
 * clients never see it.
 */

const STORAGE_KEY = 'qualia-framework-update-2026-04-26';
const COMMAND = 'npx qualia-framework@latest install';

export function FrameworkUpdateNotice() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) === 'dismissed') return;
    // Defer so the page has a frame to settle before the dialog mounts.
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  function dismiss() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'dismissed');
    }
    setOpen(false);
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      toast.success('Copied to clipboard');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed — select the text manually');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Terminal className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle>Update Qualia Framework</DialogTitle>
          <DialogDescription>
            Run this in your terminal to pull the latest framework version with new skills,
            commands, and bug fixes.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
            {COMMAND}
          </code>
          <button
            type="button"
            onClick={copyCommand}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Copy command"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: run it from any project folder — the framework installs globally for your user.
        </p>

        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <Button variant="outline" onClick={dismiss}>
            Remind me later
          </Button>
          <Button onClick={dismiss}>Done — I updated</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
