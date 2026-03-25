import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PortalPageHeaderProps {
  title: string;
  description?: string | null;
  completedPhases?: number;
  totalPhases?: number;
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

  return (
    <div className="pb-6">
      <div className="flex items-start gap-3 sm:items-center">
        <Link
          href="/portal"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors duration-150 hover:bg-muted/30 hover:text-foreground sm:mt-0"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-[13px] text-muted-foreground/60">{description}</p>
          )}
          {showProgress && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1 w-40 overflow-hidden rounded-full bg-border/30">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground/50">
                {completedPhases}/{totalPhases} phases
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
