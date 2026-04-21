'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { format as formatDate } from 'date-fns';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  useUnreadMessageCount,
  invalidateActiveSession,
  invalidateTodaysSessions,
} from '@/lib/swr';
import { useClockGate } from '@/components/clock-gate-provider';
import { ClockInModal } from '@/components/today-dashboard/clock-in-modal';
import { ClockOutModal } from '@/components/clock-out-modal';
import { ViewAsDialog } from '@/components/portal/view-as-dialog';
import { QualiaTweaksPanel } from '@/components/portal/qualia-tweaks-panel';
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
   Nav registry — derived from .planning/design-handoff/project/shell.jsx
   Mapped to current ERP routes. "Control" temporarily points to /admin
   until the consolidated /control surface lands in Phase 17.
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
};

const PAGES: PageDef[] = [
  {
    id: 'today',
    label: 'Home',
    icon: 'home',
    href: '/',
    exact: true,
    roles: ['admin', 'employee'],
    appKey: 'home',
  },
  {
    id: 'portal',
    label: 'Workspace',
    icon: 'home',
    href: '/',
    exact: true,
    roles: ['client'],
    appKey: 'home',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'tasks',
    href: '/tasks',
    roles: ['admin', 'employee'],
    appKey: 'tasks',
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
    id: 'control',
    label: 'Control',
    icon: 'admin',
    href: '/admin',
    roles: ['admin'],
    appKey: 'control',
  },
  {
    id: 'requests',
    label: 'Requests',
    icon: 'tasks',
    href: '/requests',
    roles: ['client'],
    appKey: 'requests',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'payments',
    href: '/billing',
    roles: ['client'],
    appKey: 'billing',
  },
  {
    id: 'chat',
    label: 'Messages',
    icon: 'agent',
    href: '/messages',
    roles: ['client'],
    appKey: 'messages',
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
   NavItem
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
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent-teal)] px-1 font-mono text-[10px] font-semibold text-[var(--on-accent)]"
          aria-label={`${badge} unread`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
      {isActive ? (
        <span
          aria-hidden
          className="absolute bottom-[7px] left-0 top-[7px] w-[2px] rounded-r bg-[var(--accent-teal)]"
        />
      ) : null}
    </>
  );

  const classes = cn(
    'relative mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)]/40 focus-visible:ring-offset-0',
    isActive
      ? 'font-semibold text-[var(--accent-teal)]'
      : 'font-medium text-[var(--text-soft)] hover:bg-[var(--surface-hi)] hover:text-[var(--text)]',
    isActive &&
      'bg-[var(--accent-soft)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--accent-teal),transparent_72%)]',
    disabled && 'cursor-default opacity-40'
  );

  if (disabled) {
    return (
      <div className={classes} aria-disabled="true" data-nav-id={page.id}>
        {inner}
      </div>
    );
  }

  return (
    <Link href={page.href} onClick={onClick} className={classes} data-nav-id={page.id}>
      {inner}
    </Link>
  );
}

/* ======================================================================
   Clock widget — matches design's restrained footer variant
   ====================================================================== */

function ClockBlock({ userId }: { userId: string | null }) {
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { session, isLoading, workspaceId } = useClockGate();

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  if (!workspaceId || isLoading) return null;

  const clockedIn = !!session;
  const elapsed = session ? now - new Date(session.started_at).getTime() : 0;
  const hrs = Math.floor(elapsed / 3_600_000);
  const mins = Math.floor((elapsed % 3_600_000) / 60_000);
  const secs = Math.floor((elapsed % 60_000) / 1000);
  const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-md border px-2.5 py-2 transition-colors duration-150',
          clockedIn
            ? 'border-[color-mix(in_oklch,var(--q-moss),transparent_70%)] bg-[color-mix(in_oklch,var(--q-moss),transparent_90%)]'
            : 'border-[var(--line)] bg-[var(--surface)]'
        )}
      >
        <div className="min-w-0 flex-1">
          <div
            className="flex items-center gap-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em]"
            style={{ color: clockedIn ? 'var(--q-moss)' : 'var(--text-mute)' }}
          >
            {clockedIn ? (
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: 'var(--q-moss)' }}
              />
            ) : null}
            {clockedIn ? 'Clocked in' : 'Off the clock'}
          </div>
          <div className="q-tabular font-mono text-[13px] font-semibold tracking-[-0.01em] text-[var(--text)]">
            {timeStr}
          </div>
        </div>
        <button
          type="button"
          onClick={() => (clockedIn ? setShowOut(true) : setShowIn(true))}
          className={cn(
            'rounded-[5px] px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors duration-150',
            clockedIn
              ? 'border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hi)]'
              : 'bg-[var(--accent-teal)] text-[var(--on-accent)] hover:opacity-90'
          )}
          aria-label={clockedIn ? 'Clock out' : 'Clock in'}
        >
          {clockedIn ? 'Out' : 'In'}
        </button>
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
   Identity footer — avatar + name + role + gear
   ====================================================================== */

