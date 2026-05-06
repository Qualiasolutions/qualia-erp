import * as React from 'react';

import { cn } from '@/lib/utils';

export type CapacitySegment = {
  /** Stable id for keying. */
  id: string;
  /** Human label shown in the legend / tooltip. */
  label: string;
  /** Numeric weight that contributes to the bar fill. */
  value: number;
  /** Optional explicit color for the segment. Falls back to project-derived OKLCH if `hue` is set. */
  color?: string;
  /** Optional hue (0-360) used to derive an OKLCH segment color. */
  hue?: number;
};

interface CapacityBarProps {
  segments: CapacitySegment[];
  /** Capacity ceiling in the same units as segment values. Default 10. */
  capacity?: number;
  /** Threshold marker rendered as a vertical line. Default = capacity (100%). */
  threshold?: number;
  /** Total bar width is sized to max(sum, capacity * overflowAt) so an over-capacity bar is visible. */
  overflowAt?: number;
  /** Compact = thinner bar. Default 12px tall, compact = 8px. */
  compact?: boolean;
  /** Show small dots + labels below the bar. */
  showLegend?: boolean;
  className?: string;
  ariaLabel?: string;
}

function segmentColor(seg: CapacitySegment, fallbackIndex: number): string {
  if (seg.color) return seg.color;
  if (typeof seg.hue === 'number') {
    return `oklch(0.66 0.13 ${seg.hue})`;
  }
  // Fall back to a deterministic palette so callers don't always need to pass a color.
  const hues = [195, 145, 35, 280, 0, 60, 220, 320];
  const h = hues[fallbackIndex % hues.length];
  return `oklch(0.66 0.13 ${h})`;
}

export function CapacityBar({
  segments,
  capacity = 10,
  threshold,
  overflowAt = 1.2,
  compact,
  showLegend,
  className,
  ariaLabel,
}: CapacityBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const ratio = capacity > 0 ? total / capacity : 0;
  const trackUnits = Math.max(capacity * overflowAt, total);
  const thresholdUnits = threshold ?? capacity;
  const thresholdPct = trackUnits > 0 ? Math.min(100, (thresholdUnits / trackUnits) * 100) : 100;

  const overCapacity = ratio > 1;
  const nearCapacity = ratio > 0.8;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        role="progressbar"
        aria-label={ariaLabel ?? 'Workload capacity'}
        aria-valuemin={0}
        aria-valuemax={Math.round(capacity)}
        aria-valuenow={Math.round(total * 10) / 10}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-muted/60',
          compact ? 'h-2' : 'h-3'
        )}
      >
        {/* Stacked segments */}
        <div className="absolute inset-0 flex">
          {segments.map((seg, idx) => {
            const widthPct = trackUnits > 0 ? (Math.max(0, seg.value) / trackUnits) * 100 : 0;
            if (widthPct <= 0) return null;
            return (
              <div
                key={seg.id}
                title={`${seg.label}: ${seg.value}`}
                className="ease-out-quart h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full"
                style={{ width: `${widthPct}%`, background: segmentColor(seg, idx) }}
              />
            );
          })}
        </div>
        {/* Threshold marker */}
        <div
          aria-hidden
          className={cn(
            'absolute bottom-[-2px] top-[-2px] w-px',
            overCapacity ? 'bg-rose-500' : nearCapacity ? 'bg-amber-500' : 'bg-foreground/30'
          )}
          style={{ left: `${thresholdPct}%` }}
        />
      </div>

      {showLegend ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {segments.map((seg, idx) => (
            <li key={seg.id} className="inline-flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                aria-hidden
                style={{ background: segmentColor(seg, idx) }}
              />
              <span className="truncate">{seg.label}</span>
              <span className="font-mono tabular-nums text-foreground/70">{seg.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
