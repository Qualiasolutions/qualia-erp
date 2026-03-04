'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import { Lightbulb, MessageSquare } from 'lucide-react';

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

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'in_review':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'planned':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'in_progress':
      return 'bg-qualia-500/15 text-qualia-700 dark:text-qualia-400 border-qualia-500/20';
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
  if (requests.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-qualia-500/10 to-qualia-600/5 ring-1 ring-qualia-500/10">
            <Lightbulb className="h-10 w-10 text-qualia-600/60" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">No requests yet</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Use the form above to submit your first feature request or change.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${fadeInClasses}`}>
      {requests.map((request, index) => (
        <Card
          key={request.id}
          style={index < 6 ? getStaggerDelay(index) : undefined}
          className={cn(index < 6 && 'animate-fade-in-up fill-mode-both')}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground">{request.title}</h3>
                {request.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {request.description}
                  </p>
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
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {request.admin_response && (
              <div className="mt-4 rounded-lg border border-qualia-200 bg-qualia-50/50 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-qualia-700">
                  <MessageSquare className="h-3 w-3" />
                  Response from Qualia
                </div>
                <p className="text-sm text-qualia-800">{request.admin_response}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
