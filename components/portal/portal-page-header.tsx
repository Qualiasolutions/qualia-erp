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

  return (
    <div className="flex items-start gap-4 sm:items-center">
      <Link
        href="/portal"
        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-all hover:border-border hover:bg-muted/40 hover:text-foreground sm:mt-0"
        aria-label="Back to projects"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground/70">{description}</p>}
        {showProgress && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1 w-48 overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full rounded-full bg-qualia-600 transition-all duration-700"
                style={{
                  width: `${Math.round((completedPhases! / totalPhases!) * 100)}%`,
                }}
              />
            </div>
            <span className="text-[12px] text-muted-foreground/60">
              {completedPhases} of {totalPhases} phases complete
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
