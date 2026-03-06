'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IntegrationStatusBadgeProps = {
  hasPortalAccess: boolean;
  hasERPClient: boolean;
  variant?: 'default' | 'detailed';
  className?: string;
};

export function IntegrationStatusBadge({
  hasPortalAccess,
  hasERPClient,
  variant = 'default',
  className,
}: IntegrationStatusBadgeProps) {
  const isFullyIntegrated = hasPortalAccess && hasERPClient;
  const isPartial = hasPortalAccess || hasERPClient;

  if (variant === 'detailed') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge
          variant={hasPortalAccess ? 'default' : 'outline'}
          className={cn(
            'gap-1 text-[10px]',
            hasPortalAccess
              ? 'bg-qualia-600/10 text-qualia-700 hover:bg-qualia-600/20'
              : 'text-muted-foreground'
          )}
        >
          {hasPortalAccess ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          Portal
        </Badge>
        <Badge
          variant={hasERPClient ? 'default' : 'outline'}
          className={cn(
            'gap-1 text-[10px]',
            hasERPClient
              ? 'bg-blue-600/10 text-blue-700 hover:bg-blue-600/20'
              : 'text-muted-foreground'
          )}
        >
          {hasERPClient ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          ERP Client
        </Badge>
      </div>
    );
  }

  // Default variant - single badge
  if (isFullyIntegrated) {
    return (
      <Badge
        className={cn('gap-1 bg-green-600/10 text-green-700 hover:bg-green-600/20', className)}
      >
        <CheckCircle2 className="h-3 w-3" />
        Integrated
      </Badge>
    );
  }

  if (isPartial) {
    return (
      <Badge
        variant="outline"
        className={cn('gap-1 border-amber-500/50 text-amber-700', className)}
      >
        <AlertCircle className="h-3 w-3" />
        Partial
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('gap-1 text-muted-foreground', className)}>
      <XCircle className="h-3 w-3" />
      Not Integrated
    </Badge>
  );
}
