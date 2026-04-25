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
   Nav registry — grouped into sections
   ====================================================================== */

type Role = 'admin' | 'employee' | 'client';
type Section = 'workspace' | 'knowledge' | 'admin' | 'account';

type PageDef = {
  id: string;
  label: string;
  icon: QIconName;
  href: string;
  roles: Role[];
  appKey: string;
  section: Section;
  exact?: boolean;
};

const PAGES: PageDef[] = [
  // Workspace
  {
    id: 'today',
    label: 'Home',
    icon: 'home',
    href: '/',
    exact: true,
    roles: ['admin', 'employee'],
    appKey: 'home',
    section: 'workspace',
  },
  {
    id: 'portal',
    label: 'Workspace',
    icon: 'home',
    href: '/',
    exact: true,
    roles: ['client'],
    appKey: 'home',
    section: 'workspace',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'tasks',
    href: '/tasks',
    roles: ['admin', 'employee'],
    appKey: 'tasks',
    section: 'workspace',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'projects',
    href: '/projects',
    roles: ['admin', 'employee', 'client'],
    appKey: 'projects',
    section: 'workspace',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: 'calendar',
    href: '/schedule',
    roles: ['admin', 'employee'],
    appKey: 'schedule',
    section: 'workspace',
  },
  {
    id: 'requests',
    label: 'Requests',
    icon: 'tasks',
    href: '/requests',
    roles: ['client'],
    appKey: 'requests',
    section: 'workspace',
  },
  // Knowledge
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: 'knowledge',
    href: '/knowledge',
    roles: ['admin', 'employee'],
    appKey: 'knowledge',
    section: 'knowledge',
  },
  {
    id: 'research',
    label: 'Research',
    icon: 'research',
    href: '/research',
    roles: ['admin', 'employee'],
    appKey: 'research',
    section: 'knowledge',
  },
  // Admin
  {
    id: 'clients',
    label: 'Clients',
    icon: 'clients',
    href: '/clients',
    roles: ['admin'],
    appKey: 'clients',
    section: 'admin',
  },
  {
    id: 'server',
    label: 'Server',
    icon: 'server',
    href: '/status',
    roles: ['admin', 'employee'],
    appKey: 'status',
    section: 'admin',
  },
  {
    id: 'control',
    label: 'Control',
    icon: 'admin',
    href: '/admin',
    roles: ['admin'],
    appKey: 'control',
    section: 'admin',
  },
  // Account
  {
    id: 'chat',
    label: 'Messages',
    icon: 'agent',
    href: '/messages',
    roles: ['client'],
    appKey: 'messages',
    section: 'account',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'payments',
    href: '/billing',
    roles: ['client'],
    appKey: 'billing',
    section: 'account',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    href: '/settings',
    roles: ['admin', 'employee', 'client'],
    appKey: 'settings',
    section: 'account',
  },
];

const SECTION_LABEL: Record<Section, string> = {
  workspace: 'Workspace',
  knowledge: 'Knowledge',
  admin: 'Admin',
  account: 'Account',
};

