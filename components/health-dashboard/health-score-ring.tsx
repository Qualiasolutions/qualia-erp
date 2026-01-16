'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  trend?: 'improving' | 'declining' | 'stable';
  className?: string;
}

export function HealthScoreRing({ score, size = 'md', trend, className }: HealthScoreRingProps) {
  const sizes = {
    sm: { width: 60, stroke: 6, text: 'text-lg', ring: 24 },
    md: { width: 100, stroke: 8, text: 'text-2xl', ring: 40 },
    lg: { width: 140, stroke: 10, text: 'text-4xl', ring: 56 },
  };

  const { width, stroke, text } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = (s: number) => {
    if (s >= 80)
      return { stroke: 'stroke-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500' };
    if (s >= 60) return { stroke: 'stroke-amber-500', text: 'text-amber-500', bg: 'bg-amber-500' };
    if (s >= 40)
      return { stroke: 'stroke-orange-500', text: 'text-orange-500', bg: 'bg-orange-500' };
    return { stroke: 'stroke-red-500', text: 'text-red-500', bg: 'bg-red-500' };
  };

  const colors = getColor(score);

  const TrendIcon = {
    improving: TrendingUp,
    declining: TrendingDown,
    stable: Minus,
  }[trend || 'stable'];

  const trendColor = {
    improving: 'text-emerald-500',
    declining: 'text-red-500',
    stable: 'text-muted-foreground',
  }[trend || 'stable'];

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg width={width} height={width} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          className="stroke-muted"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          className={cn(colors.stroke, 'transition-all duration-500')}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', text, colors.text)}>{score}</span>
        {trend && <TrendIcon className={cn('h-4 w-4', trendColor)} />}
      </div>
    </div>
  );
}
