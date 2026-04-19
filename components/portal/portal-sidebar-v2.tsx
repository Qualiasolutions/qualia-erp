'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Eye,
  House,
  FolderKanban,
  MessageSquare,
  FileStack,
  Receipt,
  Lightbulb,
  Settings,
  LogOut,
  LogIn,
  ChevronUp,
  ChevronDown,
  Menu,
  Shield,
  Calendar,
  BookOpen,
  FlaskConical,
  Activity,
  ClipboardList,
  Circle,
  Users,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import {
  useUnreadMessageCount,
  invalidateActiveSession,
  invalidateTodaysSessions,
} from '@/lib/swr';
import { ViewAsDialog } from './view-as-dialog';
import { ClockInModal } from '@/components/today-dashboard/clock-in-modal';
import { ClockOutModal } from '@/components/clock-out-modal';
import { useClockGate } from '@/components/clock-gate-provider';
import { format as formatDate } from 'date-fns';

/* ------------------------------------------------------------------ */
/* Navigation items                                                    */
/* ------------------------------------------------------------------ */

interface NavItemDef {
  name: string;
  href: string | null;
  icon: typeof House;
  exact?: boolean;
  comingSoon?: boolean;
  appKey: string;
}

// Home — always shown first
const homeItem: NavItemDef = {
  name: 'Home',
  href: '/',
  icon: House,
  exact: true,
  appKey: 'home',
};

// Core apps shown after Home (everyone sees these). Tasks is the unified
// surface — Inbox folded into /tasks (default mode for internal users).
const coreApps: NavItemDef[] = [
  { name: 'Projects', href: '/projects', icon: FolderKanban, appKey: 'projects' },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList, appKey: 'tasks' },
  { name: 'Activity', href: '/activity', icon: Activity, appKey: 'activity' },
];

// Client-facing extras (Messages, Files, Requests — clients access these standalone,
// internal users access files/messages within project detail pages instead)
const clientPortalApps: NavItemDef[] = [
  { name: 'Messages', href: '/messages', icon: MessageSquare, appKey: 'messages' },
  { name: 'Files', href: '/files', icon: FileStack, appKey: 'files' },
];

// Settings — always last
const settingsItem: NavItemDef = {
  name: 'Settings',
  href: '/settings',
  icon: Settings,
  appKey: 'settings',
};

// Client-only apps (hidden from internal users)
const clientApps: NavItemDef[] = [
  { name: 'Billing', href: '/billing', icon: Receipt, appKey: 'billing' },
  { name: 'Requests', href: '/requests', icon: Lightbulb, appKey: 'requests' },
];

// Internal team apps (admin, employee — never shown to clients).
const internalApps: NavItemDef[] = [
  { name: 'Schedule', href: '/schedule', icon: Calendar, appKey: 'schedule' },
  { name: 'Knowledge', href: '/knowledge', icon: BookOpen, appKey: 'knowledge' },
  { name: 'Research', href: '/research', icon: FlaskConical, appKey: 'research' },
];

// Admin-only apps (never shown to employee or client).
// Clients hidden from sidebar — managed via the admin dashboard / project detail.
const adminOnlyApps: NavItemDef[] = [
  { name: 'Status', href: '/status', icon: Activity, appKey: 'status' },
];

// Admin subpages — shown in collapsible group for admin/manager
const adminSubpages: NavItemDef[] = [
  { name: 'Team Management', href: '/admin', icon: Users, exact: true, appKey: 'admin-team' },
  { name: 'Assignments', href: '/admin/assignments', icon: UserCheck, appKey: 'admin-assignments' },
  {
    name: 'Attendance',
    href: '/admin/attendance',
    icon: ClipboardList,
    appKey: 'admin-attendance',
  },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, appKey: 'admin-reports' },
];

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface PortalBranding {
  company_name?: string | null;
  logo_url?: string | null;
  accent_color?: string | null;
}

interface PortalSidebarV2Props {
  displayName: string;
  displayEmail: string;
  isAdminViewing: boolean;
  companyName?: string | null;
  userId?: string;
  enabledApps?: string[];
  branding?: PortalBranding | null;
  userRole?: string;
}

/* ------------------------------------------------------------------ */
/* NavLink                                                             */
/* ------------------------------------------------------------------ */

/** Maps appKey → data-tour anchor for the welcome tour spotlight */
const TOUR_ANCHORS: Record<string, string> = {
  projects: 'projects-nav',
  tasks: 'tasks-nav',
  files: 'files-nav',
  messages: 'messages-nav',
  requests: 'requests-nav',
  settings: 'settings-nav',
};

