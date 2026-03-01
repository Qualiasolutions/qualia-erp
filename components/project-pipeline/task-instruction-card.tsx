'use client';

import { memo, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Info, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPhasePromptData } from '@/lib/gsd-templates';
import { toast } from 'sonner';

interface PhaseItem {
  id: string;
  title: string;
  description: string | null;
  helper_text: string | null;
  template_key: string | null;
  is_completed: boolean;
  display_order: number;
}

interface TaskInstructionCardProps {
  phaseItem: PhaseItem;
  onToggle: (itemId: string, isCompleted: boolean) => void;
  disabled?: boolean;
}

function TaskInstructionCardComponent({
  phaseItem,
  onToggle,
  disabled = false,
}: TaskInstructionCardProps) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDone = phaseItem.is_completed;

  // Extract GSD command from template_key if available
  const promptData = getPhasePromptData(phaseItem.template_key);
  const hasGSDCommand = promptData?.gsdCommand;

  const handleCopy = async () => {
    if (!hasGSDCommand) return;

    try {
      await navigator.clipboard.writeText(promptData.gsdCommand);
      setCopied(true);
      toast.success('GSD command copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy command');
    }
  };

  const handleToggle = () => {
    startTransition(() => {
      onToggle(phaseItem.id, phaseItem.is_completed);
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{
        opacity: isDone ? 0.5 : 1,
        y: 0,
      }}
      exit={{ opacity: 0, x: -16, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'group flex flex-col gap-2 rounded-lg px-3 py-2.5 transition-all duration-200',
        isDone ? 'bg-transparent' : 'hover:bg-muted/30',
        isPending && 'pointer-events-none opacity-70'
      )}
    >
      {/* Main row: Checkbox + Title */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={isDone}
          onCheckedChange={handleToggle}
          className="mt-0.5 h-[18px] w-[18px] rounded-md border-border/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          disabled={disabled || isPending}
        />

        {/* Title */}
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'text-sm font-medium leading-snug',
              isDone && 'text-muted-foreground line-through'
            )}
          >
            {phaseItem.title}
          </span>
        </div>
      </div>

      {/* Helper text - below title, indented to align with text */}
      {phaseItem.helper_text && !isDone && (
        <div className="ml-[30px] flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary/50" />
          <span className="leading-relaxed">{phaseItem.helper_text}</span>
        </div>
      )}

      {/* GSD Command - copyable code block */}
      {hasGSDCommand && !isDone && (
        <div className="ml-[30px] mt-1">
          <div className="group/code relative flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <code className="flex-1 font-mono text-xs text-foreground/80">
              {promptData.gsdCommand}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 w-6 shrink-0 p-0 opacity-0 transition-opacity group-hover/code:opacity-100',
                copied && 'opacity-100'
              )}
              onClick={handleCopy}
              disabled={disabled || isPending}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export const TaskInstructionCard = memo(TaskInstructionCardComponent);
