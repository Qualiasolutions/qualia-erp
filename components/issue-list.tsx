'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Circle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  LayoutList,
  Columns3,
  Inbox,
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

export interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

interface IssueListProps {
  issues: Issue[];
}

type ViewMode = 'list' | 'grouped';

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Circle; color: string; bgColor: string; order: number }
> = {
  'Yet to Start': {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    order: 0,
  },
  Todo: {
    icon: Circle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    order: 1,
  },
  'In Progress': {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    order: 2,
  },
  Done: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    order: 3,
  },
  Canceled: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    order: 4,
  },
};

const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  Urgent: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Urgent',
  },
  High: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    label: 'High',
  },
  Medium: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Medium',
  },
  Low: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Low',
  },
  'No Priority': {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'None',
  },
};

function IssueCard({ issue }: { issue: Issue }) {
  const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG['Yet to Start'];
  const priorityConfig = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG['No Priority'];
  const StatusIcon = statusConfig.icon;

  return (
    <Link
      href={`/issues/${issue.id}`}
      className="surface group block rounded-lg p-3.5 transition-all duration-200 hover:bg-secondary/50"
    >
      <div className="flex items-start gap-3">
        <StatusIcon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', statusConfig.color)} />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {issue.title}
          </h4>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                priorityConfig.bgColor,
                priorityConfig.color
              )}
            >
              {priorityConfig.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatTimeAgo(issue.created_at)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG['Yet to Start'];
  const priorityConfig = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG['No Priority'];
  const StatusIcon = statusConfig.icon;

  return (
    <Link
      href={`/issues/${issue.id}`}
      className="group flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-secondary/50"
    >
      <StatusIcon className={cn('h-4 w-4 flex-shrink-0', statusConfig.color)} />

      <span className="w-16 flex-shrink-0 font-mono text-xs text-muted-foreground">
        {issue.id.slice(0, 8)}
      </span>

      <span className="flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
        {issue.title}
      </span>

      <span
        className={cn(
          'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
          priorityConfig.bgColor,
          priorityConfig.color
        )}
      >
        {priorityConfig.label}
      </span>

      <span className="w-14 flex-shrink-0 text-right text-xs text-muted-foreground">
        {formatTimeAgo(issue.created_at)}
      </span>
    </Link>
  );
}

function StatusGroup({
  status,
  issues,
  isExpanded,
  onToggle,
}: {
  status: string;
  issues: Issue[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['Yet to Start'];
  const StatusIcon = config.icon;

  return (
    <div className="mb-5">
      <button
        onClick={onToggle}
        className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <StatusIcon className={cn('h-4 w-4', config.color)} />
        <span className="text-sm font-medium text-foreground">{status}</span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-xs font-medium',
            config.bgColor,
            config.color
          )}
        >
          {issues.length}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-6 mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue, index) => (
            <div key={issue.id} className="slide-in" style={{ animationDelay: `${index * 20}ms` }}>
              <IssueCard issue={issue} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function IssueList({ issues }: IssueListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(STATUS_CONFIG).forEach((status) => {
      initial[status] = status !== 'Done' && status !== 'Canceled';
    });
    return initial;
  });

  if (issues.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-xl bg-muted p-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">No issues found</p>
        <p className="mt-1 text-sm text-muted-foreground">Create your first issue to get started</p>
      </div>
    );
  }

  // Group issues by status
  const groupedIssues = issues.reduce(
    (acc, issue) => {
      const status = issue.status || 'Yet to Start';
      if (!acc[status]) acc[status] = [];
      acc[status].push(issue);
      return acc;
    },
    {} as Record<string, Issue[]>
  );

  // Sort groups by status order
  const sortedStatuses = Object.keys(groupedIssues).sort((a, b) => {
    const orderA = STATUS_CONFIG[a]?.order ?? 99;
    const orderB = STATUS_CONFIG[b]?.order ?? 99;
    return orderA - orderB;
  });

  const toggleGroup = (status: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  // Stats
  const totalIssues = issues.length;
  const doneIssues = groupedIssues['Done']?.length || 0;
  const inProgressIssues = groupedIssues['In Progress']?.length || 0;
  const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Stats Bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {totalIssues}
            </span>
            <span className="text-sm text-muted-foreground">issues</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">{inProgressIssues} in progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">{doneIssues} done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-primary">{completionRate}%</span>
              <span className="text-muted-foreground">complete</span>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
          <button
            onClick={() => setViewMode('grouped')}
            className={cn(
              'rounded-md p-1.5 transition-all duration-200',
              viewMode === 'grouped'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Grouped view"
          >
            <Columns3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded-md p-1.5 transition-all duration-200',
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="List view"
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {viewMode === 'grouped' ? (
          <div>
            {sortedStatuses.map((status) => (
              <StatusGroup
                key={status}
                status={status}
                issues={groupedIssues[status]}
                isExpanded={expandedGroups[status] ?? true}
                onToggle={() => toggleGroup(status)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {issues.map((issue, index) => (
              <div
                key={issue.id}
                className="slide-in"
                style={{ animationDelay: `${index * 15}ms` }}
              >
                <IssueRow issue={issue} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
