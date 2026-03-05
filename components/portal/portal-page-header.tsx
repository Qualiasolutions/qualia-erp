import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PortalPageHeaderProps {
  title: string;
  description?: string | null;
}

export function PortalPageHeader({ title, description }: PortalPageHeaderProps) {
  return (
    <div className="flex items-start gap-3 sm:items-center sm:gap-4">
      <Link
        href="/portal"
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:mt-0"
        aria-label="Back to projects"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
