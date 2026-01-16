'use client';

import { useState, useEffect, useTransition } from 'react';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  GitCommit,
} from 'lucide-react';
import { getProjectDeployments, type Deployment } from '@/app/actions/deployments';

interface DeploymentListProps {
  projectId: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    icon: typeof CheckCircle2;
    color: string;
    bg: string;
    label: string;
    animate?: boolean;
  }
> = {
  ready: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    label: 'Ready',
  },
  building: {
    icon: Loader2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Building',
    animate: true,
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Error',
  },
  canceled: {
    icon: Clock,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: 'Canceled',
  },
};

export function DeploymentList({ projectId, className }: DeploymentListProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadDeployments = () => {
    startTransition(async () => {
      setIsLoading(true);
      const data = await getProjectDeployments(projectId);
      setDeployments(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadDeployments();
    // Poll for updates every 30s
    const interval = setInterval(loadDeployments, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  if (isLoading && deployments.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed p-6 text-center', className)}>
        <p className="text-sm text-muted-foreground">No deployments yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Deployments will appear here when triggered from Vercel
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Recent Deployments</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={loadDeployments}
          disabled={isPending}
        >
          <RefreshCw className={cn('h-3 w-3', isPending && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {deployments.map((deployment) => {
          const config = STATUS_CONFIG[deployment.status] || STATUS_CONFIG.building;
          const StatusIcon = config.icon;

          return (
            <div
              key={deployment.id}
              className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
            >
              {/* Status Icon */}
              <div className={cn('rounded-lg p-2', config.bg)}>
                <StatusIcon
                  className={cn('h-4 w-4', config.color, config.animate && 'animate-spin')}
                />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium capitalize">{deployment.environment}</span>
                  <span className={cn('text-xs', config.color)}>{config.label}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                  {deployment.branch && (
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-2.5 w-2.5" />
                      {deployment.branch}
                    </span>
                  )}
                  {deployment.commit_sha && (
                    <span className="flex items-center gap-1">
                      <GitCommit className="h-2.5 w-2.5" />
                      {deployment.commit_sha.slice(0, 7)}
                    </span>
                  )}
                  <span>{formatDate(deployment.created_at)}</span>
                </div>
                {deployment.commit_message && (
                  <p className="mt-1 truncate text-[10px] text-muted-foreground/70">
                    {deployment.commit_message}
                  </p>
                )}
              </div>

              {/* Actions */}
              {deployment.url && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                  <a href={deployment.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
