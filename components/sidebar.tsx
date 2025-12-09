'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Folder,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useSidebar } from '@/components/sidebar-provider';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-border bg-card transition-all duration-200 ease-out',
        isCollapsed ? 'w-[60px]' : 'w-56'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center border-b border-border',
          isCollapsed ? 'h-14 justify-center' : 'h-14 px-4'
        )}
      >
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={28}
              height={28}
              className="rounded-lg transition-transform duration-150 group-hover:scale-105"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-foreground">Qualia</span>
              <span className="text-[10px] font-medium text-muted-foreground">Solutions</span>
            </div>
          )}
        </Link>
      </div>

      {/* Workspace Selector */}
      {!isCollapsed && (
        <div className="border-b border-border px-3 py-2.5">
          <WorkspaceSelector />
        </div>
      )}

      {/* Command hint */}
      {!isCollapsed && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>K to search</span>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className={cn('flex-1 py-2', isCollapsed ? 'px-2' : 'px-2')}>
        <div className="space-y-0.5">
          {navigation.map((item, index) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                  isCollapsed ? 'mx-auto h-9 w-9 justify-center' : 'h-9 px-2.5',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
                style={{ animationDelay: `${index * 25}ms` }}
              >
                <item.icon
                  className={cn(
                    'flex-shrink-0 transition-colors duration-150',
                    isCollapsed ? 'h-[17px] w-[17px]' : 'h-4 w-4',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle - Right Edge Middle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute right-0 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-secondary hover:text-foreground"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
