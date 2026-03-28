'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RichText } from '@/components/ui/rich-text';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import { Lightbulb, MessageSquare, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  high: 0,
  medium: 1,
  low: 2,
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
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'in_review':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'planned':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'in_progress':
      return 'bg-primary/15 text-qualia-700 dark:text-primary border-primary/20';
    case 'completed':
      return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20';
    case 'declined':
      return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'low':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function PortalRequestList({ requests }: PortalRequestListProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-qualia-100 to-qualia-50 ring-1 ring-qualia-200 dark:from-qualia-500/20 dark:to-qualia-500/10 dark:ring-primary/20">
          <Lightbulb className="h-10 w-10 text-primary dark:text-primary" />
        </div>
        <h3 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
          No requests yet
        </h3>
        <p className="max-w-sm text-center text-sm leading-relaxed text-muted-foreground/80">
          Click &ldquo;New Request&rdquo; to submit your first feature request or change.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {statusTabs.map((tab) => {
            const count = statusCounts[tab.value] || 0;
            if (tab.value !== 'all' && count === 0) return null;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'min-h-[40px] rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200',
                  statusFilter === tab.value
                    ? 'bg-primary/10 text-qualia-700 shadow-[inset_0_1px_0_0_rgba(0,164,172,0.06)] dark:text-primary'
                    : 'text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 text-[10px] tabular-nums opacity-50">{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={cn(
                'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
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
      <div className={`space-y-3 ${fadeInClasses}`}>
        {filtered.map((request, index) => (
          <Card
            key={request.id}
            style={index < 6 ? getStaggerDelay(index) : undefined}
            className={cn(
              'rounded-xl border-border transition-all duration-200 hover:border-border hover:shadow-elevation-1',
              index < 6 && 'animate-fade-in-up fill-mode-both'
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">{request.title}</h3>
                  {request.description && (
                    <RichText compact className="mt-1">
                      {request.description}
                    </RichText>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge className={cn('text-xs', getStatusColor(request.status))}>
                      {request.status.replace(/_/g, ' ')}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getPriorityColor(request.priority))}
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

                {/* Expand/collapse for admin response */}
                {request.admin_response && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0"
                    onClick={() => toggleExpanded(request.id)}
                  >
                    {expandedIds.has(request.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {request.admin_response && expandedIds.has(request.id) && (
                <div className="mt-4 rounded-lg border border-qualia-200 bg-qualia-50/50 p-3 dark:border-qualia-800/30 dark:bg-qualia-950/20">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-qualia-700 dark:text-primary">
                    <MessageSquare className="h-3 w-3" />
                    Response from Qualia
                  </div>
                  <p className="text-sm text-qualia-800 dark:text-qualia-300">
                    {request.admin_response}
                  </p>
                </div>
              )}

              {/* Indicator that there's a response */}
              {request.admin_response && !expandedIds.has(request.id) && (
                <button
                  onClick={() => toggleExpanded(request.id)}
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-qualia-700"
                >
                  <MessageSquare className="h-3 w-3" />
                  View response
                </button>
              )}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No requests matching &ldquo;{statusTabs.find((t) => t.value === statusFilter)?.label}
              &rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
