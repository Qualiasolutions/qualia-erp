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
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = 'text-slate-400',
  iconBgColor = 'bg-slate-500/10',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/50 p-8 text-center',
        className
      )}
    >
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', iconBgColor)}>
        <Icon className={cn('h-6 w-6', iconColor)} />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
