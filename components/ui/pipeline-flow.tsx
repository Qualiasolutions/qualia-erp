'use client';

import { motion, type PanInfo } from 'framer-motion';
import type React from 'react';
import { useRef, useState, useMemo } from 'react';
import { flushSync } from 'react-dom';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, Circle, Play, SkipForward } from 'lucide-react';
import {
  UNIVERSAL_PIPELINE,
  PHASE_STATUS_CONFIG,
  type PhaseStatus,
} from '@/lib/pipeline-constants';

// Interfaces
interface PipelinePhaseNode {
  id: string;
  name: string;
  description: string | null;
  status: PhaseStatus;
  progress: number;
  task_count: number;
  completed_task_count: number;
  is_locked?: boolean;
}

interface PipelineFlowProps {
  phases: PipelinePhaseNode[];
  onPhaseSelect?: (phaseId: string) => void;
  activePhaseId?: string | null;
  className?: string;
}

// Constants
const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const NODE_GAP_X = 60;
const NODE_GAP_Y = 0;
const PADDING = 40;

function getInitialPositions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    x: PADDING + i * (NODE_WIDTH + NODE_GAP_X),
    y: PADDING + NODE_GAP_Y,
  }));
}

const statusIcons: Record<PhaseStatus, React.ComponentType<{ className?: string }>> = {
  not_started: Circle,
  in_progress: Play,
  completed: CheckCircle2,
  skipped: SkipForward,
};

// Connection Line Component
function ConnectionLine({
  fromPos,
  toPos,
  fromStatus,
  toStatus,
}: {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  fromStatus: PhaseStatus;
  toStatus: PhaseStatus;
}) {
  const startX = fromPos.x + NODE_WIDTH;
  const startY = fromPos.y + NODE_HEIGHT / 2;
  const endX = toPos.x;
  const endY = toPos.y + NODE_HEIGHT / 2;

  const cp1X = startX + (endX - startX) * 0.5;
  const cp2X = endX - (endX - startX) * 0.5;

  const path = `M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}`;

  const isCompleted = fromStatus === 'completed';
  const isActive = fromStatus === 'completed' && toStatus === 'in_progress';

  return (
    <path
      d={path}
      fill="none"
      stroke="currentColor"
      strokeWidth={isActive ? 2.5 : 2}
      strokeDasharray={isCompleted ? 'none' : '8,6'}
      strokeLinecap="round"
      opacity={isCompleted ? 0.6 : 0.25}
      className={isActive ? 'text-primary' : isCompleted ? 'text-emerald-500' : 'text-foreground'}
    />
  );
}

