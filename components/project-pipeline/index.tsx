'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { PipelineProgress } from './progress';
import { PhaseCard } from './phase-card';
import {
  getProjectPhasesWithDetails,
  initializeProjectPipeline,
  createPhase,
  type PhaseWithDetails,
} from '@/app/actions/pipeline';
import { type PhaseStatus } from '@/lib/pipeline-constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Plus, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectPipelineProps {
  projectId: string;
  workspaceId: string;
  className?: string;
}

export function ProjectPipeline({ projectId, workspaceId, className }: ProjectPipelineProps) {
  const [phases, setPhases] = useState<PhaseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleAddPhase = () => {
    if (!newPhaseName.trim()) return;

    startTransition(async () => {
      const result = await createPhase(projectId, newPhaseName.trim());
      if (result.success) {
        setNewPhaseName('');
        setIsAddingPhase(false);
        loadPhases();
      }
    });
  };

  const handleAddPhaseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPhase();
    }
    if (e.key === 'Escape') {
      setIsAddingPhase(false);
      setNewPhaseName('');
    }
  };

  const loadPhases = useCallback(async () => {
    try {
      let data = await getProjectPhasesWithDetails(projectId);

      // If no phases exist, initialize the pipeline
      if (data.length === 0) {
        const result = await initializeProjectPipeline(projectId);
        if (result.success) {
          data = await getProjectPhasesWithDetails(projectId);
        }
      }

      setPhases(data);
      setError(null);

      // Set first in-progress phase as active, or first phase
      const inProgressPhase = data.find((p) => p.status === 'in_progress');
      setActivePhaseId(inProgressPhase?.id || data[0]?.id || null);
    } catch (err) {
      console.error('[ProjectPipeline] Error loading phases:', err);
      setError('Failed to load pipeline');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPhases();
  }, [loadPhases]);

  const handleDataChange = () => {
    loadPhases();
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={loadPhases}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // Map phases to progress format
  const progressPhases = phases.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status as PhaseStatus,
    progress: p.progress,
  }));

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/50 bg-card/50 p-4"
      >
        <PipelineProgress
          phases={progressPhases}
          activePhaseId={activePhaseId || undefined}
          onPhaseClick={(id) => setActivePhaseId(id)}
        />
      </motion.div>

      {/* Phase Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {phases.map((phase, index) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <PhaseCard
              phase={{
                id: phase.id,
                name: phase.name,
                description: phase.description,
                status: phase.status as PhaseStatus,
                progress: phase.progress,
                task_count: phase.task_count,
                completed_task_count: phase.completed_task_count,
                resource_count: phase.resource_count,
              }}
              projectId={projectId}
              workspaceId={workspaceId}
              isActive={phase.id === activePhaseId}
              onSelect={() => setActivePhaseId(phase.id)}
              onDataChange={handleDataChange}
            />
          </motion.div>
        ))}

        {/* Add Phase Button/Form */}
        <AnimatePresence mode="wait">
          {isAddingPhase ? (
            <motion.div
              key="add-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex min-h-[100px] flex-col justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-card/50 p-4"
            >
              <Input
                placeholder="Phase name"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                onKeyDown={handleAddPhaseKeyDown}
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setIsAddingPhase(false);
                    setNewPhaseName('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-7 gap-1"
                  onClick={handleAddPhase}
                  disabled={isPending || !newPhaseName.trim()}
                >
                  <Check className="h-3 w-3" />
                  Add
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="add-button"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setIsAddingPhase(true)}
              className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 bg-card/30 text-muted-foreground transition-all hover:border-primary/30 hover:bg-card/50 hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs font-medium">Add Phase</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Re-export components
export { PipelineProgress } from './progress';
export { PhaseCard } from './phase-card';
export { PhaseResources } from './phase-resources';
export { PhaseTasks } from './phase-tasks';
