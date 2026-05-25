'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function WorkPacketCommand({ command, label }: { command: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success('Command copied');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy command');
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background p-2">
      <div className="min-w-0 flex-1">
        {label ? (
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </div>
        ) : null}
        <code className="block truncate font-mono text-sm text-foreground">{command}</code>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copyCommand}
        className="h-8 shrink-0 px-2"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        <span className="sr-only">Copy command</span>
      </Button>
    </div>
  );
}
