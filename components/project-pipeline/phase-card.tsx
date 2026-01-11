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
  ChevronUp,
  MoreHorizontal,
  Play,
  CheckCircle2,
  Circle,
  SkipForward,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPhaseTasks,
  updatePhaseStatus,
  updatePhaseName,
  deletePhase,
} from '@/app/actions/pipeline';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col rounded-xl border transition-all',
        isActive && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
        statusConfig.borderColor,
        statusConfig.bgColor
      )}
    >
      {/* Header - always visible */}
      <div
        className="flex cursor-pointer items-center gap-3 p-3"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSelect?.();
        }}
      >
        {/* Phase Icon */}
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            phaseConfig?.bgColor || 'bg-muted'
          )}
        >
          <PhaseIcon className={cn('h-4 w-4', phaseConfig?.color || 'text-muted-foreground')} />
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
                  className="h-6 w-40 text-sm font-semibold"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-green-600"
                  onClick={handleSaveEditName}
                  disabled={isPending}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground"
                  onClick={handleCancelEditName}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span className="truncate text-sm font-semibold">{phase.name}</span>
                {phase.status === 'completed' && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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

        {/* Progress */}
        {phase.task_count > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-border/50">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  phase.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'
                )}
                style={{ width: `${phase.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums">{phase.progress}%</span>
          </div>
        )}

        {/* Expand/Status Menu */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStartEditName}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit Name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange('not_started')}>
                <Circle className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Not Started
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                <Play className="mr-2 h-3.5 w-3.5 text-primary" />
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                Completed
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

          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
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
            <div className="space-y-4 border-t border-border/50 p-3">
              {/* Description */}
              {phase.description && (
                <p className="text-xs text-muted-foreground">{phase.description}</p>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
