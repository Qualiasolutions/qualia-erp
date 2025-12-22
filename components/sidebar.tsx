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
  Inbox,
  Zap,
  Target,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useSidebar } from '@/components/sidebar-provider';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Command Center', href: '/command-center', icon: Zap, highlight: true },
  { name: 'Today', href: '/today', icon: Target },
  { name: 'Focus Mode', href: '/focus', icon: Crosshair },
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
      {/* Logo */}
      <div
        className={cn(
          'flex items-center border-b border-border/60 bg-gradient-to-b from-card to-card/95',
          isCollapsed ? 'h-14 justify-center' : 'h-14 px-4'
        )}
      >
        <Link href="/" className="group flex items-center gap-2.5" onClick={onLinkClick}>
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 rounded-lg bg-qualia-500/20 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={28}
              height={28}
              className="relative rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-sm font-bold tracking-tight text-foreground">
                Qualia
              </span>
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
          <div className="flex items-center gap-2 rounded-lg border border-qualia-500/10 bg-qualia-500/5 px-2.5 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-qualia-500/20 hover:bg-qualia-500/10">
            <Command className="h-3 w-3 text-qualia-500" />
            <span className="font-medium">K to search</span>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className={cn('flex-1 py-2', isCollapsed ? 'px-2' : 'px-2')}>
        <div className="space-y-0.5">
          {navigation.map((item, index) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const isHighlight = 'highlight' in item && item.highlight;

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                onClick={onLinkClick}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                  isCollapsed ? 'mx-auto h-9 w-9 justify-center' : 'h-9 px-2.5',
                  isActive
                    ? 'bg-qualia-500/10 text-qualia-600 shadow-sm dark:text-qualia-400'
                    : isHighlight
                      ? 'text-qualia-500 hover:bg-qualia-500/10 hover:text-qualia-600 dark:hover:text-qualia-400'
                      : 'text-muted-foreground hover:bg-qualia-500/5 hover:text-foreground'
                )}
                style={{ animationDelay: `${index * 25}ms` }}
              >
                <item.icon
                  className={cn(
                    'flex-shrink-0 transition-all duration-200',
                    isCollapsed ? 'h-[17px] w-[17px]' : 'h-4 w-4',
                    isActive
                      ? 'text-qualia-600 dark:text-qualia-400'
                      : isHighlight
                        ? 'text-qualia-500'
                        : 'text-muted-foreground group-hover:scale-110 group-hover:text-qualia-500'
                  )}
                />
                {!isCollapsed && (
                  <span className="flex items-center gap-2">
                    {item.name}
                    {isHighlight && !isActive && (
                      <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-qualia-500" />
                    )}
                  </span>
                )}
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
          'relative hidden h-screen flex-col border-r border-border bg-card transition-all duration-200 ease-out md:flex',
          isCollapsed ? 'w-[60px]' : 'w-56'
        )}
      >
        <SidebarContent isCollapsed={isCollapsed} />
        {/* Collapse Toggle - Right Edge Middle */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-md transition-all duration-200 hover:scale-110 hover:border-qualia-500/30 hover:bg-qualia-500/10 hover:text-qualia-600 dark:hover:text-qualia-400"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
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
