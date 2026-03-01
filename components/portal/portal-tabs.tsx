'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PortalTabsProps {
  projectId: string;
}

const tabs = [
  { name: 'Roadmap', href: '' },
  { name: 'Files', href: '/files' },
  { name: 'Updates', href: '/updates' },
];

export function PortalTabs({ projectId }: PortalTabsProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-neutral-200">
      <nav className="-mb-px flex gap-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const fullHref = `/portal/${projectId}${tab.href}`;
          const isActive = pathname === fullHref;

          return (
            <Link
              key={tab.name}
              href={fullHref}
              className={cn(
                'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                isActive
                  ? 'border-qualia-500 text-qualia-600'
                  : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
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
