import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortalPageHeaderProps {
  title: string;
  description?: string | null;
  completedPhases?: number;
  totalPhases?: number;
}

function getStatusPill(completedPhases: number, totalPhases: number) {
  if (completedPhases === totalPhases) {
    return {
      label: 'Completed',
      className: 'bg-primary/10 text-primary',
    };
  }
  if (completedPhases > 0) {
    return {
      label: 'In Progress',
      className: 'bg-primary/10 text-primary',
    };
  }
  return {
    label: 'Getting Started',
    className: 'bg-muted text-muted-foreground',
  };
}

export function PortalPageHeader({
  title,
  description,
  completedPhases,
  totalPhases,
}: PortalPageHeaderProps) {
  const showProgress =
    typeof completedPhases === 'number' && typeof totalPhases === 'number' && totalPhases > 0;
  const progressPct = showProgress ? Math.round((completedPhases! / totalPhases!) * 100) : 0;
  const status = showProgress ? getStatusPill(completedPhases!, totalPhases!) : null;

  return (
    <div className="pb-6">
      <div className="flex items-start gap-3 sm:items-center">
        <Link
          href="/portal"
          className="mt-0.5 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors duration-150 hover:bg-muted/30 hover:text-foreground sm:mt-0"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {status && (
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                  status.className
                )}
              >
                {status.label}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-[13px] text-muted-foreground/60">{description}</p>
          )}
          {showProgress && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-border/30">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-primary/60">
                {completedPhases}/{totalPhases} phases
              </span>
              <span className="text-[13px] font-semibold text-primary">{progressPct}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
