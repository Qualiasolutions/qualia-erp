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
    <div className="border-b border-border/40 pb-5">
      <div className="flex items-start gap-4 sm:items-center">
        <Link
          href="/portal"
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-all duration-200 hover:scale-[1.04] hover:border-qualia-500/30 hover:bg-qualia-500/[0.04] hover:text-foreground hover:shadow-sm sm:mt-0"
          aria-label="Back to projects"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1.5 text-[13px] text-muted-foreground">{description}</p>}
          {showProgress && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-border/30 dark:bg-border/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-qualia-600 to-qualia-400 transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {completedPhases} of {totalPhases} phases
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
