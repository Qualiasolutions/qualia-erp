'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import { Check, Loader2, ExternalLink, Layers } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getProjectPhases } from '@/app/actions/phases';
import { getProjectTasks, updateTask, type Task as InboxTask } from '@/app/actions/inbox';
import { invalidateProjectTasks, invalidateInboxTasks } from '@/lib/swr';
import Link from 'next/link';

interface Phase {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sort_order: number;
}

type Task = Pick<InboxTask, 'id' | 'title' | 'status' | 'phase_name' | 'sort_order' | 'item_type'>;

interface BuildingProjectSheetProps {
  project: {
    id: string;
    name: string;
    project_type: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Animation variants for staggered task entry
const taskContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.06,
    },
  },
} as const;

const taskItemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
} as const;

export function BuildingProjectSheet({ project, open, onOpenChange }: BuildingProjectSheetProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [recentlyToggled, setRecentlyToggled] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!project) return;
    setIsLoading(true);
    try {
      const [phasesData, tasksData] = await Promise.all([
        getProjectPhases(project.id),
        getProjectTasks(project.id),
      ]);
      setPhases(phasesData as Phase[]);
      setTasks(tasksData.filter((t) => t.item_type === 'task'));
    } catch (err) {
      console.error('Failed to fetch project data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (open && project) {
      fetchData();
    }
  }, [open, project, fetchData]);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'Todo' : 'Done';

    // Track which task was just toggled for animation
    setRecentlyToggled(taskId);
    setTimeout(() => setRecentlyToggled(null), 400);

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    const formData = new FormData();
    formData.set('id', taskId);
    formData.set('status', newStatus);

    startTransition(async () => {
      await updateTask(formData);
      invalidateProjectTasks(project!.id, true);
      invalidateInboxTasks(true);
    });
  };

  // Group tasks by phase
  const getPhaseData = () => {
    return phases.map((phase) => {
      const phaseTasks = tasks
        .filter((t) => t.phase_name === phase.name)
        .sort((a, b) => {
          if (a.status === 'Done' && b.status !== 'Done') return 1;
          if (a.status !== 'Done' && b.status === 'Done') return -1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });

      const completed = phaseTasks.filter((t) => t.status === 'Done').length;
      const total = phaseTasks.length;

      return { phase, tasks: phaseTasks, completed, total };
    });
  };

  const phaseData = getPhaseData();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const overallPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b border-border px-5 pb-5 pt-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base font-semibold">
                {project?.name || 'Project'}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Project checklist from start to production
              </SheetDescription>
            </div>
            <Button variant="ghost" size="sm" className="ml-2 shrink-0" asChild>
              <Link href={`/projects/${project?.id}`}>
                <ExternalLink className="mr-1.5 size-3.5" />
                Open
              </Link>
            </Button>
          </div>

          {/* Overall Progress -- visually distinct card */}
          {totalTasks > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/50">Overall progress</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums leading-none text-foreground">
                    {overallPercent}%
                  </span>
                  <span className="text-xs text-foreground/40">
                    ({completedTasks}/{totalTasks})
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                <m.div
                  className={cn(
                    'h-full rounded-full',
                    overallPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPercent}%` }}
                  transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="size-5 animate-spin text-foreground/30" />
              <span className="text-xs text-foreground/30">Loading phases...</span>
            </div>
          ) : phases.length === 0 ? (
            /* Empty state -- cleaner with dashed border */
            <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-dashed border-foreground/15 bg-muted/40">
                <Layers className="size-5 text-foreground/25" />
              </div>
              <p className="text-sm font-medium text-foreground/50">No phases configured</p>
              <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-foreground/30">
                Open the project to set up workflow phases and start tracking progress.
              </p>
              <Button variant="outline" size="sm" className="mt-5 h-8 text-xs" asChild>
                <Link href={`/projects/${project?.id}`}>Set up workflow</Link>
              </Button>
            </div>
          ) : (
            <div className="py-2">
              {phaseData.map(({ phase, tasks: phaseTasks, completed, total }, phaseIdx) => {
                const isPhaseComplete = total > 0 && completed === total;
                const hasStarted = completed > 0;
                const phasePercent = total > 0 ? (completed / total) * 100 : 0;

                return (
                  <div key={phase.id} className="relative">
                    {/* Phase Header */}
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                      <div className="flex items-center gap-3 px-5 py-3">
                        {/* Phase Status Icon */}
                        <div
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-300',
                            isPhaseComplete
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : hasStarted
                                ? 'bg-primary/15 text-primary'
                                : 'bg-foreground/5 text-foreground/40'
                          )}
                        >
                          {isPhaseComplete ? <Check className="size-3.5" /> : phaseIdx + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3
                            className={cn(
                              'truncate text-[13px] font-semibold transition-colors duration-300',
                              isPhaseComplete
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-foreground'
                            )}
                          >
                            {phase.name}
                          </h3>
                        </div>

                        {total > 0 && (
                          <span
                            className={cn(
                              'shrink-0 text-xs font-medium tabular-nums transition-colors duration-300',
                              isPhaseComplete ? 'text-emerald-500' : 'text-foreground/40'
                            )}
                          >
                            {completed}/{total}
                          </span>
                        )}
                      </div>

                      {/* Phase progress bar */}
                      {total > 0 && (
                        <div className="mx-5 mb-1 h-[2px] overflow-hidden rounded-full bg-foreground/[0.04]">
                          <m.div
                            className={cn(
                              'h-full rounded-full transition-colors duration-300',
                              isPhaseComplete
                                ? 'bg-emerald-500/60'
                                : hasStarted
                                  ? 'bg-primary/50'
                                  : 'bg-transparent'
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${phasePercent}%` }}
                            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Phase Tasks */}
                    {phaseTasks.length > 0 ? (
                      <div className="relative ml-[2.1rem] border-l border-border pb-2 pl-4 pr-5">
                        <m.div variants={taskContainerVariants} initial="hidden" animate="visible">
                          <AnimatePresence mode="popLayout">
                            {phaseTasks.map((task) => {
                              const isDone = task.status === 'Done';
                              const wasJustToggled = recentlyToggled === task.id;

                              return (
                                <m.button
                                  key={task.id}
                                  layout
                                  variants={taskItemVariants}
                                  exit={{ opacity: 0, x: -6, transition: { duration: 0.15 } }}
                                  onClick={() => handleToggleTask(task.id, task.status)}
                                  disabled={isPending}
                                  className={cn(
                                    'group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                                    'hover:bg-accent/50',
                                    isDone && 'opacity-50'
                                  )}
                                >
                                  {/* Checkbox with scale animation */}
                                  <m.span
                                    className={cn(
                                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-200',
                                      isDone
                                        ? 'border-emerald-500 bg-emerald-500 text-primary-foreground'
                                        : 'border-foreground/20 group-hover:border-primary/60'
                                    )}
                                    animate={
                                      wasJustToggled
                                        ? {
                                            scale: [1, 1.25, 0.95, 1],
                                          }
                                        : { scale: 1 }
                                    }
                                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                                  >
                                    <AnimatePresence mode="wait">
                                      {isDone && (
                                        <m.span
                                          key="check"
                                          initial={{ opacity: 0, scale: 0.5 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.5 }}
                                          transition={{ duration: 0.15 }}
                                        >
                                          <Check className="size-2.5" strokeWidth={3} />
                                        </m.span>
                                      )}
                                    </AnimatePresence>
                                  </m.span>

                                  {/* Title */}
                                  <span
                                    className={cn(
                                      'flex-1 text-[13px] leading-snug transition-all duration-200',
                                      isDone
                                        ? 'text-foreground/50 line-through decoration-foreground/20'
                                        : 'text-foreground'
                                    )}
                                  >
                                    {task.title}
                                  </span>
                                </m.button>
                              );
                            })}
                          </AnimatePresence>
                        </m.div>
                      </div>
                    ) : (
                      <div className="ml-[2.1rem] border-l border-border pb-2 pl-4 pr-5">
                        <p className="px-2.5 py-2 text-[12px] italic text-foreground/25">
                          No tasks yet
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
