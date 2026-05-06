import * as React from 'react';

import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'positive' | 'warning' | 'critical' | 'brand';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Below this many data points we show "n/a — needs N more" instead of rendering a line. */
  minPoints?: number;
  /** Stroke + fill tone. */
  tone?: Tone;
  /** Show a dot at the latest data point. Default true. */
  showLastDot?: boolean;
  /** Translucent area fill under the curve. Default true. */
  fillArea?: boolean;
  /** ARIA label for screen readers. */
  ariaLabel?: string;
  className?: string;
}

const STROKE: Record<Tone, string> = {
  neutral: 'stroke-muted-foreground',
  positive: 'stroke-emerald-500',
  warning: 'stroke-amber-500',
  critical: 'stroke-rose-500',
  brand: 'stroke-primary',
};

const FILL: Record<Tone, string> = {
  neutral: 'fill-muted-foreground/15',
  positive: 'fill-emerald-500/15',
  warning: 'fill-amber-500/15',
  critical: 'fill-rose-500/15',
  brand: 'fill-primary/15',
};

const DOT: Record<Tone, string> = {
  neutral: 'fill-muted-foreground',
  positive: 'fill-emerald-500',
  warning: 'fill-amber-500',
  critical: 'fill-rose-500',
  brand: 'fill-primary',
};

export function Sparkline({
  data,
  width = 100,
  height = 28,
  minPoints = 5,
  tone = 'brand',
  showLastDot = true,
  fillArea = true,
  ariaLabel,
  className,
}: SparklineProps) {
  if (!data || data.length < minPoints) {
    const need = Math.max(0, minPoints - (data?.length ?? 0));
    return (
      <span
        className={cn(
          'inline-flex items-center font-mono text-[10px] italic text-muted-foreground/70',
          className
        )}
        style={{ width, height }}
      >
        n/a — {need} more
      </span>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 1;
  const padY = 2;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const area =
    points.length > 0
      ? `${path} L${points[points.length - 1][0].toFixed(2)},${(height - padY).toFixed(2)} L${points[0][0].toFixed(2)},${(height - padY).toFixed(2)} Z`
      : '';

  const lastPoint = points[points.length - 1];

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? `Trend over ${data.length} points`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={cn('overflow-visible', className)}
    >
      {fillArea ? <path d={area} className={cn(FILL[tone], 'stroke-none')} /> : null}
      <path
        d={path}
        className={cn(STROKE[tone], 'fill-none')}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLastDot && lastPoint ? (
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r={1.8} className={DOT[tone]} />
      ) : null}
    </svg>
  );
}
