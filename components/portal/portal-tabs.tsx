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
    <div className="-mx-4 border-b border-border px-4 sm:mx-0 sm:px-0">
      <nav className="-mb-px flex gap-6 overflow-x-auto sm:gap-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const fullHref = `/portal/${projectId}${tab.href}`;
          const isActive = pathname === fullHref;

          return (
            <Link
              key={tab.name}
              href={fullHref}
              className={cn(
                'whitespace-nowrap border-b-2 px-1 py-4 text-[13px] font-medium transition-all duration-200',
                isActive
                  ? 'border-qualia-500 text-qualia-600 dark:text-qualia-400'
                  : 'border-transparent text-muted-foreground hover:border-border/60 hover:text-foreground'
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
