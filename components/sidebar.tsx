'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sun,
  Folder,
  Calendar,
  Building2,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  BookOpen,
  FlaskConical,
  ExternalLink,
  Shield,
  Wallet,
  ClipboardList,
  ListTodo,
  Activity,
  Timer,
  UserPlus,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/sidebar-provider';
import { useAdminContext } from '@/components/admin-provider';
import { useActiveSession, useCurrentWorkspaceId } from '@/lib/swr';
import { ClockOutModal } from '@/components/clock-out-modal';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createClient } from '@/lib/supabase/client';

const workspaceNav = [
  { name: 'Dashboard', href: '/', icon: Sun },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
];

const adminWorkspaceNav = [
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Status', href: '/status', icon: Activity },
];

const resourcesNav = [
  { name: 'Research', href: '/research', icon: FlaskConical },
  { name: 'Knowledge', href: '/knowledge', icon: BookOpen },
];

const portalNav = [{ name: 'Client Portal', href: '/portal', icon: ExternalLink }];
const adminNav = [
  { name: 'Admin', href: '/admin', icon: Shield },
  { name: 'Tasks', href: '/admin/tasks', icon: ListTodo },
  { name: 'Assignments', href: '/admin/assignments', icon: UserPlus },
  { name: 'Attendance', href: '/admin/attendance', icon: ClipboardList },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Financials', href: '/payments', icon: Wallet },
];

type NavItem = (typeof workspaceNav)[0];

