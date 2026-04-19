'use client';

import { useState, useEffect, useTransition, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  FolderPlus,
  Zap,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  GitBranch,
  Gauge,
  Layers,
  Package,
  Compass,
  ArrowLeft,
  Map as MapIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskDetailDialog } from '@/components/task-detail-dialog';
import type { Task as InboxTask } from '@/app/actions/inbox';
import {
  getProjectPhases,
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
  loadQualiaFrameworkPipeline,
} from '@/app/actions/phases';
import { getProjectTasks, createTask, updateTask, deleteTask } from '@/app/actions/inbox';
import { syncPlanningFromGitHub } from '@/app/actions/github-planning-sync';
import { invalidateProjectPhases, invalidateProjectTasks, invalidateInboxTasks } from '@/lib/swr';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PhaseComments } from '@/components/phase-comments';
import { PhaseItemsList } from '@/components/phase-items-list';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Phase {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sort_order: number;
  is_locked: boolean;
  milestone_number: number | null;
  phase_type: string | null;
  plan_count: number | null;
  plans_completed: number | null;
  started_at: string | null;
  completed_at: string | null;
  github_synced_at: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  phase_name: string | null;
  sort_order: number;
}

interface ProjectWorkflowProps {
  projectId: string;
  projectType: string | null;
  workspaceId: string;
  userRole?: string;
  className?: string;
}

interface MilestoneGroup {
  number: number;
  name: string;
  phases: Phase[];
  status: 'completed' | 'in_progress' | 'not_started';
}

// ─── Status helpers ─────────────────────────────────────────────────────────

function getPhaseStatusConfig(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('done')) {
    return {
      dot: 'bg-emerald-500',
      ring: 'ring-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]',
      border: 'border-emerald-500/20',
      label: 'Completed',
      icon: CheckCircle2,
    };
  }
  if (s.includes('progress') || s.includes('active')) {
    return {
      dot: 'bg-amber-500',
      ring: 'ring-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]',
      border: 'border-amber-500/20',
      label: 'In Progress',
      icon: Clock,
    };
  }
  if (s.includes('planned')) {
    return {
      dot: 'bg-sky-500',
      ring: 'ring-sky-500/20',
      text: 'text-sky-700 dark:text-sky-400',
      bg: 'bg-card',
      border: 'border-sky-500/20',
      label: 'Planned',
      icon: Circle,
    };
  }
  if (s.includes('skip')) {
    return {
      dot: 'bg-muted-foreground/30',
      ring: 'ring-muted-foreground/10',
      text: 'text-muted-foreground',
      bg: 'bg-muted/50',
      border: 'border-border',
      label: 'Skipped',
      icon: Circle,
    };
  }
  return {
    dot: 'bg-muted-foreground/30',
    ring: 'ring-muted-foreground/10',
    text: 'text-muted-foreground',
    bg: 'bg-card',
    border: 'border-border',
    label: 'Upcoming',
    icon: Circle,
  };
}