// Main Component
export function PipelineFlow({
  phases,
  onPhaseSelect,
  activePhaseId,
  className,
}: PipelineFlowProps) {
  const initialPositions = useMemo(() => getInitialPositions(phases.length), [phases.length]);
  const [positions, setPositions] = useState(() => getInitialPositions(phases.length));
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [contentSize, setContentSize] = useState(() => {
    const maxX = Math.max(...initialPositions.map((p) => p.x + NODE_WIDTH));
    const maxY = Math.max(...initialPositions.map((p) => p.y + NODE_HEIGHT));
    return { width: maxX + PADDING, height: maxY + PADDING };
  });

  // Drag Handlers
  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
    dragStartPosition.current = { x: positions[index].x, y: positions[index].y };
  };

  const handleDrag = (index: number, { offset }: PanInfo) => {
    if (draggingIndex !== index || !dragStartPosition.current) return;

    const newX = Math.max(0, dragStartPosition.current.x + offset.x);
    const newY = Math.max(0, dragStartPosition.current.y + offset.y);

    flushSync(() => {
      setPositions((prev) => prev.map((pos, i) => (i === index ? { x: newX, y: newY } : pos)));
    });

    setContentSize((prev) => ({
      width: Math.max(prev.width, newX + NODE_WIDTH + PADDING),
      height: Math.max(prev.height, newY + NODE_HEIGHT + PADDING),
    }));
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    dragStartPosition.current = null;
  };

  // Stats
  const completedCount = phases.filter((p) => p.status === 'completed').length;
  const totalTasks = phases.reduce((sum, p) => sum + p.task_count, 0);
  const completedTasks = phases.reduce((sum, p) => sum + p.completed_task_count, 0);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
              completedCount === phases.length
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-500'
                : 'border-primary/40 bg-primary/10 text-primary'
            }`}
          >
            {completedCount === phases.length ? 'Completed' : 'In Progress'}
          </Badge>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Pipeline Flow
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {completedCount}/{phases.length} Phases
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative h-[240px] w-full overflow-auto bg-background/40 sm:h-[280px]"
        role="region"
        aria-label="Pipeline flow canvas"
        tabIndex={0}
      >
        <div
          className="relative"
          style={{
            minWidth: contentSize.width,
            minHeight: contentSize.height,
          }}
        >
          {/* SVG Connections */}
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={contentSize.width}
            height={contentSize.height}
            style={{ overflow: 'visible' }}
            aria-hidden="true"
          >
            {phases.slice(0, -1).map((phase, i) => (
              <ConnectionLine
                key={`conn-${i}`}
                fromPos={positions[i]}
                toPos={positions[i + 1]}
                fromStatus={phase.status}
                toStatus={phases[i + 1].status}
              />
            ))}
          </svg>

          {/* Phase Nodes */}
          {phases.map((phase, index) => {
            const statusConfig = PHASE_STATUS_CONFIG[phase.status];
            const pipelineConfig = UNIVERSAL_PIPELINE.find(
              (p) => p.name.toLowerCase() === phase.name.toLowerCase()
            );
            const Icon = pipelineConfig?.icon || Circle;
            const StatusIcon = statusIcons[phase.status];
            const isDragging = draggingIndex === index;
            const isActive = phase.id === activePhaseId;

            return (
              <motion.div
                key={phase.id}
                drag
                dragMomentum={false}
                dragConstraints={{ left: 0, top: 0, right: 100000, bottom: 100000 }}
                onDragStart={() => handleDragStart(index)}
                onDrag={(_, info) => handleDrag(index, info)}
                onDragEnd={handleDragEnd}
                style={{
                  x: positions[index].x,
                  y: positions[index].y,
                  width: NODE_WIDTH,
                  transformOrigin: '0 0',
                }}
                className="absolute cursor-grab"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, delay: index * 0.06 }}
                whileHover={{ scale: 1.03 }}
                whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
              >
                <Card
                  className={`group/node relative w-full overflow-hidden rounded-xl border p-3 backdrop-blur transition-all hover:shadow-lg ${statusConfig.borderColor} ${statusConfig.bgColor} ${
                    isActive ? 'shadow-md ring-2 ring-primary/50' : ''
                  } ${isDragging ? 'shadow-xl ring-2 ring-primary/50' : ''} ${
                    phase.is_locked ? 'opacity-50' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Phase: ${phase.name} — ${statusConfig.label}`}
                  onClick={() => !isDragging && onPhaseSelect?.(phase.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onPhaseSelect?.(phase.id)}
                >
                  {/* Progress bar at top */}
                  <div className="absolute left-0 right-0 top-0 h-[3px] bg-border/20">
                    <div
                      className={`h-full transition-all duration-500 ${statusConfig.stripColor}`}
                      style={{ width: `${phase.progress}%` }}
                    />
                  </div>

                  <div className="relative space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${statusConfig.borderColor} bg-background/80 backdrop-blur`}
                      >
                        <Icon
                          className={`h-4 w-4 ${pipelineConfig?.color || statusConfig.color}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                          <Badge
                            variant="outline"
                            className={`rounded-full border-border/40 bg-background/80 px-1.5 py-0 text-[9px] uppercase tracking-[0.15em] ${statusConfig.color}`}
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <h3 className="truncate text-xs font-semibold tracking-tight text-foreground">
                          {phase.name}
                        </h3>
                      </div>
                    </div>

                    {phase.description && (
                      <p className="line-clamp-1 text-[10px] leading-relaxed text-foreground/60">
                        {phase.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-foreground/50">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="h-2.5 w-2.5" />
                        <span className="uppercase tracking-[0.1em]">
                          {phase.completed_task_count}/{phase.task_count} tasks
                        </span>
                      </div>
                      <span className="font-medium tabular-nums">{phase.progress}%</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between gap-3 border-t border-border/30 px-4 py-2.5">
        <div className="flex items-center gap-4 text-xs text-foreground/60">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="uppercase tracking-[0.15em]">{completedCount} Done</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="uppercase tracking-[0.15em]">
              {completedTasks}/{totalTasks} Tasks
            </span>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40">
          Drag to reposition
        </p>
      </div>
    </div>
  );
}
