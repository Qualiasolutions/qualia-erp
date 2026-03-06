import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PortalPageHeaderProps {
  title: string;
  description?: string | null;
}

export function PortalPageHeader({ title, description }: PortalPageHeaderProps) {
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
      </div>
    </div>
  );
}