const SECTION_ORDER: Section[] = ['workspace', 'knowledge', 'admin', 'account'];

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
      <span
        className={cn(
          'inline-flex transition-transform duration-200',
          !isActive && 'group-hover:scale-110'
        )}
      >
        <QIcon name={page.icon} size={15} />
      </span>
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
    'group relative flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0',
    isActive
      ? // Active: solid teal pill with shadow + glow
        'bg-primary font-semibold text-primary-foreground shadow-md glow-primary-sm'
      : 'font-medium text-muted-foreground hover:bg-muted/55 hover:text-foreground',
    disabled ? 'cursor-default opacity-40' : 'cursor-pointer'
  );

  if (disabled) {
    return (
      <div className={classes} aria-disabled="true" data-nav-id={page.id}>
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
   ClockPill — modern terminal-style status panel
   • OFF: muted compact card with a single teal "Clock in" CTA
   • ON:  glowing teal-bordered card, big mono timer as the focal point,
          subtle "Stop" pill aligned to the timer
   ====================================================================== */

function ClockPill({ userId }: { userId: string | null }) {
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);
  const { session, isLoading, workspaceId } = useClockGate();

  if (!workspaceId || isLoading) return null;

  const clockedIn = !!session;

  return (
    <>
      {clockedIn ? (
        // ── ON STATE — glowing teal card, timer is the hero
        <div
          className={cn(
            'group relative overflow-hidden rounded-xl border border-primary/30 bg-card/50 backdrop-blur',
            'transition-all duration-200',
            'dark:shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_0_22px_-4px_hsl(var(--primary)/0.35),inset_0_0_24px_-12px_hsl(var(--primary)/0.4)]'
          )}
          aria-label="Clocked in — session active"
        >
          {/* Animated teal scanline accent (top edge) */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
          />

          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span aria-hidden className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
              <span className="relative h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.9)]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                ● Live
              </div>
              <div className="font-mono text-[15px] font-semibold tabular-nums leading-none tracking-tight text-foreground">
                {session ? <ClockTicker startedAt={session.started_at} /> : '00:00:00'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOut(true)}
              className={cn(
                'shrink-0 cursor-pointer rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5',
                'font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground',
                'transition-all duration-150 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive'
              )}
              aria-label="Stop session"
            >
              Stop
            </button>
          </div>
        </div>
      ) : (
        // ── OFF STATE — quiet, single teal CTA
        <button
          type="button"
          onClick={() => setShowIn(true)}
          className={cn(
            'group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5',
            'transition-all duration-200',
            'hover:border-primary/40 hover:bg-muted/40',
            'dark:hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_0_18px_-4px_hsl(var(--primary)/0.3)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          )}
          aria-label="Clock in"
        >
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40 transition-colors duration-200 group-hover:bg-primary group-hover:shadow-[0_0_6px_hsl(var(--primary)/0.7)]"
          />
          <div className="min-w-0 flex-1 text-left">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
              Off the clock
            </div>
            <div className="mt-0.5 text-[10.5px] text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
              Click to start session
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-md bg-primary px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-primary-foreground',
              'transition-all duration-200',
              'dark:shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)] dark:group-hover:shadow-[0_0_20px_-2px_hsl(var(--primary)/0.85)]',
              'group-hover:brightness-110'
            )}
          >
            Start
          </span>
        </button>
      )}

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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
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
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted/55 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
    <div className="flex items-center gap-3 px-4 py-5">
      <Link
        href="/"
        onClick={onLinkClick}
        className="glow-primary-sm flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-md transition-shadow duration-150"
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
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">
        {brandName}
      </span>
      <button
        type="button"
        onClick={onJump}
        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1.5 font-mono text-[10px] font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-muted/70 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);

  const { total: unread } = useUnreadMessageCount(userId ?? null);
  const { isGated } = useClockGate();

  const role = (userRole ?? 'client') as Role;
  const isAdmin = role === 'admin';
  const isInternal = role === 'admin' || role === 'employee';

  const visiblePages = useMemo(() => {
    const filtered = PAGES.filter((p) => p.roles.includes(role));
    if (!enabledApps || enabledApps.length === 0) return filtered;
    // Settings is always available; gate the rest by enabledApps
    return filtered.filter((p) => p.id === 'settings' || enabledApps.includes(p.appKey));
  }, [role, enabledApps]);

  const sectionedPages = useMemo(() => {
    const map = new Map<Section, PageDef[]>();
    for (const p of visiblePages) {
      const arr = map.get(p.section) ?? [];
      arr.push(p);
      map.set(p.section, arr);
    }
    return SECTION_ORDER.filter((s) => (map.get(s)?.length ?? 0) > 0).map((s) => ({
      id: s,
      label: SECTION_LABEL[s],
      items: map.get(s) ?? [],
    }));
  }, [visiblePages]);

  const isActivePage = (p: PageDef) => {
    if (p.exact) return pathname === p.href;
    return pathname === p.href || pathname.startsWith(`${p.href}/`);
  };

  const brandName = branding?.company_name ?? 'Qualia';
  const brandLogoUrl = branding?.logo_url ?? '/logo.webp';

  const handleTweaksGear = () => {
    if (isAdmin) setTweaksOpen(true);
    else window.location.href = '/settings';
  };

  const handleJump = () => {
    // Dispatch ⌘/Ctrl+K to the existing CommandMenu listener
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
      className="bg-surface-1 flex h-full flex-col border-r border-border"
      aria-label="Primary navigation"
    >
      {/* Brand + ⌘K */}
      <BrandRow
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
        onLinkClick={onLinkClick}
        onJump={handleJump}
      />

      {/* Optional company hint (admin viewing a client's portal) */}
      {companyName ? (
        <div className="border-t border-border px-4 py-2">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {companyName}
          </p>
        </div>
      ) : null}

      {/* Sectioned nav */}
      <nav
        className="flex-1 space-y-5 overflow-y-auto border-t border-border px-3 pb-4 pt-4"
        aria-label="Primary"
      >
        {sectionedPages.map((section) => (
          <div key={section.id}>
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((p) => (
                <NavItem
                  key={p.id}
                  page={p}
                  isActive={isActivePage(p)}
                  disabled={isGated && p.id !== 'today' && p.id !== 'portal'}
                  badge={p.id === 'chat' ? unread : undefined}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — clock pill + identity strip */}
      <div className="space-y-3 border-t border-border p-4">
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
  const [now, setNow] = useState(() => new Date());

  // Mobile-only: subtle ticker so the mobile launcher could surface time later.
  // Kept minimal to avoid wasting renders.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

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
              data-mobile-time={formatDate(now, 'HH:mm')}
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
