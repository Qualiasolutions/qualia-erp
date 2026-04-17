'use client';

import { memo, useCallback, useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RichText } from '@/components/ui/rich-text';
import { Lightbulb, MessageSquare, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { RequestCommentThread } from './request-comment-thread';
import { getRequestCommentCounts } from '@/app/actions/request-comments';

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  project: { id: string; name: string } | null;
}

interface PortalRequestListProps {
  requests: FeatureRequest[];
  currentUserId: string;
  userRole: string;
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
];

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const statusOrder: Record<string, number> = {
  pending: 0,
  in_review: 1,
  planned: 2,
  in_progress: 3,
  completed: 4,
  declined: 5,
};

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-transparent';
    case 'in_review':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-transparent';
    case 'planned':
      return 'bg-primary/10 text-primary border-transparent';
    case 'in_progress':
      return 'bg-primary/10 text-primary border-transparent';
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-transparent';
    case 'declined':
      return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-transparent';
    default:
      return 'bg-muted text-muted-foreground border-transparent';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20';
    case 'high':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
    case 'medium':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
    case 'low':
      return 'bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

interface RequestRowProps {
  request: FeatureRequest;
  index: number;
  expanded: boolean;
  commentCount: number;
  currentUserId: string;
  userRole: string;
  onToggle: (id: string) => void;
}

const RequestRow = memo(function RequestRow({
  request,
  index,
  expanded,
  commentCount,
  currentUserId,
  userRole,
  onToggle,
}: RequestRowProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/20',
        'animate-fade-in fill-mode-both'
      )}
      style={index < 10 ? { animationDelay: `${index * 30}ms` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-foreground">{request.title}</h3>
          {request.description && (
            <RichText compact className="mt-1 line-clamp-2">
              {request.description}
            </RichText>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge className={cn('text-[10px] capitalize', getStatusColor(request.status))}>
              {request.status.replace(/_/g, ' ')}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px] capitalize', getPriorityColor(request.priority))}
            >
              {request.priority}
            </Badge>
            {request.project && (
              <span className="text-xs text-muted-foreground">{request.project.name}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(request.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Expand/collapse for comment thread */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 cursor-pointer p-0"
          onClick={() => onToggle(request.id)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse comments' : 'Expand comments'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Comment count + legacy response indicator */}
      {!expanded && (
        <button
          onClick={() => onToggle(request.id)}
          className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-primary transition-colors duration-150 hover:text-primary/80"
        >
          <MessageSquare className="h-3 w-3" />
          {commentCount > 0 ? (
            <span>
              {commentCount} comment
              {commentCount !== 1 ? 's' : ''}
            </span>
          ) : request.admin_response ? (
            <span>Has response</span>
          ) : (
            <span>Add comment</span>
          )}
        </button>
      )}

      {/* Comment thread (expanded) */}
      {expanded && (
        <RequestCommentThread
          requestId={request.id}
          currentUserId={currentUserId}
          userRole={userRole}
          legacyAdminResponse={request.admin_response}
        />
      )}
    </div>
  );
});

export function PortalRequestList({ requests, currentUserId, userRole }: PortalRequestListProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Fetch comment counts for all requests on mount
  useEffect(() => {
    const ids = requests.map((r) => r.id);
    if (ids.length === 0) return;
    getRequestCommentCounts(ids).then((counts) => {
      setCommentCounts(counts);
    });
  }, [requests]);

  const filtered = useMemo(() => {
    let result = [...requests];

    // Filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case 'priority':
        result.sort(
          (a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
        );
        break;
      case 'status':
        result.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [requests, statusFilter, sortBy]);

  // Count per status for tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests.length };
    for (const r of requests) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return counts;
  }, [requests]);

  if (requests.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-4">
        <Lightbulb className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="mt-4 text-base font-medium text-foreground">No requests yet</h3>
        <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
          Got an idea or need a change? Submit your first request and we&apos;ll get on it.
        </p>
        <Link
          href="/requests"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Lightbulb className="h-4 w-4" />
          Submit your first request
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          {statusTabs.map((tab) => {
            const count = statusCounts[tab.value] || 0;
            if (tab.value !== 'all' && count === 0) return null;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'min-h-[44px] cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150',
                  statusFilter === tab.value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                aria-pressed={statusFilter === tab.value}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] tabular-nums opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={cn(
                'cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors duration-150',
                sortBy === opt.value
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request list */}
      <div className="space-y-3">
        {filtered.map((request, index) => (
          <RequestRow
            key={request.id}
            request={request}
            index={index}
            expanded={expandedIds.has(request.id)}
            commentCount={commentCounts[request.id] || 0}
            currentUserId={currentUserId}
            userRole={userRole}
            onToggle={toggleExpanded}
          />
        ))}

        {filtered.length === 0 && (
          <div className="flex min-h-[200px] flex-col items-center justify-center px-4 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">
              No requests matching &ldquo;{statusTabs.find((t) => t.value === statusFilter)?.label}
              &rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
