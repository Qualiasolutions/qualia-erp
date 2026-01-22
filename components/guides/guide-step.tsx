'use client';

import { useState } from 'react';
import { Check, Copy, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GuideStep } from '@/lib/guides-data';

interface GuideStepProps {
  step: GuideStep;
  stepNumber: number;
  isCompleted: boolean;
  onToggleComplete: (stepId: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'absolute right-2 top-2 rounded-md p-1.5 transition-all',
        'text-muted-foreground/50 hover:bg-white/10 hover:text-foreground',
        copied && 'text-emerald-400'
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CommandBlock({ commands }: { commands: string[] }) {
  const fullText = commands.join('\n');

  return (
    <div className="group relative mt-3 rounded-lg bg-zinc-900 p-4 font-mono text-sm">
      <CopyButton text={fullText} />
      <pre className="overflow-x-auto pr-10 text-emerald-400">
        {commands.map((cmd, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {cmd}
          </div>
        ))}
      </pre>
    </div>
  );
}

function TipBlock({ tips }: { tips: string[] }) {
  return (
    <div className="mt-3 space-y-2">
      {tips.map((tip, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start gap-2 rounded-lg p-3 text-sm',
            'bg-amber-500/10 text-amber-200'
          )}
        >
          <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <span className="font-mono text-xs leading-relaxed">{tip}</span>
        </div>
      ))}
    </div>
  );
}

export function GuideStepCard({ step, stepNumber, isCompleted, onToggleComplete }: GuideStepProps) {
  const hasWarning = !!step.warning;
  const isMilestone = step.isMilestone;

  return (
    <div
      className={cn(
        'relative rounded-xl border p-5 transition-all',
        hasWarning
          ? 'border-red-500/30 bg-red-500/5'
          : isMilestone
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-border/50 bg-card/50',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Step header */}
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(step.id)}
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
            isCompleted
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : hasWarning
                ? 'border-red-400 text-red-400 hover:bg-red-400/10'
                : isMilestone
                  ? 'border-amber-400 text-amber-400 hover:bg-amber-400/10'
                  : 'border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary'
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : hasWarning ? (
            <AlertTriangle className="h-4 w-4" />
          ) : isMilestone ? (
            <span className="text-xs font-bold">M</span>
          ) : (
            <span className="text-xs font-semibold">{stepNumber}</span>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'font-semibold',
              isCompleted && 'line-through',
              hasWarning && 'text-red-400',
              isMilestone && 'text-amber-400'
            )}
          >
            {step.title}
          </h3>

          {step.warning && <p className="mt-2 text-sm text-red-300">{step.warning}</p>}

          {step.description && !step.warning && (
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          )}

          {step.commands && step.commands.length > 0 && <CommandBlock commands={step.commands} />}

          {step.tips && step.tips.length > 0 && <TipBlock tips={step.tips} />}
        </div>
      </div>
    </div>
  );
}
