import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PortalPageHeaderProps {
  title: string;
  description?: string | null;
}

export function PortalPageHeader({ title, description }: PortalPageHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Link
        href="/portal"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        aria-label="Back to projects"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
