'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
  /** Use compact variant for smaller spaces like widgets */
  compact?: boolean;
  /** Use minimal variant without border/background for inline use */
  minimal?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = 'text-muted-foreground',
  iconBgColor = 'bg-muted/50',
  className,
  compact = false,
  minimal = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center justify-center gap-3 text-center',
        !minimal && 'rounded-xl border border-dashed border-border bg-card/50',
        compact ? 'p-8' : 'p-10',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-xl',
          compact ? 'h-11 w-11' : 'h-14 w-14',
          iconBgColor
        )}
      >
        <Icon className={cn(compact ? 'h-5 w-5' : 'h-6 w-6', iconColor)} />
      </div>
      <div className="space-y-1">
        <h3 className={cn('font-medium text-foreground', compact && 'text-sm')}>{title}</h3>
        {description && (
          <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
