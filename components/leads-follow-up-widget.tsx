'use client';

import { useState } from 'react';
import { formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import {
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  Flame,
  AlertCircle,
  User,
  Building2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface LeadFollowUp {
  id: string;
  client_id: string;
  client_name: string;
  contact_name: string;
  title: string;
  notes: string | null;
  follow_up_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lead_status: string;
}

interface LeadsFollowUpWidgetProps {
  followUps: LeadFollowUp[];
  onComplete?: (id: string) => void;
  onReschedule?: (id: string) => void;
}

const priorityConfig = {
  urgent: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: AlertCircle,
    label: 'Urgent',
  },
  high: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: Flame,
    label: 'High',
  },
  medium: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: Clock,
    label: 'Medium',
  },
  low: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: Clock,
    label: 'Low',
  },
};

function getDateLabel(dateStr: string): { label: string; isUrgent: boolean } {
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) {
    return { label: 'Overdue', isUrgent: true };
  }
  if (isToday(date)) {
    return { label: 'Today', isUrgent: true };
  }
  if (isTomorrow(date)) {
    return { label: 'Tomorrow', isUrgent: false };
  }
  return { label: formatDistanceToNow(date, { addSuffix: true }), isUrgent: false };
}

function LeadCard({
  followUp,
  onComplete,
  onReschedule,
}: {
  followUp: LeadFollowUp;
  onComplete?: (id: string) => void;
  onReschedule?: (id: string) => void;
}) {
  const config = priorityConfig[followUp.priority];
  const PriorityIcon = config.icon;
  const { label: dateLabel, isUrgent } = getDateLabel(followUp.follow_up_date);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card/50 p-4 backdrop-blur-sm transition-all duration-300',
        'hover:bg-card hover:shadow-lg hover:shadow-black/5',
        isUrgent ? 'border-orange-500/40' : 'border-border/50'
      )}
    >
      {/* Priority indicator bar */}
      <div
        className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', config.bgColor)}
        style={{ backgroundColor: `var(--${config.color.replace('text-', '')})` }}
      />

      <div className="flex items-start gap-3 pl-2">
        {/* Avatar/Icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            config.bgColor
          )}
        >
          <User className={cn('h-5 w-5', config.color)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Contact & Company */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{followUp.contact_name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{followUp.client_name}</span>
            </span>
          </div>

          {/* Task title */}
          <p className="mt-0.5 text-sm text-muted-foreground">{followUp.title}</p>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Date badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                isUrgent ? 'bg-orange-500/10 text-orange-500' : 'bg-muted/50 text-muted-foreground'
              )}
            >
              <Calendar className="h-3 w-3" />
              {dateLabel}
            </span>

            {/* Priority badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                config.bgColor,
                config.color
              )}
            >
              <PriorityIcon className="h-3 w-3" />
              {config.label}
            </span>

            {/* Lead status */}
            {followUp.lead_status === 'hot' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                <Flame className="h-3 w-3" />
                Hot Lead
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onComplete?.(followUp.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
            title="Mark as completed"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onReschedule?.(followUp.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-500"
            title="Call now"
          >
            <Phone className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onComplete?.(followUp.id)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReschedule?.(followUp.id)}>
                <Calendar className="mr-2 h-4 w-4" />
                Reschedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function LeadsFollowUpWidget({
  followUps,
  onComplete,
  onReschedule,
}: LeadsFollowUpWidgetProps) {
  const [showAll, setShowAll] = useState(false);

  // Sort by date and priority
  const sortedFollowUps = [...followUps].sort((a, b) => {
    // Overdue first
    const aDate = new Date(a.follow_up_date);
    const bDate = new Date(b.follow_up_date);
    const aOverdue = isPast(aDate) && !isToday(aDate);
    const bOverdue = isPast(bDate) && !isToday(bDate);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by date
    return aDate.getTime() - bDate.getTime();
  });

  const displayFollowUps = showAll ? sortedFollowUps : sortedFollowUps.slice(0, 4);
  const hasMore = sortedFollowUps.length > 4;

  if (followUps.length === 0) {
    return null;
  }

  // Count stats
  const overdueCount = sortedFollowUps.filter((f) => {
    const date = new Date(f.follow_up_date);
    return isPast(date) && !isToday(date);
  }).length;
  const todayCount = sortedFollowUps.filter((f) => isToday(new Date(f.follow_up_date))).length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10">
            <Phone className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Lead Follow-ups</h3>
            <p className="text-xs text-muted-foreground">
              {sortedFollowUps.length} pending
              {overdueCount > 0 && (
                <span className="ml-1 text-orange-500">· {overdueCount} overdue</span>
              )}
              {todayCount > 0 && (
                <span className="ml-1 text-emerald-500">· {todayCount} today</span>
              )}
            </p>
          </div>
        </div>

        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {showAll ? 'Show less' : `View all (${sortedFollowUps.length})`}
            <ChevronRight className={cn('h-3 w-3 transition-transform', showAll && 'rotate-90')} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {displayFollowUps.map((followUp) => (
          <LeadCard
            key={followUp.id}
            followUp={followUp}
            onComplete={onComplete}
            onReschedule={onReschedule}
          />
        ))}
      </div>
    </div>
  );
}
