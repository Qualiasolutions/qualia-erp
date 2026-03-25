import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WidgetHeaderProps {
  icon: LucideIcon;
  title: string;
  iconColor?: string;
  iconBgColor?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function WidgetHeader({
  icon: Icon,
  title,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  badge,
  action,
  className,
}: WidgetHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2.5">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBgColor)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <span className="font-semibold">{title}</span>
        {badge}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