function NavLink({
  item,
  isActive,
  onClick,
  badge,
  disabled,
}: {
  item: NavItemDef;
  isActive: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <item.icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors duration-150',
          isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground'
        )}
        strokeWidth={isActive ? 2 : 1.75}
      />
      <span className="flex-1 truncate">{item.name}</span>
      {item.comingSoon && (
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
          Soon
        </span>
      )}
      {badge && <span className="ml-auto">{badge}</span>}
    </>
  );

  const baseClasses = cn(
    'group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
    isActive
      ? 'border-l-2 border-primary bg-primary/[0.06] text-primary font-medium'
      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
  );

  const tourAnchor = TOUR_ANCHORS[item.appKey];

  if (disabled || item.comingSoon || !item.href) {
    return (
      <div
        className={cn(baseClasses, 'cursor-default opacity-40')}
        aria-disabled="true"
        data-tour={tourAnchor}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link href={item.href} onClick={onClick} className={baseClasses} data-tour={tourAnchor}>
      {inner}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* UserMenu                                                            */
/* ------------------------------------------------------------------ */

function UserMenu({
  displayName,
  displayEmail,
  isAdminViewing,
}: {
  displayName: string;
  displayEmail: string;
  isAdminViewing: boolean;
  onLinkClick?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
              'hover:bg-primary/[0.04]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
            )}
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground/60">{displayEmail}</p>
            </div>
            <ThemeSwitcher />
            <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground/25" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-52">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground/70">{displayEmail}</p>
          </div>
          <DropdownMenuSeparator />
          {isAdminViewing && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  setViewAsOpen(true);
                }}
              >
                <Eye className="h-4 w-4" />
                View as
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdminViewing && <ViewAsDialog open={viewAsOpen} onOpenChange={setViewAsOpen} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* ClockWidget — clock-in/out for internal users                       */
/* ------------------------------------------------------------------ */

function ClockWidget({ userId }: { userId: string | null }) {
  const [showClockIn, setShowClockIn] = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);
  const { session: activeSession, isLoading, workspaceId } = useClockGate();

  if (!workspaceId || isLoading) return null;

  if (activeSession) {
    const elapsed = Math.round((Date.now() - new Date(activeSession.started_at).getTime()) / 60000);
    const hrs = Math.floor(elapsed / 60);
    const mins = elapsed % 60;

    return (
      <div className="border-t border-border/30 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setShowClockOut(true)}
          className="flex w-full items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-left transition-all duration-150 hover:border-primary/40 hover:bg-primary/[0.10]"
        >
          <Circle className="size-2.5 animate-pulse fill-emerald-500 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-foreground">Clocked in</div>
            <div className="text-[11px] text-muted-foreground/70">
              {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`} —{' '}
              {formatDate(new Date(activeSession.started_at), 'h:mm a')}
            </div>
          </div>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Out
          </span>
        </button>
        <ClockOutModal
          open={showClockOut}
          onOpenChange={setShowClockOut}
          workspaceId={workspaceId}
          session={activeSession}
          onSuccess={() => setShowClockOut(false)}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-primary/20 bg-primary/[0.04] px-3 py-3">
      <button
        type="button"
        onClick={() => setShowClockIn(true)}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/10 px-4 py-3 text-left transition-all duration-200 hover:border-primary/50 hover:bg-primary/15 hover:shadow-md"
      >
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20">
          <LogIn className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-primary">Clock in to start</div>
          <div className="text-[11px] text-primary/60">Begin your work session</div>
        </div>
      </button>
      <ClockInModal
        open={showClockIn}
        workspaceId={workspaceId}
        currentUserId={userId}
        onSuccess={() => {
          setShowClockIn(false);
          invalidateActiveSession(workspaceId, true);
          invalidateTodaysSessions(workspaceId, true);
        }}
        onDismiss={() => setShowClockIn(false)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AdminNavGroup — collapsible admin subpages                          */
/* ------------------------------------------------------------------ */

function AdminNavGroup({
  pathname,
  onLinkClick,
  isGated,
}: {
  pathname: string;
  onLinkClick?: () => void;
  isGated: boolean;
}) {
  const isAdminActive = pathname.startsWith('/admin');
  const [expanded, setExpanded] = useState(isAdminActive);

  return (
    <div className="mt-2 space-y-0.5 border-t border-border/20 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'group flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
          isAdminActive
            ? 'font-medium text-primary'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
        aria-expanded={expanded}
      >
        <Shield
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-colors duration-150',
            isAdminActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground'
          )}
          strokeWidth={isAdminActive ? 2 : 1.75}
        />
        <span className="flex-1 truncate text-left">Admin</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground/40" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/40" />
        )}
      </button>
      {expanded && (
        <div className="ml-3 space-y-0.5 border-l border-border/20 pl-2">
          {adminSubpages.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <NavLink
                key={item.appKey}
                item={item}
                isActive={active}
                onClick={onLinkClick}
                disabled={isGated}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SidebarContent (shared between desktop and mobile)                  */
/* ------------------------------------------------------------------ */

function SidebarContent({
  displayName,
  displayEmail,
  isAdminViewing,
  companyName,
  userId,
  enabledApps,
  branding,
  userRole,
  onLinkClick,
}: PortalSidebarV2Props & { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { total } = useUnreadMessageCount(userId ?? null);
  const { isGated } = useClockGate();

  const isActive = (item: NavItemDef) => {
    if (!item.href) return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const isInternal = userRole === 'admin' || userRole === 'employee';

  // Build role-aware nav items.
  // Order: Home → Projects → Tasks → Activity → role extras → Settings
  const allNavItems = useMemo(() => {
    const items: NavItemDef[] = [homeItem];

    items.push(...coreApps);

    if (userRole === 'client') {
      // Clients get Messages, Files, Billing, Requests as standalone pages
      items.push(...clientPortalApps, ...clientApps);
    } else if (userRole === 'employee') {
      items.push(...internalApps);
    } else if (userRole === 'admin') {
      items.push(...internalApps, ...adminOnlyApps);
    }

    items.push(settingsItem);

    return items;
  }, [userRole]);

  // Filter nav items by enabled apps. When admin is actively impersonating,
  // the parent layout passes the viewed user's effective role + enabled apps,
  // so the same filter produces the correct "as-if-I-was-them" sidebar.
  const visibleNavItems =
    !enabledApps || enabledApps.length === 0
      ? allNavItems
      : allNavItems.filter((item) => enabledApps.includes(item.appKey));

  const unreadBadge =
    total > 0 ? (
      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
        {total > 99 ? '99+' : total}
      </span>
    ) : null;

  // Branding values (fallback to defaults)
  const brandLogoUrl = branding?.logo_url || '/logo.webp';
  const brandName = branding?.company_name || 'QUALIA';

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Company branding area */}
      <div className="flex items-center gap-2.5 border-b border-border/30 px-5 py-4">
        <Link href="/" className="group flex items-center gap-2.5" onClick={onLinkClick}>
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md transition-transform duration-150 group-hover:scale-105">
            <Image
              src={brandLogoUrl}
              alt={brandName}
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
              unoptimized={brandLogoUrl !== '/logo.webp'}
            />
          </div>
          <span className="text-[13px] font-bold tracking-[0.08em] text-foreground">
            {brandName}
          </span>
        </Link>
      </div>
      {companyName && (
        <div className="px-5 pb-3 pt-2.5">
          <p className="truncate text-[11px] font-medium tracking-[0.06em] text-muted-foreground/60">
            {companyName}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-4" aria-label="Portal navigation">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            isActive={isActive(item)}
            onClick={onLinkClick}
            badge={item.name === 'Messages' ? unreadBadge : undefined}
            disabled={isGated && item.appKey !== 'home'}
          />
        ))}

        {/* Admin section — only visible to admin */}
        {userRole === 'admin' && (
          <AdminNavGroup pathname={pathname} onLinkClick={onLinkClick} isGated={isGated} />
        )}
      </nav>

      {/* Clock in/out — internal users only */}
      {isInternal && <ClockWidget userId={userId ?? null} />}

      {/* User area at bottom */}
      <div className="border-t border-border/30 bg-primary/[0.02] px-3 py-3 backdrop-blur-sm">
        <UserMenu
          displayName={displayName}
          displayEmail={displayEmail}
          isAdminViewing={isAdminViewing}
          onLinkClick={onLinkClick}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PortalSidebarV2 (exported)                                          */
/* ------------------------------------------------------------------ */

export function PortalSidebarV2(props: PortalSidebarV2Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile trigger -- 44px min touch target */}
      <div className="fixed left-4 top-4 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-card p-2.5 text-muted-foreground shadow-sm hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <SidebarContent {...props} onLinkClick={handleLinkClick} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 flex-shrink-0 border-r border-border md:block">
        <SidebarContent {...props} />
      </aside>
    </>
  );
}
