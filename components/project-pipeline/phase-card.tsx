'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  getPipelinePhaseConfig,
  getPhaseStatusConfig,
  type PhaseStatus,
} from '@/lib/pipeline-constants';
import { PhaseTasks } from './phase-tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  MoreHorizontal,
  Play,
  CheckCircle2,
  Circle,
  SkipForward,
  Pencil,
  Trash2,
  Check,
  X,
  Lock,
  Unlock,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPhaseTasks,
  updatePhaseStatus,
  updatePhaseName,
  deletePhase,
} from '@/app/actions/pipeline';
import { unlockPhase } from '@/app/actions/phases';
import { PhasePromptModal } from './phase-prompt-modal';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  sort_order: number;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface PhaseCardProps {
  phase: {
    id: string;
    name: string;
    description: string | null;
    status: PhaseStatus;
    progress: number;
    task_count: number;
    completed_task_count: number;
    resource_count: number;
    is_locked?: boolean;
    helper_text?: string | null;
    template_key?: string | null;
  };
  projectId: string;
  workspaceId: string;
  isActive?: boolean;
  onSelect?: () => void;
  onDataChange?: () => void;
}

export function PhaseCard({
  phase,
  projectId,
  workspaceId,
  isActive,
  onSelect,
  onDataChange,
}: PhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(phase.name);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const phaseConfig = getPipelinePhaseConfig(phase.name);
  const statusConfig = getPhaseStatusConfig(phase.status);
  const PhaseIcon = phaseConfig?.icon || Circle;

  // Focus name input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Load tasks when expanded
  useEffect(() => {
    if (!isExpanded) return;

    let cancelled = false;
    setIsLoading(true);

    getPhaseTasks(phase.id)
      .then((tasksData) => {
        if (!cancelled) {
          setTasks(tasksData as Task[]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isExpanded, phase.id]);

  const refreshData = () => {
    getPhaseTasks(phase.id).then((tasksData) => {
      setTasks(tasksData as Task[]);
      onDataChange?.();
    });
  };

  const handleStatusChange = (newStatus: PhaseStatus) => {
    startTransition(async () => {
      await updatePhaseStatus(phase.id, newStatus, projectId);
      onDataChange?.();
    });
  };

  const handleStartEditName = () => {
    setEditingName(phase.name);
    setIsEditingName(true);
  };

  const handleSaveEditName = () => {
    if (!editingName.trim()) {
      setIsEditingName(false);
      return;
    }

    startTransition(async () => {
      await updatePhaseName(phase.id, editingName.trim(), projectId);
      setIsEditingName(false);
      onDataChange?.();
    });
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditingName(phase.name);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEditName();
    }
    if (e.key === 'Escape') {
      handleCancelEditName();
    }
  };

  const handleDeletePhase = () => {
    if (!confirm(`Delete phase "${phase.name}" and all its tasks?`)) return;

    startTransition(async () => {
      await deletePhase(phase.id, projectId);
      onDataChange?.();
    });
  };

  const handleUnlockPhase = () => {
    startTransition(async () => {
      await unlockPhase(phase.id);
      onDataChange?.();
    });
  };

  const isLocked = phase.is_locked ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-xl border transition-all',
        'shadow-sm hover:shadow-md',
        isActive && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
        isLocked && 'opacity-60',
        statusConfig.borderColor,
        statusConfig.bgColor
      )}
    >
      {/* Status indicator strip at top */}
      <div className={cn('h-1 w-full', statusConfig.stripColor)} />

      {/* Header - always visible */}
      <div
        className="flex cursor-pointer items-center gap-4 p-4"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSelect?.();
        }}
      >
        {/* Phase Icon - larger */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            phaseConfig?.bgColor || 'bg-muted'
          )}
        >
          <PhaseIcon className={cn('h-5 w-5', phaseConfig?.color || 'text-muted-foreground')} />
        </div>

        {/* Name & Progress */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  ref={nameInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  className="h-7 w-40 text-base font-semibold"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-green-600"
                  onClick={handleSaveEditName}
                  disabled={isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  onClick={handleCancelEditName}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <span className="truncate text-base font-semibold">{phase.name}</span>
                {isLocked && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
                {phase.status === 'completed' && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {phase.completed_task_count}/{phase.task_count} tasks
            </span>
            {phase.resource_count > 0 && (
              <>
                <span>•</span>
                <span>{phase.resource_count} resources</span>
              </>
            )}
          </div>
        </div>

        {/* Progress - wider bar */}
        {phase.task_count > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 overflow-hidden rounded-full bg-border/30">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  phase.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'
                )}
                style={{ width: `${phase.progress}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {phase.progress}%
            </span>
          </div>
        )}

        {/* Chevron only - cleaner */}
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50">
              {/* Quick Action Bar */}
              <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {phase.completed_task_count}/{phase.task_count} tasks completed
                </span>
                <div className="flex items-center gap-1">
                  {phase.status !== 'in_progress' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange('in_progress');
                      }}
                      disabled={isPending}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start
                    </Button>
                  )}
                  {phase.status !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-emerald-600 hover:text-emerald-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange('completed');
                      }}
                      disabled={isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete
                    </Button>
                  )}
                  {phase.helper_text && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPromptModal(true);
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Prompt
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleStartEditName}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit Name
                      </DropdownMenuItem>
                      {isLocked && (
                        <DropdownMenuItem onClick={handleUnlockPhase}>
                          <Unlock className="mr-2 h-3.5 w-3.5 text-amber-500" />
                          Unlock Phase
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleStatusChange('not_started')}>
                        <Circle className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        Not Started
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange('skipped')}>
                        <SkipForward className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        Skip
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDeletePhase} className="text-red-500">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete Phase
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Description */}
              {phase.description && (
                <p className="px-4 pt-3 text-sm text-muted-foreground">{phase.description}</p>
              )}

              {/* Tasks */}
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  </div>
                ) : (
                  <PhaseTasks
                    phaseId={phase.id}
                    phaseName={phase.name}
                    projectId={projectId}
                    workspaceId={workspaceId}
                    tasks={tasks}
                    onTasksChange={refreshData}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Perfect Prompt Modal */}
      <PhasePromptModal
        open={showPromptModal}
        onOpenChange={setShowPromptModal}
        phaseName={phase.name}
        prompt={phase.helper_text || ''}
      />
    </motion.div>
  );
}