function IdentityFooter({
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
    <div className="flex items-center gap-2.5">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="focus-visible:ring-[var(--accent-teal)]/40 group flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 py-1 transition-colors duration-150 hover:bg-[var(--surface-hi)] focus:outline-none focus-visible:ring-2"
            aria-label="Account menu"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-teal)] ring-1 ring-[color-mix(in_oklch,var(--accent-teal),transparent_80%)]"
              aria-hidden
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[12.5px] font-semibold text-[var(--text)]">
                {displayName}
              </span>
              <span className="block truncate font-mono text-[10.5px] uppercase tracking-[0.04em] text-[var(--text-mute)]">
                {role}
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

      <button
        type="button"
        onClick={onOpenTweaks}
        className="focus-visible:ring-[var(--accent-teal)]/40 rounded-md p-1.5 text-[var(--text-mute)] transition-colors duration-150 hover:bg-[var(--surface-hi)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2"
        aria-label={isAdmin ? 'Tweaks' : 'Settings'}
      >
        <QIcon name="settings" size={14} />
      </button>
    </div>
  );
}

/* ======================================================================
   Jump-to trigger — dispatches Cmd+K to the existing CommandMenu
   ====================================================================== */

function JumpTo() {
  const handleClick = () => {
    // Dispatch a synthetic Cmd/Ctrl+K on document so CommandMenu's listener toggles
    const evt = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(evt);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus-visible:ring-[var(--accent-teal)]/40 flex w-full items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-[12.5px] text-[var(--text-mute)] transition-colors duration-150 hover:border-[var(--line-2)] hover:bg-[var(--surface-hi)] focus:outline-none focus-visible:ring-2"
      aria-label="Jump to anywhere (command menu)"
    >
      <QIcon name="search" size={13} />
      <span className="flex-1 text-left">Jump to…</span>
      <span className="font-mono text-[10px] opacity-60">⌘K</span>
    </button>
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
  const [now, setNow] = useState(() => new Date());
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);

  const { total: unread } = useUnreadMessageCount(userId ?? null);
  const { isGated } = useClockGate();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const role = (userRole ?? 'client') as Role;
  const isAdmin = role === 'admin';
  const isInternal = role === 'admin' || role === 'employee';

  const visiblePages = useMemo(() => {
    const filtered = PAGES.filter((p) => p.roles.includes(role));
    if (!enabledApps || enabledApps.length === 0) return filtered;
    return filtered.filter((p) => enabledApps.includes(p.appKey));
  }, [role, enabledApps]);

  const isActivePage = (p: PageDef) => {
    if (p.exact) return pathname === p.href;
    return pathname === p.href || pathname.startsWith(`${p.href}/`);
  };

  const brandName = branding?.company_name ?? 'Qualia';
  // Fall back to the project's ship logo when branding doesn't supply one so
  // admins never see a bare placeholder.
  const brandLogoUrl = branding?.logo_url ?? '/logo.webp';

  const handleTweaksGear = () => {
    if (isAdmin) setTweaksOpen(true);
    else window.location.href = '/settings';
  };

  return (
    <aside
      className="flex h-full flex-col border-r border-[var(--line)] bg-[var(--surface-hi)]"
      style={{ width: 'var(--sidebar-w, 232px)' }}
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
        <Link
          href="/"
          onClick={onLinkClick}
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-[7px]"
          aria-label="Qualia home"
        >
          <Image
            src={brandLogoUrl}
            alt={brandName}
            width={26}
            height={26}
            className="h-full w-full object-contain"
            priority
            unoptimized={brandLogoUrl !== '/logo.webp'}
          />
        </Link>
        <span className="flex min-w-0 flex-col leading-[1.1]">
          <span className="q-display truncate text-[18px] text-[var(--text)]">{brandName}</span>
          <span className="q-label-mono text-[9.5px] tracking-[0.12em]">OPERATIONS SUITE</span>
        </span>
      </div>

      {/* Company name (clients only, admin viewing one) */}
      {companyName ? (
        <div className="px-5 pb-2">
          <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-mute)]">
            {companyName}
          </p>
        </div>
      ) : null}

      {/* Jump to (search / command palette) */}
      <div className="px-3 pb-3">
        <JumpTo />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-2 pt-1" aria-label="Primary">
        {visiblePages.map((p) => (
          <NavItem
            key={p.id}
            page={p}
            isActive={isActivePage(p)}
            disabled={isGated && p.id !== 'today' && p.id !== 'portal'}
            badge={p.id === 'chat' ? unread : undefined}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      {/* Footer block */}
      <div className="border-t border-[var(--line)] px-3.5 pb-3 pt-3">
        {isInternal ? (
          <div className="mb-2.5">
            <ClockBlock userId={userId ?? null} />
          </div>
        ) : null}

        <IdentityFooter
          displayName={displayName}
          role={role}
          isAdmin={isAdmin}
          logoUrl={userLogoUrl ?? null}
          onOpenTweaks={handleTweaksGear}
          onViewAs={() => setViewAsOpen(true)}
          isImpersonating={isImpersonating}
        />

        <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--text-mute)]">
          <span className="q-live-dot" aria-hidden />
          <span>
            {formatDate(now, 'HH:mm')} · {branding?.accent_color ? brandName : 'Nicosia'}
          </span>
        </div>
      </div>

      {/* Floating admin Tweaks panel */}
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

      {/* View as dialog — admin only */}
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
      {/* Mobile hamburger */}
      <div className="fixed left-4 top-4 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="focus-visible:ring-[var(--accent-teal)]/40 flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--text-soft)] shadow-sm hover:bg-[var(--surface-hi)] focus:outline-none focus-visible:ring-2"
              aria-label="Open navigation"
            >
              <QIcon name="more" size={18} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88vw] max-w-[260px] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarBody {...props} onLinkClick={handleLinkClick} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop aside */}
      <div className="hidden h-full shrink-0 md:block" style={{ width: 'var(--sidebar-w, 232px)' }}>
        <SidebarBody {...props} />
      </div>
    </>
  );
}
