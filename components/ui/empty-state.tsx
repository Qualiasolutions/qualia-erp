'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  iconColor = 'text-slate-400',
  iconBgColor = 'bg-slate-500/10',
  className,
  compact = false,
  minimal = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        !minimal && 'rounded-lg border border-dashed border-border/60 bg-card/50',
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
    </motion.div>
  );
}
