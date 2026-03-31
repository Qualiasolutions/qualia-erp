'use client';

import { useState, useEffect, useTransition } from 'react';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Globe,
  Server,
} from 'lucide-react';
import {
  getProjectEnvironments,
  checkEnvironmentHealth,
  type Environment,
} from '@/app/actions/deployments';

interface EnvironmentCardsProps {
  projectId: string;
  className?: string;
}

const HEALTH_CONFIG = {
  healthy: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Healthy',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Degraded',
  },
  down: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Down',
  },
  unknown: {
    icon: HelpCircle,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
    label: 'Unknown',
  },
};

const ENV_ICONS = {
  production: Globe,
  staging: Server,
};

export function EnvironmentCards({ projectId, className }: EnvironmentCardsProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadEnvironments = () => {
    startTransition(async () => {
      const data = await getProjectEnvironments(projectId);
      setEnvironments(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadEnvironments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleHealthCheck = async (envId: string) => {
    setCheckingId(envId);
    await checkEnvironmentHealth(envId);
    loadEnvironments();
    setCheckingId(null);
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (environments.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed p-6 text-center', className)}>
        <p className="text-sm text-muted-foreground">No environments configured</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Environments are created automatically from Vercel deployments
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium">Environments</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {environments.map((env) => {
          const healthConfig = HEALTH_CONFIG[env.health_status] || HEALTH_CONFIG.unknown;
          const HealthIcon = healthConfig.icon;
          const EnvIcon = ENV_ICONS[env.name as keyof typeof ENV_ICONS] || Globe;
          const isChecking = checkingId === env.id;

          return (
            <div
              key={env.id}
              className={cn(
                'rounded-xl border p-4 transition-all',
                healthConfig.border,
                healthConfig.bg
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EnvIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold capitalize">{env.name}</span>
                </div>
                <div className={cn('flex items-center gap-1', healthConfig.color)}>
                  <HealthIcon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{healthConfig.label}</span>
                </div>
              </div>

              {/* URL */}
              {env.url && (
                <a
                  href={env.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <span className="truncate">{env.url.replace('https://', '')}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}

              {/* Last checked */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {env.last_checked_at
                    ? `Checked ${formatDate(env.last_checked_at)}`
                    : 'Never checked'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[11px]"
                  onClick={() => handleHealthCheck(env.id)}
                  disabled={isChecking || isPending}
                >
                  <RefreshCw className={cn('h-3 w-3', isChecking && 'animate-spin')} />
                  Check
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
