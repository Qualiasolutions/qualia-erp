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
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useSidebar } from '@/components/sidebar-provider';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
];

function SidebarContent({
  isCollapsed,
  onLinkClick,
}: {
  isCollapsed: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo - Minimal */}
      <div
        className={cn(
          'flex items-center border-b border-border',
          isCollapsed ? 'h-14 justify-center' : 'h-14 px-4'
        )}
      >
        <Link href="/" className="flex items-center gap-2.5" onClick={onLinkClick}>
          <Image src="/logo.webp" alt="Qualia" width={26} height={26} className="rounded-md" />
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

      {/* Command hint - Minimal */}
      {!isCollapsed && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            <span>Search</span>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className={cn('flex-1 py-2', isCollapsed ? 'px-2' : 'px-2')}>
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                onClick={onLinkClick}
                className={cn(
                  'group relative flex items-center gap-2 rounded-md text-[13px] font-medium transition-colors duration-150',
                  isCollapsed ? 'mx-auto h-8 w-8 justify-center' : 'h-8 px-2',
                  isActive
                    ? 'border-l-2 border-primary bg-transparent pl-[6px] text-foreground'
                    : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'flex-shrink-0 transition-colors duration-150',
                    isCollapsed ? 'h-4 w-4' : 'h-4 w-4',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function Sidebar() {
  const { isCollapsed, toggleSidebar, isMobileOpen, toggleMobile } = useSidebar();

  const handleLinkClick = () => {
    // Close mobile sidebar when a link is clicked
    if (isMobileOpen) {
      toggleMobile();
    }
  };

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside
        className={cn(
          'relative z-30 hidden h-screen flex-col border-r border-border bg-card transition-all duration-200 ease-out md:flex',
          isCollapsed ? 'w-[60px]' : 'w-56'
        )}
      >
        <SidebarContent isCollapsed={isCollapsed} />
        {/* Collapse Toggle - Minimal */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute right-0 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar - Sheet/Drawer */}
      <Sheet open={isMobileOpen} onOpenChange={toggleMobile}>
        <SheetContent side="left" className="w-64 p-0 sm:w-72">
          <div className="flex h-full flex-col">
            <SidebarContent isCollapsed={false} onLinkClick={handleLinkClick} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
