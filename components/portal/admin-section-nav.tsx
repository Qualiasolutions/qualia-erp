'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Banknote,
  CalendarClock,
  ClipboardCheck,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  ServerCog,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';

type SectionLink = {
  href: string;
  label: string;
  group: 'Command' | 'Clients' | 'Operations' | 'Governance';
  icon: React.ComponentType<{ className?: string }>;
  /** Active when the pathname starts with this prefix. */
  match: (pathname: string, tab: string | null) => boolean;
};

const LINKS: SectionLink[] = [
  {
    href: '/admin',
    label: 'Overview',
    group: 'Command',
    icon: LayoutDashboard,
    match: (p, tab) => p === '/admin' && !tab,
  },
  {
    href: '/admin?tab=team',
    label: 'Team',
    group: 'Command',
    icon: Users,
    match: (p, tab) => p === '/admin' && tab === 'team',
  },
  {
    href: '/admin?tab=delivery',
    label: 'Delivery',
    group: 'Command',
    icon: ClipboardCheck,
    match: (p, tab) => p === '/admin' && tab === 'delivery',
  },
  {
    href: '/admin?tab=finance',
    label: 'Finance',
    group: 'Command',
    icon: Banknote,
    match: (p, tab) => p === '/admin' && tab === 'finance',
  },
  {
    href: '/admin?tab=system',
    label: 'System',
    group: 'Command',
    icon: ServerCog,
    match: (p, tab) => p === '/admin' && tab === 'system',
  },
  {
    href: '/admin/people',
    label: 'People',
    group: 'Clients',
    icon: Users,
    match: (p) => p.startsWith('/admin/people') || p.startsWith('/admin/employee'),
  },
  {
    href: '/admin/clients',
    label: 'Portal Clients',
    group: 'Clients',
    icon: Users,
    match: (p) => p.startsWith('/admin/clients'),
  },
  {
    href: '/clients',
    label: 'CRM Clients',
    group: 'Clients',
    icon: Users,
    match: (p) => p.startsWith('/clients'),
  },
  {
    href: '/requests',
    label: 'Requests',
    group: 'Operations',
    icon: MessageSquareText,
    match: (p) => p.startsWith('/requests'),
  },
  {
    href: '/projects',
    label: 'Projects',
    group: 'Operations',
    icon: FolderKanban,
    match: (p) => p.startsWith('/projects'),
  },
  {
    href: '/admin/attendance',
    label: 'Sessions',
    group: 'Operations',
    icon: CalendarClock,
    match: (p) => p.startsWith('/admin/attendance'),
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    group: 'Governance',
    icon: FileBarChart,
    match: (p) => p.startsWith('/admin/reports'),
  },
  {
    href: '/admin/audit',
    label: 'Audit',
    group: 'Governance',
    icon: ClipboardCheck,
    match: (p) => p.startsWith('/admin/audit'),
  },
];

export function AdminSectionNav() {
  const pathname = usePathname() ?? '/admin';
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  return (
    <nav
      aria-label="Admin command sections"
      className="bg-background/88 sticky top-0 z-sticky border-b border-border shadow-[0_1px_0_hsl(var(--border)/0.55)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 lg:px-6">
        {LINKS.map((link) => {
          const active = link.match(pathname, tab);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[12.5px] font-medium transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                  ? 'border-primary/25 bg-primary/10 text-primary shadow-[inset_0_1px_0_hsl(var(--primary)/0.12)]'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-card/80 hover:text-foreground'
              )}
              title={`${link.group}: ${link.label}`}
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
