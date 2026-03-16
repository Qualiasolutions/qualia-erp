'use client';

import { useClientActionItems } from '@/lib/swr';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckSquare, Upload, MessageSquare, CreditCard, Circle } from 'lucide-react';

interface PortalActionItemsProps {
  clientId: string;
}

type Urgency = 'overdue' | 'due-soon' | 'upcoming';

function getUrgency(dueDate: string | null): Urgency {
  if (!dueDate) return 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'due-soon';
  return 'upcoming';
}

function formatDueDate(dueDate: string | null, urgency: Urgency): string {
  if (!dueDate) return 'No due date';
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (urgency === 'overdue') {
    const days = Math.abs(diffDays);
    return days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`;
  }
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 3) return `Due in ${diffDays} days`;
  return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const ACTION_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  approval: CheckSquare,
  upload: Upload,
  feedback: MessageSquare,
  payment: CreditCard,
  general: Circle,
};

const URGENCY_STYLES: Record<Urgency, { dot: string; date: string; icon: string }> = {
  overdue: {
    dot: 'bg-red-500',
    date: 'text-red-500',
    icon: 'text-red-400',
  },
  'due-soon': {
    dot: 'bg-amber-500',
    date: 'text-amber-500',
    icon: 'text-amber-400',
  },
  upcoming: {
    dot: 'bg-muted-foreground/30',
    date: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
};

export function PortalActionItems({ clientId }: PortalActionItemsProps) {
  const { items, isLoading } = useClientActionItems(clientId);

  const overdueCount = items.filter((item) => getUrgency(item.due_date) === 'overdue').length;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <span className="text-[13px] font-medium text-foreground">Action items</span>
        {!isLoading && items.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {items.length}
            </span>
            {overdueCount > 0 && (
              <span
                className="flex h-4 items-center rounded-full bg-red-500/10 px-1.5 text-[10px] font-semibold text-red-500"
                title={`${overdueCount} overdue`}
              >
                {overdueCount}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="divide-y divide-border/20">
        {isLoading ? (
          <>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-2.5 w-20" />
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-2.5 w-16" />
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-muted-foreground/70">
              Nothing pending — you&apos;re all caught up.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const urgency = getUrgency(item.due_date);
            const styles = URGENCY_STYLES[urgency];
            const Icon = ACTION_TYPE_ICONS[item.action_type] || Circle;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-muted/20"
              >
                {/* Action type icon with urgency color */}
                <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} />

                {/* Title + project */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
                  {item.project && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.project.name}
                    </p>
                  )}
                </div>

                {/* Due date with urgency */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {urgency !== 'upcoming' && (
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                  )}
                  <span className={`text-[11px] font-medium ${styles.date}`}>
                    {formatDueDate(item.due_date, urgency)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
