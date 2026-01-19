'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, ChevronRight, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getPhasesForCategory,
  type ProjectCategory,
  getTotalPhaseItems,
} from '@/lib/trainee-phase-template';
import { updateProjectPhaseProgress } from '@/app/actions';
import { toast } from 'sonner';

interface ProjectWorkflowProps {
  projectId: string;
  projectType: string | null;
  initialProgress: Record<string, number[]> | null;
  className?: string;
}

export function ProjectWorkflow({
  projectId,
  projectType,
  initialProgress,
  className,
}: ProjectWorkflowProps) {
  const category = (projectType as ProjectCategory) || 'ai_agent';
  const phases = getPhasesForCategory(category);

  const [progress, setProgress] = useState<Record<string, number[]>>(initialProgress || {});
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);

  // Calculate stats
  const totalItems = getTotalPhaseItems(category);
  const completedCount = Object.values(progress).reduce((acc, curr) => acc + curr.length, 0);
  const overallProgress = Math.round((completedCount / totalItems) * 100);

  // Initialize active phase to the first incomplete one
  useEffect(() => {
    const firstIncompleteIndex = phases.findIndex((phase) => {
      const completedItems = progress[phase.name] || [];
      return completedItems.length < phase.items.length;
    });

    if (firstIncompleteIndex !== -1) {
      setActivePhaseIndex(firstIncompleteIndex);
    } else {
      setActivePhaseIndex(phases.length - 1); // All done
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleItem = async (phaseName: string, itemIndex: number) => {
    const currentPhaseProgress = progress[phaseName] || [];
    const isCompleted = currentPhaseProgress.includes(itemIndex);

    let newPhaseProgress;
    if (isCompleted) {
      newPhaseProgress = currentPhaseProgress.filter((i) => i !== itemIndex);
    } else {
      newPhaseProgress = [...currentPhaseProgress, itemIndex];
    }

    const newProgress = {
      ...progress,
      [phaseName]: newPhaseProgress,
    };

    setProgress(newProgress);

    // Auto-save
    try {
      const result = await updateProjectPhaseProgress(projectId, newProgress);
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch {
      toast.error('Failed to save progress');
      // Revert on error
      setProgress(progress);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header Stat Bar */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Project Workflow</h2>
            <p className="text-sm font-medium text-muted-foreground">
              Follow the steps to build and ship your project.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Completion
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-primary/80 to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Left: Phase Navigation */}
        <div className="space-y-2">
          {phases.map((phase, idx) => {
            const phaseProgress = progress[phase.name] || [];
            const isComplete = phaseProgress.length === phase.items.length;
            const isActive = idx === activePhaseIndex;
            const percent = Math.round((phaseProgress.length / phase.items.length) * 100);

            return (
              <button
                key={phase.name}
                onClick={() => setActivePhaseIndex(idx)}
                className={cn(
                  'group relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all duration-200',
                  isActive
                    ? 'border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                )}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                        isComplete
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/10 text-muted-foreground'
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div>
                      <span
                        className={cn(
                          'block font-bold',
                          isActive ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {phase.name}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {phaseProgress.length}/{phase.items.length} Tasks
                      </span>
                    </div>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 animate-pulse text-primary" />}
                </div>

                {/* Background Progress Fill */}
                <div
                  className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </button>
            );
          })}
        </div>

        {/* Right: Active Phase Tasks */}
        <div className="space-y-6">
          <div className="relative min-h-[500px] overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            {/* Decorative blob */}
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />

            <div className="relative z-10">
              <div className="mb-8">
                <h3 className="mb-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                  {phases[activePhaseIndex].name}
                  {progress[phases[activePhaseIndex].name]?.length ===
                    phases[activePhaseIndex].items.length && (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-emerald-500">
                      Completed
                    </span>
                  )}
                </h3>
                <p className="text-lg text-muted-foreground">
                  {phases[activePhaseIndex].description}
                </p>
              </div>

              <div className="space-y-4">
                {phases[activePhaseIndex].items.map((item, idx) => {
                  const isChecked = (progress[phases[activePhaseIndex].name] || []).includes(idx);
                  const isPrompt =
                    item.title.startsWith('Prompt Claude') || item.title.startsWith('/');

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'group flex items-start gap-4 rounded-xl border p-4 transition-all duration-200',
                        isChecked
                          ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
                          : 'border-white/5 bg-white/[0.02] hover:border-primary/20 hover:bg-white/[0.04]'
                      )}
                    >
                      <button
                        onClick={() => handleToggleItem(phases[activePhaseIndex].name, idx)}
                        className={cn(
                          'mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200',
                          isChecked
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                            : 'border-muted-foreground/30 hover:border-primary group-hover:scale-110'
                        )}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                      </button>

                      <div className="flex-1 space-y-2">
                        <div
                          className={cn(
                            'font-medium transition-colors',
                            isChecked
                              ? 'text-muted-foreground line-through decoration-emerald-500/50'
                              : 'text-foreground'
                          )}
                        >
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        )}

                        {/* Action Buttons for Prompts */}
                        {isPrompt && !isChecked && (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-2 border-white/10 bg-white/5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                              onClick={() => copyToClipboard(item.title)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy Prompt
                            </Button>
                            {item.title.startsWith('/') && (
                              <div className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[10px] text-muted-foreground">
                                <Terminal className="h-3 w-3" />
                                Run via specific tool
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
