'use client';

import { useClientActionItems } from '@/lib/swr';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckSquare, Upload, MessageSquare, CreditCard, Circle, CheckCircle2 } from 'lucide-react';

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
    dot: 'bg-muted-foreground/25',
    date: 'text-muted-foreground/60',
    icon: 'text-muted-foreground/40',
  },
};

export function PortalActionItems({ clientId }: PortalActionItemsProps) {
  const { items, isLoading } = useClientActionItems(clientId);

  const overdueCount = items.filter((item) => getUrgency(item.due_date) === 'overdue').length;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Action Items
        </h2>
        {!isLoading && items.length > 0 && (
          <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground/60">
            {items.length}
          </span>
        )}
        {!isLoading && overdueCount > 0 && (
          <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="ml-auto h-3 w-20" />
          </div>
          <div className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3 text-primary">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">All caught up</span>
        </div>
      ) : (
        <div className="space-y-0.5">
          {items.map((item) => {
            const urgency = getUrgency(item.due_date);
            const styles = URGENCY_STYLES[urgency];
            const Icon = ACTION_TYPE_ICONS[item.action_type] || Circle;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-150 hover:bg-muted/30"
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${styles.icon}`} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
                  {item.project && (
                    <p className="truncate text-[11px] text-muted-foreground/50">
                      {item.project.name}
                    </p>
                  )}
                </div>

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
          })}
        </div>
      )}
    </div>
  );
}