function NavLink({
  item,
  isActive,
  onClick,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group relative flex h-10 items-center rounded-lg text-[13px] font-medium transition-all duration-200 ease-premium',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
        isActive
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
      )}
    >
      <item.icon
        className={cn(
          'h-[18px] w-[18px] flex-shrink-0 transition-all duration-200 ease-premium',
          isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
        )}
      />
      {!collapsed && <span>{item.name}</span>}
      {isActive && !collapsed && (
        <span className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      {isActive && collapsed && (
        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) {
    return <div className="mx-auto my-1 h-px w-6 bg-border/40" />;
  }
  return (
    <span className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
      {children}
    </span>
  );
}

function UserMenu({ onLinkClick, collapsed }: { onLinkClick?: () => void; collapsed?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleMenuItemClick = (href?: string) => {
    setOpen(false);
    onLinkClick?.();
    if (href) {
      router.push(href);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center rounded-lg py-2 text-sm transition-all duration-200 ease-premium',
            'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/30',
            collapsed ? 'w-full justify-center px-0' : 'min-w-0 flex-1 gap-2.5 px-2.5'
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <span className="text-xs font-semibold text-primary">Q</span>
          </div>
          {!collapsed && (
            <>
              <span className="truncate text-[13px] font-medium">Qualia</span>
              <ChevronUp className="ml-auto h-3 w-3 shrink-0 opacity-30" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align={collapsed ? 'center' : 'start'}
        sideOffset={8}
        className="w-48"
      >
        <DropdownMenuItem onClick={() => handleMenuItemClick('/settings')}>
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({
  onLinkClick,
  collapsed = false,
}: {
  onLinkClick?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { isAdmin, userRole } = useAdminContext();
  // All internal roles (admin, employee, manager) can clock in/out.
  // When an admin is viewing-as an employee, userRole becomes 'employee', so this still works.
  const canTrackTime = userRole === 'admin' || userRole === 'employee' || userRole === 'manager';
  const [showClockOut, setShowClockOut] = useState(false);
  const { toggleSidebar } = useSidebar();

  // Session clock-out (employees and managers)
  const { workspaceId } = useCurrentWorkspaceId();
  const { session: activeSession } = useActiveSession(
    canTrackTime && workspaceId ? workspaceId : null
  );

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-card">
        {/* Logo */}
        <div
          className={cn(
            'relative flex h-[60px] items-center border-b border-border',
            collapsed ? 'justify-center px-2' : 'px-4'
          )}
        >
          <Link
            href="/"
            className="ease-out-quart group flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02]"
            onClick={onLinkClick}
          >
            <div className="ease-out-quart relative h-7 w-7 shrink-0 overflow-hidden rounded-lg transition-transform duration-200 group-hover:scale-[1.05]">
              <Image
                src="/logo.webp"
                alt="Qualia"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            {!collapsed && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold tracking-wider text-foreground">QUALIA</span>
                <span className="text-[10px] font-medium tracking-[0.3em] text-muted-foreground">
                  SUITE
                </span>
              </div>
            )}
          </Link>
          {/* Separator gradient */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 space-y-5 pt-4', collapsed ? 'px-2' : 'px-3')}>
          {/* Workspace section */}
          <div className="space-y-1">
            <SectionLabel collapsed={collapsed}>Workspace</SectionLabel>
            <div className="space-y-0.5">
              {workspaceNav.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={onLinkClick}
                  collapsed={collapsed}
                />
              ))}
              {isAdmin &&
                adminWorkspaceNav.map((item) => (
                  <NavLink
                    key={item.name}
                    item={item}
                    isActive={isActive(item.href)}
                    onClick={onLinkClick}
                    collapsed={collapsed}
                  />
                ))}
            </div>
          </div>

          {/* Resources section */}
          <div className="space-y-1">
            <SectionLabel collapsed={collapsed}>Resources</SectionLabel>
            <div className="space-y-0.5">
              {resourcesNav.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={onLinkClick}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>

          {/* Portal section — visible to all internal roles */}
          <div className="space-y-1">
            <SectionLabel collapsed={collapsed}>External</SectionLabel>
            <div className="space-y-0.5">
              {portalNav.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={onLinkClick}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>

          {/* Admin section — admins only */}
          {isAdmin && (
            <div className="space-y-1">
              <SectionLabel collapsed={collapsed}>Admin</SectionLabel>
              <div className="space-y-0.5">
                {adminNav.map((item) => (
                  <NavLink
                    key={item.name}
                    item={item}
                    isActive={isActive(item.href)}
                    onClick={onLinkClick}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Clock-out button — employees and managers with active session */}
        {canTrackTime && activeSession && workspaceId && (
          <div className={cn('pb-2', collapsed ? 'px-2' : 'px-3')}>
            <div className="mb-2 h-px bg-border/40" />
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowClockOut(true)}
                    className="flex w-full items-center justify-center rounded-lg border border-primary/30 bg-primary/10 p-2.5 transition-all duration-200 hover:bg-primary/15"
                  >
                    <Timer className="size-4 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Clock out — {activeSession.project?.name ?? 'Session active'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => setShowClockOut(true)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-left text-[13px] font-medium text-qualia-700 transition-all duration-200 hover:bg-primary/15 dark:text-qualia-300"
              >
                <Timer className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {activeSession.project?.name ?? 'Session active'}
                  </div>
                  <div className="text-[11px] text-primary/70 dark:text-primary/70">
                    Tap to clock out
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary dark:text-primary">
                  LIVE
                </span>
              </button>
            )}
            <ClockOutModal
              open={showClockOut}
              onOpenChange={setShowClockOut}
              workspaceId={workspaceId}
              session={activeSession}
              onSuccess={() => setShowClockOut(false)}
            />
          </div>
        )}

        {/* Collapse toggle */}
        <div className={cn('border-t border-border', collapsed ? 'px-2 py-2' : 'px-3 py-1.5')}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className={cn(
                  'flex h-8 w-full items-center rounded-md text-muted-foreground/50 transition-all duration-200 ease-premium hover:bg-muted/40 hover:text-muted-foreground',
                  collapsed ? 'justify-center' : 'justify-end px-2'
                )}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Bottom section — account menu */}
        <div className={cn('border-t border-border py-2.5', collapsed ? 'px-2' : 'px-3')}>
          <UserMenu onLinkClick={onLinkClick} collapsed={collapsed} />
        </div>
      </div>
    </TooltipProvider>
  );
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleMobile } = useSidebar();
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (isMobileOpen) {
      toggleMobile();
    }
  };

  // Hide sidebar on auth pages and portal (portal has its own layout)
  if (pathname.startsWith('/auth') || pathname.startsWith('/portal')) {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'ease-out-quart hidden h-full flex-shrink-0 border-r border-border bg-card transition-[width] duration-200 md:block',
          isCollapsed ? 'w-[60px]' : 'w-56'
        )}
      >
        <SidebarContent onLinkClick={handleLinkClick} collapsed={isCollapsed} />
      </aside>

      {/* Mobile Sidebar — always expanded */}
      <Sheet open={isMobileOpen} onOpenChange={toggleMobile}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onLinkClick={handleLinkClick} />
        </SheetContent>
      </Sheet>
    </>
  );
}
