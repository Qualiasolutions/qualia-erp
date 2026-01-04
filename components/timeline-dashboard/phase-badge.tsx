'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { PHASE_BADGE_COLORS, type PhaseBadgeKey } from '@/lib/color-constants';

interface PhaseBadgeProps {
  phase: string | null | undefined;
  className?: string;
}

/**
 * Colored badge showing the project phase
 * Colors are defined in color-constants.ts
 */
export const PhaseBadge = memo(function PhaseBadge({ phase, className }: PhaseBadgeProps) {
  if (!phase) return null;

  // Get colors for this phase, or use default
  const colors = PHASE_BADGE_COLORS[phase as PhaseBadgeKey] || {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        colors.bg,
        colors.text,
        className
      )}
    >
      {phase}
    </span>
  );
});