function getMilestoneStatus(phases: Phase[]): 'completed' | 'in_progress' | 'not_started' {
  if (phases.length === 0) return 'not_started';
  const allComplete = phases.every((p) => {
    const s = (p.status || '').toLowerCase();
    return s.includes('complete') || s.includes('done');
  });
  if (allComplete) return 'completed';
  const anyActive = phases.some((p) => {
    const s = (p.status || '').toLowerCase();
    return s.includes('progress') || s.includes('complete') || s.includes('done');
  });
  if (anyActive) return 'in_progress';
  return 'not_started';
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ─── Progress Summary ───────────────────────────────────────────────────────

function ProgressSummary({ phases: allPhases }: { phases: Phase[] }) {
  // Only count actual phases (not milestone headers) in progress
  const phases = allPhases.filter((p) => p.phase_type !== 'milestone');
  const completedPhases = phases.filter((p) => {
    const s = (p.status || '').toLowerCase();
    return s.includes('complete') || s.includes('done');
  }).length;

  const activePhase = phases.find((p) => {
    const s = (p.status || '').toLowerCase();
    return s.includes('progress');
  });

  const totalPlans = phases.reduce((sum, p) => sum + (p.plan_count || 0), 0);

  // For completed phases, all their plans are done — calculate from phase status
  const completedPlans = phases.reduce((sum, p) => {
    const s = (p.status || '').toLowerCase();
    const isComplete = s.includes('complete') || s.includes('done');
    if (isComplete) return sum + (p.plan_count || 0);
    return sum + (p.plans_completed || 0);
  }, 0);

  // Overall progress: based on phases completed (most reliable metric)
  const overallProgress =
    phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0;

  return (
    <div className="flex gap-2 overflow-x-auto px-5 py-4">
      {/* Overall progress */}
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-1.5">
          <Gauge className="size-3 text-muted-foreground/50" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Overall
          </p>
        </div>
        <div className="mt-1.5 flex items-end gap-1">
          <span className="text-xl font-bold tabular-nums text-foreground">{overallProgress}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              overallProgress === 100
                ? 'bg-emerald-500'
                : overallProgress > 0
                  ? 'bg-gradient-to-r from-primary to-primary/70'
                  : 'bg-muted-foreground/20'
            )}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-1.5">
          <Layers className="size-3 text-muted-foreground/50" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Phases
          </p>
        </div>
        <div className="mt-1.5 flex items-end gap-1">
          <span className="text-xl font-bold tabular-nums text-foreground">{completedPhases}</span>
          <span className="mb-0.5 text-xs text-muted-foreground">/ {phases.length}</span>
        </div>
      </div>

      {/* Plans */}
      {totalPlans > 0 && (
        <div className="min-w-0 flex-1 rounded-lg border border-border bg-card/50 p-3">
          <div className="flex items-center gap-1.5">
            <Package className="size-3 text-muted-foreground/50" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Plans
            </p>
          </div>
          <div className="mt-1.5 flex items-end gap-1">
            <span className="text-xl font-bold tabular-nums text-foreground">{completedPlans}</span>
            <span className="mb-0.5 text-xs text-muted-foreground">/ {totalPlans}</span>
          </div>
        </div>
      )}

      {/* Current phase */}
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-1.5">
          <Compass className="size-3 text-muted-foreground/50" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current
          </p>
        </div>
        <p className="mt-1.5 truncate text-xs font-semibold text-foreground">
          {activePhase?.name?.replace(/^\d+\.\d+\s*[—–-]\s*/, '') || 'Not started'}
        </p>
      </div>
    </div>
  );
}

// ─── Phase Row (in milestone list view) ─────────────────────────────────────

