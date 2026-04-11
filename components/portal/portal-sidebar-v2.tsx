'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
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
  ArrowLeftRight,
  Eye,
} from 'lucide-react';
import { ViewAsDialog } from '@/components/portal/view-as-dialog';
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

/* ------------------------------------------------------------------ */
/* Navigation items                                                    */
/* ------------------------------------------------------------------ */

interface NavItemDef {
  name: string;
  href: string | null;
  icon: typeof House;
  exact?: boolean;
  comingSoon?: boolean;
}

const navItems: NavItemDef[] = [
  { name: 'Home', href: '/portal', icon: House, exact: true },
  { name: 'Projects', href: '/portal/projects', icon: FolderKanban },
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { name: 'Files', href: '/portal/files', icon: FileStack },
  { name: 'Billing', href: '/portal/billing', icon: Receipt },
  { name: 'Requests', href: '/portal/requests', icon: Lightbulb },
  { name: 'Settings', href: '/portal/settings', icon: Settings },
];

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface PortalSidebarV2Props {
  displayName: string;
  displayEmail: string;
  isAdminViewing: boolean;
  companyName?: string | null;
  userId?: string;
  userRole?: string | null;
  /** The real (admin) user's role — used to show view-as option */
  realUserRole?: string | null;
  /** Whether the admin is currently impersonating another user via view-as */
  isViewingAs?: boolean;
}

/* ------------------------------------------------------------------ */
/* NavLink                                                             */
/* ------------------------------------------------------------------ */

function NavLink({
  item,
  isActive,
  onClick,
  badge,
  workspaceId,
  workspaceName,
}: {
  item: NavItemDef;
  isActive: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
  workspaceId?: string | null;
  workspaceName?: string | null;
}) {
  // Append workspace query params to nav links when workspace is active
  const href = item.href
    ? workspaceId
      ? (() => {
          const params = new URLSearchParams();
          params.set('workspace', workspaceId);
          if (workspaceName) params.set('wname', workspaceName);
          return `${item.href}?${params.toString()}`;
        })()
      : item.href
    : null;

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

  if (item.comingSoon || !href) {
    return (
      <div className={cn(baseClasses, 'cursor-default opacity-70')} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={baseClasses}>
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
  realUserRole,
  onLinkClick,
}: {
  displayName: string;
  displayEmail: string;
  isAdminViewing: boolean;
  realUserRole?: string | null;
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

  const canViewAs = realUserRole === 'admin';

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
          {canViewAs && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  setViewAsOpen(true);
                }}
              >
                <Eye className="h-4 w-4" />
                View as...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {isAdminViewing && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  onLinkClick?.();
                  router.push('/portal');
                }}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Switch workspace
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

      {canViewAs && <ViewAsDialog open={viewAsOpen} onOpenChange={setViewAsOpen} />}
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
  userRole,
  realUserRole,
  onLinkClick,
}: PortalSidebarV2Props & { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceId = isAdminViewing ? searchParams.get('workspace') : null;
  const workspaceName = isAdminViewing ? searchParams.get('wname') || companyName : null;
  const { total } = useUnreadMessageCount(userId ?? null);

  const isActive = (item: NavItemDef) => {
    if (!item.href) return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const unreadBadge =
    total > 0 ? (
      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
        {total > 99 ? '99+' : total}
      </span>
    ) : null;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Company branding area */}
      <div className="flex items-center gap-2.5 border-b border-border/30 px-5 py-4">
        <Link href="/portal" className="group flex items-center gap-2.5" onClick={onLinkClick}>
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md transition-transform duration-150 group-hover:scale-105">
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-bold tracking-[0.08em] text-foreground">QUALIA</span>
            <span className="text-[10px] font-medium tracking-[0.3em] text-muted-foreground">
              SUITE
            </span>
          </div>
        </Link>
      </div>

      {/* Workspace indicator (admin viewing a client) */}
      {workspaceId && workspaceName && (
        <div className="border-b border-border/30 px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
                Workspace
              </p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-foreground">
                {workspaceName}
              </p>
            </div>
            <Link
              href="/portal"
              onClick={onLinkClick}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                'text-muted-foreground transition-colors duration-150',
                'hover:bg-muted/50 hover:text-foreground',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                'cursor-pointer'
              )}
              title="Switch workspace"
              aria-label="Switch workspace"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Company name (client view, no workspace) */}
      {!workspaceId && companyName && (
        <div className="px-5 pb-3 pt-2.5">
          <p className="truncate text-[11px] font-medium tracking-[0.06em] text-muted-foreground/60">
            {companyName}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-4" aria-label="Portal navigation">
        {navItems
          .filter((item) => {
            // Billing: admin/manager only
            if (item.name === 'Billing') return userRole === 'admin' || userRole === 'manager';
            // Requests: hide from employees (they can't create/view requests)
            if (item.name === 'Requests') return userRole !== 'employee';
            return true;
          })
          .map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={isActive(item)}
              onClick={onLinkClick}
              badge={item.name === 'Messages' ? unreadBadge : undefined}
              workspaceId={workspaceId}
              workspaceName={workspaceName}
            />
          ))}
      </nav>

      {/* User area at bottom */}
      <div className="border-t border-border/30 bg-primary/[0.02] px-3 py-3 backdrop-blur-sm">
        <UserMenu
          displayName={displayName}
          displayEmail={displayEmail}
          isAdminViewing={isAdminViewing}
          realUserRole={realUserRole}
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
