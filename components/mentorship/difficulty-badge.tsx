'use client';

import { Sparkles, ThumbsUp, Puzzle, Flame, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_DIFFICULTY_COLORS } from '@/lib/color-constants';
import type { TaskDifficulty } from '@/types/database';

const DIFFICULTY_ICONS = {
  starter: Sparkles,
  easy: ThumbsUp,
  medium: Puzzle,
  hard: Flame,
  expert: Crown,
} as const;

interface DifficultyBadgeProps {
  difficulty: TaskDifficulty;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDescription?: boolean;
  className?: string;
}

export function DifficultyBadge({
  difficulty,
  size = 'md',
  showLabel = true,
  showDescription = false,
  className,
}: DifficultyBadgeProps) {
  const config = TASK_DIFFICULTY_COLORS[difficulty as keyof typeof TASK_DIFFICULTY_COLORS];
  const Icon = DIFFICULTY_ICONS[difficulty as keyof typeof DIFFICULTY_ICONS];

  const sizeClasses = {
    sm: 'text-[11px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.bg,
        config.text,
        `border ${config.border}`,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
      {showDescription && (
        <span className="ml-1 text-muted-foreground">- {config.description}</span>
      )}
    </div>
  );
}

interface DifficultySelectProps {
  value: TaskDifficulty;
  onChange: (value: TaskDifficulty) => void;
  className?: string;
}

export function DifficultySelect({ value, onChange, className }: DifficultySelectProps) {
  const difficulties: TaskDifficulty[] = ['starter', 'easy', 'medium', 'hard', 'expert'];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {difficulties.map((difficulty) => {
        const config = TASK_DIFFICULTY_COLORS[difficulty as keyof typeof TASK_DIFFICULTY_COLORS];
        const Icon = DIFFICULTY_ICONS[difficulty as keyof typeof DIFFICULTY_ICONS];
        const isSelected = value === difficulty;

        return (
          <button
            key={difficulty}
            type="button"
            onClick={() => onChange(difficulty)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all',
              'border',
              isSelected
                ? `${config.bg} ${config.text} ${config.border} ring-2 ring-offset-2 ring-offset-background`
                : 'border-border bg-background hover:bg-muted'
            )}
            style={
              {
                ...(isSelected && {
                  '--tw-ring-color': config.border.replace('border-', '').replace('/30', ''),
                }),
              } as React.CSSProperties
            }
          >
            <Icon className="h-4 w-4" />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
