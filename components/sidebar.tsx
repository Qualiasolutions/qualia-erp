'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Folder,
  Calendar,
  Building2,
  Inbox,
  Settings,
  User,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/sidebar-provider';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
];

const bottomNav = [{ name: 'Settings', href: '/settings', icon: Settings }];

function NavItem({
  item,
  isActive,
  isCollapsed,
  onLinkClick,
}: {
  item: (typeof navigation)[0];
  isActive: boolean;
  isCollapsed: boolean;
  onLinkClick?: () => void;
}) {
  const linkContent = (
    <Link
      href={item.href}
      onClick={onLinkClick}
      className={cn(
        'nav-icon group relative flex items-center gap-3',
        isCollapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full px-3',
        isActive && 'nav-icon-active'
      )}
    >
      <item.icon
        className={cn(
          'h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      {!isCollapsed && (
        <span
          className={cn(
            'text-[13px] font-medium transition-colors duration-200',
            isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
          )}
        >
          {item.name}
        </span>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="font-medium">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function SidebarContent({
  isCollapsed,
  onLinkClick,
}: {
  isCollapsed: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div
          className={cn(
            'flex items-center border-b border-border/50',
            isCollapsed ? 'h-16 justify-center' : 'h-16 px-4'
          )}
        >
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity duration-200 hover:opacity-80"
            onClick={onLinkClick}
          >
            <div className="relative">
              <Image
                src="/logo.webp"
                alt="Qualia"
                width={28}
                height={28}
                className="rounded-lg transition-all duration-300 group-hover:shadow-glow-sm"
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

        {/* Command hint */}
        {!isCollapsed && (
          <div className="border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>Press</span>
              <kbd className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-medium">
                ⌘K
              </kbd>
              <span>for AI</span>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className={cn('flex-1 py-4', isCollapsed ? 'px-3' : 'px-4')}>
          <div className={cn('space-y-1', isCollapsed && 'flex flex-col items-center')}>
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <NavItem
                  key={item.name}
                  item={item}
                  isActive={isActive}
                  isCollapsed={isCollapsed}
                  onLinkClick={onLinkClick}
                />
              );
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className={cn('border-t border-border/50 py-4', isCollapsed ? 'px-3' : 'px-4')}>
          <div className={cn('space-y-1', isCollapsed && 'flex flex-col items-center')}>
            {bottomNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);

              return (
                <NavItem
                  key={item.name}
                  item={item}
                  isActive={isActive}
                  isCollapsed={isCollapsed}
                  onLinkClick={onLinkClick}
                />
              );
            })}

            {/* User Avatar */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'nav-icon group relative flex items-center gap-3',
                    isCollapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full px-3'
                  )}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-all duration-200 group-hover:bg-primary/20">
                    <User className="h-4 w-4" />
                  </div>
                  {!isCollapsed && (
                    <span className="text-[13px] font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
                      Profile
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" sideOffset={12} className="font-medium">
                  Profile
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleMobile } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);

  const handleLinkClick = () => {
    if (isMobileOpen) {
      toggleMobile();
    }
  };

  // Show expanded when: not collapsed OR (collapsed but hovered)
  const showExpanded = !isCollapsed || isHovered;

  return (
    <>
      {/* Desktop Sidebar - Icon-only, expands on hover */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'relative z-sticky hidden h-full flex-shrink-0 flex-col border-r border-border/50 bg-background/80 backdrop-blur-xl transition-all duration-300 ease-premium md:flex',
          showExpanded ? 'w-60' : 'w-16'
        )}
      >
        <SidebarContent isCollapsed={!showExpanded} onLinkClick={handleLinkClick} />
      </aside>

      {/* Mobile Sidebar - Sheet/Drawer */}
      <Sheet open={isMobileOpen} onOpenChange={toggleMobile}>
        <SheetContent
          side="left"
          className="w-72 border-border/50 bg-background/95 p-0 backdrop-blur-xl"
        >
          <div className="flex h-full flex-col">
            <SidebarContent isCollapsed={false} onLinkClick={handleLinkClick} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
