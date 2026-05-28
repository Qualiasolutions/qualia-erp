'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { invalidateActiveSession, invalidateTodaysSessions } from '@/lib/swr';
import { useClockGate } from '@/components/clock-gate-provider';
import { ClockInModal } from '@/components/today-dashboard/clock-in-modal';
import { ClockOutModal } from '@/components/clock-out-modal';
import { ViewAsDialog } from '@/components/portal/view-as-dialog';
import { QualiaTweaksPanel } from '@/components/portal/qualia-tweaks-panel';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { QIcon, type QIconName } from '@/components/ui/q-icon';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ======================================================================
   Nav registry — flat list, role-filtered
   ====================================================================== */

type Role = 'admin' | 'employee' | 'client';

type PageDef = {
  id: string;
  label: string;
  icon: QIconName;
  href: string;
  roles: Role[];
  appKey: string;
  exact?: boolean;
  /** When set, active state requires this query param key=value in addition to pathname match. */
  matchQuery?: { key: string; value: string };
};

/**
 * Items are ordered per role so that filtering by role produces the correct
 * display order. When an item belongs to multiple roles the position is
 * chosen for the role that lists it earliest; the `roleOrder` map below
 * re-sorts at runtime so every role gets its intended sequence.
 */
const PAGES: PageDef[] = [
  {
    id: 'admin-dashboard',
    label: 'Dashboard',
    icon: 'home',
    href: '/dashboard',
    exact: true,
    roles: ['admin'],
    appKey: 'home',
  },
  {
    id: 'employee-dashboard',
    label: 'Dashboard',
    icon: 'home',
    href: '/dashboard',
    exact: true,
    roles: ['employee'],
    appKey: 'home',
  },
  {
    id: 'client-dashboard',
    label: 'Dashboard',
    icon: 'home',
    href: '/dashboard',
    exact: true,
    roles: ['client'],
    appKey: 'home',
  },
  {
    id: 'admin-panel',
    label: 'Admin Panel',
    icon: 'admin',
    href: '/admin',
    roles: ['admin'],
    appKey: 'control',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'projects',
    href: '/projects',
    roles: ['admin', 'employee', 'client'],
    appKey: 'projects',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: 'calendar',
    href: '/schedule',
    roles: ['admin', 'employee'],
    appKey: 'schedule',
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: 'knowledge',
    href: '/knowledge',
    roles: ['admin', 'employee'],
    appKey: 'knowledge',
  },
  {
    id: 'requests',
    label: 'Requests',
    icon: 'tasks',
    href: '/requests',
    roles: ['admin', 'employee', 'client'],
    appKey: 'requests',
  },
  {
    id: 'files',
    label: 'Files',
    icon: 'files',
    href: '/files',
    roles: ['client'],
    appKey: 'files',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: 'clients',
    href: '/clients',
    roles: ['admin'],
    appKey: 'clients',
  },
  {
    id: 'client-billing',
    label: 'Billing',
    icon: 'payments',
    href: '/billing',
    roles: ['client'],
    appKey: 'billing',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    href: '/settings',
    roles: ['admin', 'employee', 'client'],
    appKey: 'settings',
  },
];

const ROLE_ORDER: Record<Role, string[]> = {
  admin: [
    'admin-dashboard',
    'projects',
    'schedule',
    'requests',
    'clients',
    'knowledge',
    'admin-panel',
    'settings',
  ],
  employee: ['employee-dashboard', 'projects', 'schedule', 'requests', 'knowledge', 'settings'],
  client: ['client-dashboard', 'projects', 'files', 'requests', 'client-billing', 'settings'],
};

/* ======================================================================
   Props
   ====================================================================== */

interface PortalBranding {
  company_name?: string | null;
  logo_url?: string | null;
  accent_color?: string | null;
}

export interface QualiaSidebarProps {
  displayName: string;
  displayEmail: string;
  isAdminViewing: boolean;
  /** True when admin has an active view-as session (viewing another user's portal). */
  isImpersonating?: boolean;
  companyName?: string | null;
  userId?: string;
  enabledApps?: string[];
  branding?: PortalBranding | null;
  userRole?: string;
  userLogoUrl?: string | null;
}

/* ======================================================================
   NavItem — solid teal pill with glow when active
   ====================================================================== */

