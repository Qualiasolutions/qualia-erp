'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PortalTabsProps {
  projectId: string;
}

const tabs = [
  { name: 'Roadmap', href: '' },
  { name: 'Features', href: '/features' },
  { name: 'Files', href: '/files' },
  { name: 'Updates', href: '/updates' },
];

export function PortalTabs({ projectId }: PortalTabsProps) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1">
      {tabs.map((tab) => {
        const fullHref = `/projects/${projectId}${tab.href}`;
        const isActive = pathname === fullHref;

        return (
          <Link
            key={tab.name}
            href={fullHref}
            className={cn(
              'flex min-h-[44px] items-center rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all duration-150',
              isActive
                ? 'bg-primary/[0.08] text-primary dark:bg-primary/[0.12] dark:text-primary'
                : 'text-muted-foreground/60 hover:bg-muted/30 hover:text-foreground'
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
