'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Check, Terminal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhasePromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseName: string;
  prompt: string;
  gsdCommand?: string;
  qualiaSkills?: string[];
}

export function PhasePromptModal({
  open,
  onOpenChange,
  phaseName,
  prompt,
  gsdCommand,
  qualiaSkills,
}: PhasePromptModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {phaseName} - Perfect Prompt
          </DialogTitle>
          <DialogDescription>
            Copy this prompt and paste it to Claude Code to execute this phase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* GSD Command */}
          {gsdCommand && (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 p-3">
              <Terminal className="h-4 w-4 shrink-0 text-muted-foreground" />
              <code className="font-mono text-sm text-foreground">{gsdCommand}</code>
            </div>
          )}

          {/* Main Prompt */}
          <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
              <span className="text-xs font-medium text-zinc-500">Prompt</span>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 gap-1.5 text-xs',
                  copied ? 'text-green-500 hover:text-green-500' : 'text-zinc-400 hover:text-white'
                )}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed text-zinc-100">
              {prompt}
            </pre>
          </div>

          {/* Related Skills */}
          {qualiaSkills && qualiaSkills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Related Qualia Skills</h4>
              <div className="flex flex-wrap gap-2">
                {qualiaSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-sm text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Usage Tip */}
          <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Open your terminal, navigate to your project folder, run{' '}
              <code className="rounded bg-muted px-1 py-0.5">claude</code>, and paste this prompt to
              get started.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
