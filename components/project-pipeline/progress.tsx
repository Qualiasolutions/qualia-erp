'use client';

import { cn } from '@/lib/utils';
import {
  UNIVERSAL_PIPELINE,
  getPhaseStatusConfig,
  type PhaseStatus,
} from '@/lib/pipeline-constants';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface PipelineProgressProps {
  phases: Array<{
    id: string;
    name: string;
    status: PhaseStatus;
    progress: number;
  }>;
  onPhaseClick?: (phaseId: string) => void;
  activePhaseId?: string;
}

export function PipelineProgress({ phases, onPhaseClick, activePhaseId }: PipelineProgressProps) {
  // Map phases to pipeline stages
  const stagesWithData = UNIVERSAL_PIPELINE.map((stage) => {
    const phaseData = phases.find((p) => p.name.toLowerCase() === stage.name.toLowerCase());
    return {
      ...stage,
      id: phaseData?.id || stage.name,
      status: (phaseData?.status || 'not_started') as PhaseStatus,
      progress: phaseData?.progress || 0,
    };
  });

  return (
    <div className="flex items-center justify-between gap-2 px-2">
      {stagesWithData.map((stage, index) => {
        const statusConfig = getPhaseStatusConfig(stage.status);
        const StageIcon = stage.icon;
        const isActive = activePhaseId === stage.id;
        const isCompleted = stage.status === 'completed';
        const isInProgress = stage.status === 'in_progress';

        return (
          <div key={stage.name} className="flex flex-1 items-center">
            {/* Stage Circle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPhaseClick?.(stage.id)}
              className={cn(
                'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all',
                isActive && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
                statusConfig.borderColor,
                statusConfig.bgColor,
                'cursor-pointer hover:opacity-80'
              )}
            >
              {isCompleted ? (
                <Check className={cn('h-5 w-5', statusConfig.color)} />
              ) : (
                <StageIcon className={cn('h-5 w-5', stage.color)} />
              )}

              {/* Progress ring for in-progress */}
              {isInProgress && stage.progress > 0 && (
                <svg className="absolute -inset-0.5 h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary/20"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${(stage.progress / 100) * 125.6} 125.6`}
                    className="text-primary"
                  />
                </svg>
              )}
            </motion.button>

            {/* Connector line */}
            {index < stagesWithData.length - 1 && (
              <div className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-border/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: isCompleted ? '100%' : isInProgress ? `${stage.progress}%` : '0%',
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn(
                    'absolute left-0 top-0 h-full rounded-full',
                    isCompleted ? 'bg-emerald-500' : 'bg-primary'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