function NavItem({
  page,
  isActive,
  disabled,
  badge,
  onClick,
}: {
  page: PageDef;
  isActive: boolean;
  disabled: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <QIcon name={page.icon} size={15} />
      <span className="flex-1 truncate text-left">{page.label}</span>
      {badge && badge > 0 ? (
        <span
          className={cn(
            'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold',
            isActive
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-primary text-primary-foreground'
          )}
          aria-label={`${badge} unread`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </>
  );

  const classes = cn(
    'group relative flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0',
    isActive
      ? // Active: solid teal pill with glow in dark mode
        'bg-primary font-semibold text-primary-foreground shadow-[0_1px_0_0_hsl(0_0%_100%/0.08)_inset,var(--glow-teal-sm)]'
      : 'font-medium text-muted-foreground hover:bg-muted/55 hover:text-foreground',
    disabled ? 'cursor-default opacity-40' : 'cursor-pointer'
  );

  if (disabled) {
    return (
      <div
        className={classes}
        aria-disabled="true"
        data-nav-id={page.id}
        title="Clock in to access"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={page.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={classes}
      data-nav-id={page.id}
    >
      {inner}
    </Link>
  );
}

/* ======================================================================
   ClockTicker — isolates the 1s interval so only this re-renders
   ====================================================================== */

function ClockTicker({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const elapsed = Math.max(0, now - new Date(startedAt).getTime());
  const hrs = Math.floor(elapsed / 3_600_000);
  const mins = Math.floor((elapsed % 3_600_000) / 60_000);
  const secs = Math.floor((elapsed % 60_000) / 1000);
  return (
    <>{`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}</>
  );
}

/* ======================================================================
   ClockPill — compact horizontal strip, glows when clocked in
   ====================================================================== */

function ClockPill({ userId }: { userId: string | null }) {
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);
  const { session, isLoading, workspaceId } = useClockGate();

  if (!workspaceId || isLoading) return null;

  const clockedIn = !!session;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors duration-150',
          clockedIn
            ? 'border-emerald-500/25 bg-emerald-500/[0.06] dark:shadow-[0_0_8px_-2px_hsl(155_60%_48%_/_0.4)]'
            : 'border-border bg-muted/30'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            clockedIn
              ? 'animate-pulse bg-emerald-500 shadow-[0_0_4px_hsl(155_60%_48%/0.8)]'
              : 'bg-muted-foreground/40'
          )}
        />
        <div className="min-w-0 flex-1">
          {clockedIn ? (
            <div className="font-mono text-[12px] font-semibold tabular-nums tracking-tight text-foreground">
              {session ? <ClockTicker startedAt={session.started_at} /> : '00:00:00'}
            </div>
          ) : (
            <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Off the clock
            </div>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => (clockedIn ? setShowOut(true) : setShowIn(true))}
            className={cn(
              'cursor-pointer rounded-md px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] transition-colors duration-150',
              clockedIn
                ? 'border border-border bg-card text-foreground hover:bg-muted'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 dark:shadow-[var(--glow-teal-sm)] dark:hover:shadow-[var(--glow-teal-md)]'
            )}
            aria-label={clockedIn ? 'Clock out' : 'Clock in'}
          >
            {clockedIn ? 'Out' : 'In'}
          </button>
        </div>
      </div>

      {workspaceId ? (
        <>
          <ClockInModal
            open={showIn}
            workspaceId={workspaceId}
            currentUserId={userId}
            onSuccess={() => {
              setShowIn(false);
              invalidateActiveSession(workspaceId, true);
              invalidateTodaysSessions(workspaceId, true);
            }}
            onDismiss={() => setShowIn(false)}
          />
          {session ? (
            <ClockOutModal
              open={showOut}
              onOpenChange={setShowOut}
              workspaceId={workspaceId}
              session={session}
              onSuccess={() => setShowOut(false)}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}

/* ======================================================================
   IdentityStrip — avatar + name (dropdown trigger) + theme + tweaks
   ====================================================================== */

function IdentityStrip({
  displayName,
  role,
  isAdmin,
  logoUrl,
  onOpenTweaks,
  onViewAs,
  isImpersonating,
}: {
  displayName: string;
  role: string;
  isAdmin: boolean;
  logoUrl: string | null;
  onOpenTweaks: () => void;
  onViewAs: () => void;
  isImpersonating: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-muted/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Account menu"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/15"
              aria-hidden
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-xs font-semibold text-foreground">
                {displayName}
              </span>
              <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground">
                {role}
                {isImpersonating ? ' · viewing' : ''}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-52">
          {isAdmin ? (
            <>
              <DropdownMenuItem
                onSelect={() => {
                  setMenuOpen(false);
                  onViewAs();
                }}
              >
                <QIcon name="clients" size={14} /> View as…
              </DropdownMenuItem>
              {isImpersonating ? (
                <DropdownMenuItem asChild>
                  <Link href="/api/view-as/clear">
                    <QIcon name="x" size={14} /> Exit impersonation
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <QIcon name="settings" size={14} /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <QIcon name="x" size={14} /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeSwitcher />

      {isAdmin ? (
        <button
          type="button"
          onClick={onOpenTweaks}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted/55 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Tweaks"
        >
          <QIcon name="settings" size={13} />
        </button>
      ) : null}
    </div>
  );
}

/* ======================================================================
   BrandRow — logo + name + ⌘K chip in one tight row
   ====================================================================== */

function BrandRow({
  brandName,
  brandLogoUrl,
  onLinkClick,
  onJump,
}: {
  brandName: string;
  brandLogoUrl: string;
  onLinkClick?: () => void;
  onJump: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-4">
      <Link
        href="/dashboard"
        onClick={onLinkClick}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/15 transition-shadow duration-150 hover:dark:shadow-[var(--glow-teal-sm)]"
        aria-label="Qualia home"
      >
        <Image
          src={brandLogoUrl}
          alt={brandName}
          width={36}
          height={36}
          className="h-full w-full object-contain"
          priority
          unoptimized={brandLogoUrl !== '/logo.webp'}
        />
      </Link>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-tight text-foreground">
        {brandName}
      </span>
      <button
        type="button"
        onClick={onJump}
        className="flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-border/70 bg-muted/40 px-2 font-mono text-[10px] font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-muted/70 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="Open command menu"
      >
        <QIcon name="search" size={11} />
        <span>⌘K</span>
      </button>
    </div>
  );
}

/* ======================================================================
   Sidebar body — shared between desktop + mobile Sheet
   ====================================================================== */

function SidebarBody({
  displayName,
  isImpersonating = false,
  companyName,
  userId,
  enabledApps,
  branding,
  userRole,
  userLogoUrl,
  onLinkClick,
}: QualiaSidebarProps & { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);

  const { isGated } = useClockGate();

  const role = (userRole ?? 'client') as Role;
  const isAdmin = role === 'admin';
  const isInternal = role === 'admin' || role === 'employee';

  const visiblePages = useMemo(() => {
    const order = ROLE_ORDER[role];
    const filtered = PAGES.filter((p) => p.roles.includes(role));
    const gated =
      !enabledApps || enabledApps.length === 0
        ? filtered
        : filtered.filter((p) => p.id === 'settings' || enabledApps.includes(p.appKey));
    return gated.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }, [role, enabledApps]);

  const isActivePage = (p: PageDef) => {
    const basePath = p.href.split('?')[0];

    if (p.matchQuery) {
      return pathname === basePath && searchParams.get(p.matchQuery.key) === p.matchQuery.value;
    }

    if (p.exact) {
      return pathname === basePath;
    }

    return pathname === basePath || pathname.startsWith(`${basePath}/`);
  };

  const brandName = branding?.company_name ?? 'Qualia';
  const brandLogoUrl = branding?.logo_url ?? '/logo.webp';

  const handleTweaksGear = () => {
    if (isAdmin) setTweaksOpen(true);
    else window.location.href = '/settings';
  };

  const handleJump = () => {
    const evt = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(evt);
  };

  return (
    <aside
      className="dark:bg-surface-1 flex h-full flex-col border-r border-border bg-[hsl(var(--surface-2))]/55"
      aria-label="Primary navigation"
    >
      <BrandRow
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
        onLinkClick={onLinkClick}
        onJump={handleJump}
      />

      {companyName ? (
        <div className="px-4 pb-3 pt-1">
          <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/80">
            {companyName}
          </p>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-1" aria-label="Primary">
        <div className="space-y-0.5">
          {visiblePages.map((p) => (
            <NavItem
              key={p.id}
              page={p}
              isActive={isActivePage(p)}
              disabled={isGated && !p.id.endsWith('-dashboard')}
              badge={undefined}
              onClick={onLinkClick}
            />
          ))}
        </div>
      </nav>

      <div className="space-y-3 border-t border-border/80 p-4">
        {isInternal ? <ClockPill userId={userId ?? null} /> : null}

        <IdentityStrip
          displayName={displayName}
          role={role}
          isAdmin={isAdmin}
          logoUrl={userLogoUrl ?? null}
          onOpenTweaks={handleTweaksGear}
          onViewAs={() => setViewAsOpen(true)}
          isImpersonating={isImpersonating}
        />
      </div>

      {isAdmin && tweaksOpen ? (
        <QualiaTweaksPanel
          onClose={() => setTweaksOpen(false)}
          onViewAs={() => {
            setTweaksOpen(false);
            setViewAsOpen(true);
          }}
          isImpersonating={isImpersonating}
        />
      ) : null}

      {isAdmin ? <ViewAsDialog open={viewAsOpen} onOpenChange={setViewAsOpen} /> : null}
    </aside>
  );
}

/* ======================================================================
   QualiaSidebar — exported
   ====================================================================== */

export function QualiaSidebar(props: QualiaSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger — pure-black-friendly floating launcher */}
      <div className="fixed left-3 top-3 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-elevation-2 transition-colors duration-150 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Open navigation"
            >
              <QIcon name="more" size={18} />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="bg-surface-1 w-[88vw] max-w-[288px] border-border p-0"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarBody {...props} onLinkClick={handleLinkClick} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden h-full shrink-0 md:block" style={{ width: 'var(--sidebar-w, 256px)' }}>
        <SidebarBody {...props} />
      </div>
    </>
  );
}
