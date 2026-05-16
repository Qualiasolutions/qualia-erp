'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarClock, ClipboardCheck, FileBarChart, LayoutDashboard } from 'lucide-react';

import { cn } from '@/lib/utils';

type SectionLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Active when the pathname starts with this prefix. */
  match: (pathname: string) => boolean;
};

const LINKS: SectionLink[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    match: (p) => p === '/admin',
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    icon: FileBarChart,
    match: (p) => p.startsWith('/admin/reports'),
  },
  {
    href: '/admin/attendance',
    label: 'Sessions',
    icon: CalendarClock,
    match: (p) => p.startsWith('/admin/attendance'),
  },
  {
    href: '/admin/audit',
    label: 'Audit',
    icon: ClipboardCheck,
    match: (p) => p.startsWith('/admin/audit') || p.startsWith('/admin/employee'),
  },
];

export function AdminSectionNav() {
  const pathname = usePathname() ?? '/admin';

  return (
    <nav
      aria-label="Admin sections"
      className="sticky top-0 z-sticky border-b border-border bg-background/85 backdrop-blur-md"
    >
      <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 lg:px-6">
        {LINKS.map((link) => {
          const active = link.match(pathname);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[12.5px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
