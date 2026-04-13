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
  ChevronUp,
  Menu,
  Shield,
  Inbox,
  Calendar,
  BookOpen,
  FlaskConical,
  Building2,
  Activity,
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
import { useUnreadMessageCount } from '@/lib/swr';
import { ViewAsDialog } from './view-as-dialog';

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

// Inbox — promoted to 2nd slot for internal users (admin/manager/employee)
const inboxItem: NavItemDef = {
  name: 'Inbox',
  href: '/inbox',
  icon: Inbox,
  appKey: 'inbox',
};

// Core apps shown after Home/Inbox (everyone sees these)
const coreApps: NavItemDef[] = [
  { name: 'Projects', href: '/projects', icon: FolderKanban, appKey: 'projects' },
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

// Internal team apps (admin, manager, employee — never shown to clients)
// Inbox is promoted above; this list holds the rest.
const internalApps: NavItemDef[] = [
  { name: 'Schedule', href: '/schedule', icon: Calendar, appKey: 'schedule' },
  { name: 'Knowledge', href: '/knowledge', icon: BookOpen, appKey: 'knowledge' },
  { name: 'Research', href: '/research', icon: FlaskConical, appKey: 'research' },
];

// Admin-only apps (admin, manager — never shown to employee or client)
const adminOnlyApps: NavItemDef[] = [
  { name: 'Clients', href: '/clients', icon: Building2, appKey: 'clients' },
  { name: 'Status', href: '/status', icon: Activity, appKey: 'status' },
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

function NavLink({
  item,
  isActive,
  onClick,
  badge,
}: {
  item: NavItemDef;
  isActive: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
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
    isActive
      ? 'border-l-2 border-primary bg-primary/[0.06] text-primary font-medium'
      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
  );

  if (item.comingSoon || !item.href) {
    return (
      <div className={cn(baseClasses, 'cursor-default opacity-70')} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link href={item.href} onClick={onClick} className={baseClasses}>
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

  const isActive = (item: NavItemDef) => {
    if (!item.href) return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  // Build role-aware nav items.
  // Order: Home → Inbox (internal only) → Projects → role extras → Settings
  const allNavItems = useMemo(() => {
    const isInternal = userRole === 'admin' || userRole === 'manager' || userRole === 'employee';

    const items: NavItemDef[] = [homeItem];

    // Inbox in 2nd slot for internal users
    if (isInternal) {
      items.push(inboxItem);
    }

    items.push(...coreApps);

    if (userRole === 'client') {
      // Clients get Messages, Files, Billing, Requests as standalone pages
      items.push(...clientPortalApps, ...clientApps);
    } else if (userRole === 'employee') {
      items.push(...internalApps);
    } else if (userRole === 'manager') {
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
          />
        ))}

        {/* Admin section — only visible to admin/manager */}
        {isAdminViewing && (
          <>
            <div className="mt-2 border-t border-border/20 pt-2">
              <NavLink
                item={{ name: 'Admin', href: '/workspace', icon: Shield, appKey: 'admin' }}
                isActive={pathname === '/workspace' || pathname.startsWith('/workspace/')}
                onClick={onLinkClick}
              />
            </div>
          </>
        )}
      </nav>

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