function PhaseRow({
  phase,
  isLast,
  taskProgress,
  onDrillIn,
  onEdit,
  onDelete,
  isPending,
}: {
  phase: Phase;
  isLast: boolean;
  taskProgress: { completed: number; total: number };
  onDrillIn: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const config = getPhaseStatusConfig(phase.status);
  const StatusIcon = config.icon;

  // Use plan counts if available, otherwise task progress
  const hasPlans = (phase.plan_count || 0) > 0;
  const total = hasPlans ? phase.plan_count! : taskProgress.total;
  const completed = hasPlans ? phase.plans_completed || 0 : taskProgress.completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = phase.status?.toLowerCase().includes('complete');

  return (
    <div className="group relative flex gap-3 sm:gap-4">
      {/* Timeline spine */}
      <div className="relative z-10 flex shrink-0 flex-col items-center">
        <div
          className={cn(
            'flex size-7 items-center justify-center rounded-full shadow-sm ring-2 sm:size-8',
            config.dot,
            config.ring
          )}
        >
          <StatusIcon className="size-3 text-white sm:size-3.5" strokeWidth={2.5} />
        </div>
        {!isLast && (
          <div className="mt-0.5 w-0.5 flex-1 bg-gradient-to-b from-border/60 to-transparent" />
        )}
      </div>

      {/* Phase card */}
      <button
        onClick={onDrillIn}
        className={cn(
          'flex flex-1 items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 sm:p-3.5',
          config.border,
          config.bg,
          'hover:shadow-sm',
          !isLast && 'mb-2'
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'truncate text-sm font-medium',
                isComplete ? 'text-muted-foreground' : 'text-foreground'
              )}
            >
              {phase.name}
            </p>
            {isComplete && (
              <Badge
                variant="outline"
                className="shrink-0 rounded-full border-emerald-500/20 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
              >
                Done
              </Badge>
            )}
          </div>
          {phase.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{phase.description}</p>
          )}
          {/* Dates */}
          {(phase.started_at || phase.completed_at) && (
            <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground/60">
              {phase.started_at && <span>Started {formatShortDate(phase.started_at)}</span>}
              {phase.completed_at && <span>Done {formatShortDate(phase.completed_at)}</span>}
            </div>
          )}
        </div>

        {/* Progress */}
        {total > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-1 w-14 overflow-hidden rounded-full bg-muted/40 sm:w-20">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  percent === 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-primary' : ''
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
              {completed}/{total}
            </span>
          </div>
        )}

        {total === 0 && <span className="text-[10px] text-muted-foreground/40">No tasks</span>}

        {/* Hover actions */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isPending}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── Milestone Section ──────────────────────────────────────────────────────

function MilestoneSection({
  milestone,
  tasksByPhase,
  onDrillIn,
  onEditPhase,
  onDeletePhase,
  isPending,
  defaultExpanded,
}: {
  milestone: MilestoneGroup;
  tasksByPhase: Map<string, Task[]>;
  onDrillIn: (phaseId: string) => void;
  onEditPhase: (phase: Phase) => void;
  onDeletePhase: (phaseId: string) => void;
  isPending: boolean;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const completedCount = milestone.phases.filter((p) => {
    const s = (p.status || '').toLowerCase();
    return s.includes('complete') || s.includes('done');
  }).length;

  const msConfig =
    milestone.status === 'completed'
      ? {
          bg: 'bg-emerald-500/[0.06]',
          border: 'border-emerald-500/20',
          text: 'text-emerald-600 dark:text-emerald-400',
        }
      : milestone.status === 'in_progress'
        ? {
            bg: 'bg-amber-500/[0.04]',
            border: 'border-amber-500/20',
            text: 'text-amber-600 dark:text-amber-400',
          }
        : { bg: 'bg-card/50', border: 'border-border', text: 'text-muted-foreground' };

  return (
    <div className="mb-4 last:mb-0">
      {/* Milestone header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all',
          msConfig.bg,
          msConfig.border,
          'hover:shadow-sm'
        )}
      >
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            !expanded && '-rotate-90'
          )}
        />
        {milestone.status === 'completed' ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
        ) : milestone.status === 'in_progress' ? (
          <Clock className="size-4 shrink-0 text-amber-500" />
        ) : (
          <Circle className="size-4 shrink-0 text-muted-foreground/30" />
        )}
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground">{milestone.name}</span>
        </div>
        <span className={cn('text-xs font-medium tabular-nums', msConfig.text)}>
          {completedCount}/{milestone.phases.length} phases
        </span>
      </button>

      {/* Phases inside milestone */}
      {expanded && (
        <div className="mt-2 pl-4 sm:pl-6">
          {milestone.phases.map((phase, idx) => {
            const phaseTasks = tasksByPhase.get(phase.name) || [];
            const completed = phaseTasks.filter((t) => t.status === 'Done').length;

            return (
              <PhaseRow
                key={phase.id}
                phase={phase}
                isLast={idx === milestone.phases.length - 1}
                taskProgress={{ completed, total: phaseTasks.length }}
                onDrillIn={() => onDrillIn(phase.id)}
                onEdit={() => onEditPhase(phase)}
                onDelete={() => onDeletePhase(phase.id)}
                isPending={isPending}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ProjectWorkflow({
  projectId,
  workspaceId,
  userRole,
  className,
}: ProjectWorkflowProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // New phase creation
  const [showNewPhase, setShowNewPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const newPhaseInputRef = useRef<HTMLInputElement>(null);

  // New task creation
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Phase editing
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState('');

  // Task editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  // Task view dialog
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Confirm dialog (shared)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    action: () => void;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [phasesData, tasksData] = await Promise.all([
        getProjectPhases(projectId),
        getProjectTasks(projectId),
      ]);
      setPhases(phasesData as Phase[]);
      setTasks(tasksData as Task[]);
    } catch (err) {
      console.error('Failed to fetch workflow data:', err);
      toast.error('Failed to load workflow');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if this project has GitHub-synced phases
  const isGitHubSynced = phases.some((p) => p.github_synced_at);

  // Separate milestone records from phase records
  const milestoneRecords = useMemo(
    () => phases.filter((p) => p.phase_type === 'milestone'),
    [phases]
  );
  const phaseRecords = useMemo(() => phases.filter((p) => p.phase_type !== 'milestone'), [phases]);

  // Group phases by milestone
  const milestones = useMemo((): MilestoneGroup[] => {
    const groups = new Map<number, MilestoneGroup>();

    // Normalize milestone labels so they match the framework's Milestone → Phase
    // hierarchy visually. Upstream JOURNEY.md sometimes names milestone 0
    // "Phase 0: …" for historical reasons, which collides with the "X/Y phases"
    // child counter. Rewrite at display time — keeps DB + framework source intact.
    const toMilestoneLabel = (rawName: string | undefined, msNum: number): string => {
      if (rawName) return rawName.replace(/^Phase\s+(\d+)/i, 'Milestone $1');
      if (msNum >= 0) return `Milestone ${msNum}`;
      return 'Phases';
    };

    for (const phase of phaseRecords) {
      const msNum = phase.milestone_number ?? -1;
      if (!groups.has(msNum)) {
        // Look for a milestone record with this number for the real name
        const msRecord = milestoneRecords.find((m) => m.milestone_number === msNum);
        groups.set(msNum, {
          number: msNum,
          name: toMilestoneLabel(msRecord?.name, msNum),
          phases: [],
          status: (msRecord?.status as MilestoneGroup['status']) || 'not_started',
        });
      }
      groups.get(msNum)!.phases.push(phase);
    }

    // Recalculate milestone statuses from child phases
    const sorted = Array.from(groups.values()).sort((a, b) => a.number - b.number);
    for (const ms of sorted) {
      ms.status = getMilestoneStatus(ms.phases);
    }
    return sorted;
  }, [phaseRecords, milestoneRecords]);

  // Map tasks by phase name
  const tasksByPhase = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.phase_name) {
        if (!map.has(task.phase_name)) map.set(task.phase_name, []);
        map.get(task.phase_name)!.push(task);
      }
    }
    return map;
  }, [tasks]);

  // Unphased tasks
  const unphasedTasks = tasks.filter(
    (t) => !t.phase_name || !phases.some((p) => p.name === t.phase_name)
  );

  // Active phase
  const activePhase =
    activePhaseId === '__general' ? null : phases.find((p) => p.id === activePhaseId) || null;

  const isGeneralView = activePhaseId === '__general';
  const isDrilledIn = activePhaseId !== null;

  // Tasks for active view
  const phaseTasks = isGeneralView
    ? unphasedTasks
    : activePhase
      ? tasks.filter((t) => t.phase_name === activePhase.name)
      : [];

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPlanningFromGitHub(projectId);
      if (result.success && result.data) {
        toast.success(
          `Synced ${result.data.phasesUpserted} phases from ${result.data.repoFullName}`
        );
        await fetchData();
        invalidateProjectPhases(projectId);
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch {
      toast.error('Failed to sync from GitHub');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddPhase = async () => {
    if (!newPhaseName.trim()) return;
    startTransition(async () => {
      const result = await createProjectPhase(projectId, newPhaseName.trim());
      if (result.success) {
        setNewPhaseName('');
        setShowNewPhase(false);
        await fetchData();
        invalidateProjectPhases(projectId);
        toast.success('Phase created');
      } else {
        toast.error(result.error || 'Failed to create phase');
      }
    });
  };

  const handleUpdatePhase = async (phaseId: string) => {
    if (!editingPhaseName.trim()) {
      setEditingPhaseId(null);
      return;
    }
    startTransition(async () => {
      const result = await updateProjectPhase(phaseId, editingPhaseName.trim(), projectId);
      if (result.success) {
        setEditingPhaseId(null);
        await fetchData();
        invalidateProjectPhases(projectId);
      } else {
        toast.error(result.error || 'Failed to update phase');
      }
    });
  };

  const handleDeletePhase = (phaseId: string) => {
    setConfirmDialog({
      title: 'Delete phase?',
      description: 'This will delete this phase and all its tasks. This action cannot be undone.',
      confirmLabel: 'Delete',
      action: () => {
        startTransition(async () => {
          const result = await deleteProjectPhase(phaseId, projectId);
          if (result.success) {
            await fetchData();
            invalidateProjectPhases(projectId);
            if (activePhaseId === phaseId) setActivePhaseId(null);
            toast.success('Phase deleted');
          } else {
            toast.error(result.error || 'Failed to delete phase');
          }
        });
      },
    });
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const formData = new FormData();
    formData.set('title', newTaskTitle.trim());
    formData.set('project_id', projectId);
    formData.set('workspace_id', workspaceId);
    if (activePhase) formData.set('phase_name', activePhase.name);
    formData.set('status', 'Todo');
    formData.set('priority', 'No Priority');
    formData.set('show_in_inbox', 'true');

    startTransition(async () => {
      const result = await createTask(formData);
      if (result.success) {
        setNewTaskTitle('');
        await fetchData();
        invalidateProjectTasks(projectId, true);
        invalidateInboxTasks(true);
        newTaskInputRef.current?.focus();
      } else {
        toast.error('Failed to create task');
      }
    });
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'Todo' : 'Done';
    const formData = new FormData();
    formData.set('id', taskId);
    formData.set('status', newStatus);
    startTransition(async () => {
      await updateTask(formData);
      await fetchData();
      invalidateProjectTasks(projectId, true);
    });
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!editingTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    const formData = new FormData();
    formData.set('id', taskId);
    formData.set('title', editingTaskTitle.trim());
    startTransition(async () => {
      await updateTask(formData);
      setEditingTaskId(null);
      await fetchData();
      invalidateProjectTasks(projectId, true);
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmDialog({
      title: 'Delete task?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      action: () => {
        startTransition(async () => {
          const result = await deleteTask(taskId);
          if (!result.success) {
            toast.error(result.error ?? 'Failed to delete task');
            return;
          }
          await fetchData();
          invalidateProjectTasks(projectId, true);
        });
      },
    });
  };

  const handleLoadFramework = async () => {
    startTransition(async () => {
      const result = await loadQualiaFrameworkPipeline(projectId);
      if (result.success) {
        toast.success(`Loaded ${result.phasesCreated} phases`);
        await fetchData();
        invalidateProjectPhases(projectId);
        invalidateInboxTasks(true);
      } else {
        toast.error(result.error || 'Failed to load framework');
      }
    });
  };

  // Sort tasks: incomplete first, then by sort_order
  const sortedTasks = [...phaseTasks].sort((a, b) => {
    if (a.status === 'Done' && b.status !== 'Done') return 1;
    if (a.status !== 'Done' && b.status === 'Done') return -1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────────────

  if (phases.length === 0 && unphasedTasks.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-6 px-6', className)}>
        <div className="text-center">
          <FolderPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <h3 className="mb-1 text-lg font-semibold text-foreground">No phases yet</h3>
          <p className="text-sm text-muted-foreground">
            Sync from GitHub, load the Qualia Framework, or create phases manually.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          {/* Sync from GitHub */}
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            {isSyncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <GitBranch className="h-3.5 w-3.5" />
            )}
            Sync from GitHub
          </Button>
          <Button onClick={handleLoadFramework} disabled={isPending} className="gap-2" size="sm">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Load Qualia Framework
          </Button>
          <div className="flex items-center gap-2">
            <Input
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              placeholder="Or create a phase..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
              disabled={isPending}
              className="h-8 w-56 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddPhase}
              disabled={isPending || !newPhaseName.trim()}
              className="h-8"
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Phase Detail View (drilled in) ────────────────────────────────────────

  if (isDrilledIn) {
    const phaseName = isGeneralView ? 'General Tasks' : activePhase?.name || '';
    const phaseDesc = activePhase?.description;
    const doneCount = sortedTasks.filter((t) => t.status === 'Done').length;

    return (
      <div className={cn('flex flex-col', className)}>
        {/* Phase header bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
          <button
            onClick={() => setActivePhaseId(null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">{phaseName}</h2>
            {phaseDesc && <p className="truncate text-xs text-muted-foreground">{phaseDesc}</p>}
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {doneCount}/{sortedTasks.length} done
          </span>
        </div>

        {/* Task list — scrollable */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            {/* Add task input */}
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2">
              <Plus
                className={cn(
                  'h-4 w-4 shrink-0',
                  newTaskTitle.trim() ? 'text-primary' : 'text-muted-foreground/40'
                )}
              />
              <input
                ref={newTaskInputRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a task... (Enter)"
                disabled={isPending}
                className="h-7 flex-1 bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none"
              />
              {newTaskTitle.trim() && (
                <Button
                  size="sm"
                  onClick={handleAddTask}
                  disabled={isPending}
                  className="h-6 px-2 text-xs"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                </Button>
              )}
            </div>

            {/* Tasks */}
            <div className="space-y-px">
              {sortedTasks.map((task) => {
                const isDone = task.status === 'Done';
                const isEditing = editingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                      isDone ? 'opacity-50' : 'hover:bg-muted/30'
                    )}
                  >
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      className={cn(
                        'h-4 w-4 shrink-0 rounded border-[1.5px] transition-all',
                        isDone
                          ? 'border-emerald-500 bg-emerald-500 text-primary-foreground'
                          : 'border-muted-foreground/25 hover:border-primary'
                      )}
                      disabled={isPending}
                    />
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateTask(task.id);
                            if (e.key === 'Escape') setEditingTaskId(null);
                          }}
                          onBlur={() => handleUpdateTask(task.id)}
                          autoFocus
                          className="w-full bg-transparent text-sm font-medium focus:outline-none"
                          disabled={isPending}
                        />
                      ) : (
                        <span
                          className={cn(
                            'text-sm',
                            isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                          )}
                          onDoubleClick={() => {
                            if (!isDone) {
                              setEditingTaskId(task.id);
                              setEditingTaskTitle(task.title);
                            }
                          }}
                        >
                          {task.title}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {task.description && (
                        <button
                          onClick={() => setViewingTask(task)}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          title="View details"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      )}
                      {!isDone && (
                        <button
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setEditingTaskTitle(task.title);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={isPending}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {phaseTasks.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground/60">Add your first task above</p>
              </div>
            )}

            {/* Framework-sourced task breakdown (from each phase PLAN.md) */}
            {activePhase && (
              <PhaseItemsList
                phaseId={activePhase.id}
                className="mt-6 border-t border-border pt-4"
              />
            )}
          </div>
        </div>

        {/* Phase Comments */}
        {activePhase && (
          <PhaseComments
            projectId={projectId}
            phaseName={activePhase.name}
            isAdmin={userRole === 'admin'}
          />
        )}

        {/* Task view dialog */}
        <TaskDetailDialog
          task={viewingTask as unknown as InboxTask}
          open={!!viewingTask}
          onOpenChange={(open) => {
            if (!open) setViewingTask(null);
          }}
          onEdit={() => {
            if (viewingTask) {
              setEditingTaskId(viewingTask.id);
              setEditingTaskTitle(viewingTask.title);
              setViewingTask(null);
            }
          }}
          onToggleDone={(t) => {
            handleToggleTask(t.id, t.status);
            setViewingTask(null);
          }}
        />

        <ConfirmDialog
          open={!!confirmDialog}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
          title={confirmDialog?.title ?? ''}
          description={confirmDialog?.description ?? ''}
          confirmLabel={confirmDialog?.confirmLabel ?? 'Confirm'}
          onConfirm={() => {
            confirmDialog?.action();
            setConfirmDialog(null);
          }}
        />
      </div>
    );
  }

  // ─── Milestone Overview ───────────────────────────────────────────────────

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Roadmap
          </div>
          {isGitHubSynced && (
            <Badge variant="outline" className="gap-1 rounded-full px-2 py-0 text-[10px]">
              <GitBranch className="size-2.5" />
              Synced
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
            title="Sync from GitHub .planning"
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Sync
          </button>
          {/* Add phase */}
          {showNewPhase ? (
            <div className="flex items-center gap-1.5">
              <Input
                ref={newPhaseInputRef}
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                placeholder="Phase name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddPhase();
                  if (e.key === 'Escape') {
                    setShowNewPhase(false);
                    setNewPhaseName('');
                  }
                }}
                autoFocus
                className="h-7 w-40 text-xs"
                disabled={isPending}
              />
              <Button
                size="sm"
                onClick={handleAddPhase}
                disabled={isPending || !newPhaseName.trim()}
                className="h-7 px-2 text-xs"
              >
                Add
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowNewPhase(true);
                setTimeout(() => newPhaseInputRef.current?.focus(), 50);
              }}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add phase
            </button>
          )}
        </div>
      </div>

      {/* Roadmap View */}
      <>
        {/* Progress summary cards */}
        <ProgressSummary phases={phases} />

        {/* Milestone sections — scrollable */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 pb-4">
            {/* General tasks section */}
            {unphasedTasks.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setActivePhaseId('__general')}
                  className="group flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-muted/20"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/30">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Unphased Tasks</p>
                    <p className="text-xs text-muted-foreground">
                      {unphasedTasks.filter((t) => t.status === 'Done').length}/
                      {unphasedTasks.length} done
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-foreground" />
                </button>
              </div>
            )}

            {/* Milestone groups */}
            {milestones.map((ms) => (
              <MilestoneSection
                key={ms.number}
                milestone={ms}
                tasksByPhase={tasksByPhase}
                onDrillIn={(phaseId) => setActivePhaseId(phaseId)}
                onEditPhase={(phase) => {
                  setEditingPhaseId(phase.id);
                  setEditingPhaseName(phase.name);
                }}
                onDeletePhase={handleDeletePhase}
                isPending={isPending}
                defaultExpanded={ms.status === 'in_progress' || milestones.length === 1}
              />
            ))}

            {/* Phase name edit dialog */}
            <Dialog
              open={!!editingPhaseId}
              onOpenChange={(open) => !open && setEditingPhaseId(null)}
            >
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Phase Name</DialogTitle>
                </DialogHeader>
                <Input
                  value={editingPhaseName}
                  onChange={(e) => setEditingPhaseName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingPhaseId) handleUpdatePhase(editingPhaseId);
                  }}
                  autoFocus
                  className="mb-3"
                  disabled={isPending}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingPhaseId(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => editingPhaseId && handleUpdatePhase(editingPhaseId)}
                    disabled={isPending}
                  >
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <ConfirmDialog
              open={!!confirmDialog}
              onOpenChange={(open) => !open && setConfirmDialog(null)}
              title={confirmDialog?.title ?? ''}
              description={confirmDialog?.description ?? ''}
              confirmLabel={confirmDialog?.confirmLabel ?? 'Confirm'}
              onConfirm={() => {
                confirmDialog?.action();
                setConfirmDialog(null);
              }}
            />
          </div>
        </div>
      </>
    </div>
  );
}
