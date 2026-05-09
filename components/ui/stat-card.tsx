import * as React from 'react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'positive' | 'warning' | 'critical';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Helper line below the value (e.g. "incl. 1.2k one-off"). Omit when no extra context. */
  helperText?: React.ReactNode;
  /** Signed delta percentage (e.g. -8 → -8%, 3.2 → +3.2%). Renders an arrow + tinted pill. */
  deltaPct?: number | null;
  /** Override the delta direction. Defaults to deriving from sign of deltaPct. */
  deltaDirection?: 'up' | 'down' | 'flat';
  /** Free-text label for the comparison context (e.g. "vs Apr"). */
  deltaLabel?: string;
  /** Background tone. Default = neutral surface. */
  tone?: Tone;
  /** Tighter padding for use inside a strip. */
  compact?: boolean;
  /** Render without border/radius — for use inside a divider-driven strip
   *  where the outer container provides the chrome. */
  flat?: boolean;
  className?: string;
  /** Slot at the top-right of the card (e.g. an icon or count badge). */
  adornment?: React.ReactNode;
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'border-border bg-card',
  positive: 'border-emerald-500/30 bg-emerald-500/[0.04]',
  warning: 'border-amber-500/30 bg-amber-500/[0.04]',
  critical: 'border-rose-500/40 bg-rose-500/[0.05]',
};

function formatDelta(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  const fixed = Math.abs(pct) >= 100 ? pct.toFixed(0) : pct.toFixed(1);
  return `${sign}${fixed}%`;
}

export function StatCard({
  label,
  value,
  helperText,
  deltaPct,
  deltaDirection,
  deltaLabel,
  tone = 'neutral',
  compact,
  flat,
  className,
  adornment,
}: StatCardProps) {
  const direction =
    deltaDirection ??
    (deltaPct == null ? undefined : deltaPct > 0.05 ? 'up' : deltaPct < -0.05 ? 'down' : 'flat');

  const ArrowIcon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : ArrowRight;
  const deltaTone =
    direction === 'up'
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
      : direction === 'down'
        ? 'text-rose-700 dark:text-rose-400 bg-rose-500/10'
        : 'text-muted-foreground bg-muted';

  return (
    <div
      className={cn(
        'group flex flex-col transition-colors',
        flat ? 'p-5' : cn('rounded-xl border', compact ? 'gap-1.5 p-3' : 'gap-2 p-4'),
        flat ? null : TONE_CLASSES[tone],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        {adornment ? <span className="shrink-0 text-muted-foreground">{adornment}</span> : null}
      </div>
      <div
        className={cn(
          'font-semibold tabular-nums leading-none text-foreground',
          compact ? 'text-xl' : 'text-2xl'
        )}
      >
        {value}
      </div>
      {(deltaPct != null || helperText) && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {deltaPct != null ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono font-semibold tabular-nums',
                deltaTone
              )}
              aria-label={`change ${formatDelta(deltaPct)}`}
            >
              <ArrowIcon className="size-3" aria-hidden />
              {formatDelta(deltaPct)}
            </span>
          ) : null}
          {deltaLabel ? <span>{deltaLabel}</span> : null}
          {helperText ? <span className="truncate">{helperText}</span> : null}
        </div>
      )}
    </div>
  );
}
