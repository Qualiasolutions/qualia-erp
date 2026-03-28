'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Folder,
  Lightbulb,
  Receipt,
  LogOut,
  ChevronUp,
  Menu,
  Settings,
} from 'lucide-react';
import Image from 'next/image';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';

const mainNav = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard, exact: true },
  { name: 'Projects', href: '/portal/projects', icon: Folder },
];

const manageNav = [
  { name: 'Requests', href: '/portal/requests', icon: Lightbulb },
  { name: 'Billing', href: '/portal/billing', icon: Receipt },
  { name: 'Settings', href: '/portal/settings', icon: Settings },
];

type NavItem = (typeof mainNav)[0];

interface PortalSidebarProps {
  displayName: string;
  displayEmail: string;
  isAdminViewing?: boolean;
  companyName?: string | null;
}

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-primary/[0.06] text-foreground dark:bg-primary/[0.10]'
          : 'text-muted-foreground hover:bg-primary/[0.04] hover:text-foreground'
      )}
    >
      <item.icon
        className={cn(
          'h-[15px] w-[15px] flex-shrink-0 transition-colors duration-150',
          isActive
            ? 'text-primary dark:text-primary'
            : 'text-muted-foreground/60 group-hover:text-muted-foreground'
        )}
        strokeWidth={isActive ? 2 : 1.75}
      />
      <span>{item.name}</span>
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}
    </Link>
  );
}

function UserMenu({
  displayName,
  displayEmail,
  isAdminViewing,
  onLinkClick,
}: {
  displayName: string;
  displayEmail: string;
  isAdminViewing?: boolean;
  onLinkClick?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
            'hover:bg-primary/[0.04]',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/30'
          )}
        >
          <div className="to-primary/8 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/20 dark:text-primary">
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
                onLinkClick?.();
                router.push('/');
              }}
            >
              Exit preview
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
  );
}

function SidebarContent({
  displayName,
  displayEmail,
  isAdminViewing,
  companyName,
  onLinkClick,
}: PortalSidebarProps & { onLinkClick?: () => void }) {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if ('exact' in item && item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <div className="flex h-full flex-col bg-[#EDF0F0] dark:bg-[#121819]">
      {/* Logo area */}
      <div className="flex h-[60px] items-center border-b border-border/30 px-5">
        <Link href="/portal" className="group flex items-center gap-2.5" onClick={onLinkClick}>
          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md transition-transform duration-150 group-hover:scale-105">
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
              priority
            />
          </div>
          <span className="text-[13px] font-bold tracking-[0.08em] text-foreground">QUALIA</span>
        </Link>
      </div>
      {companyName && (
        <div className="-mt-1 px-5 pb-4 pt-3">
          <p className="truncate text-[11px] font-medium tracking-[0.06em] text-muted-foreground/60">
            {companyName}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 space-y-5 px-3 pt-3">
        <nav className="space-y-0.5">
          {mainNav.map((item) => (
            <NavLink key={item.name} item={item} isActive={isActive(item)} onClick={onLinkClick} />
          ))}
        </nav>

        <div>
          <div className="mb-1.5 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/40">
              Manage
            </p>
          </div>
          <nav className="space-y-0.5">
            {manageNav.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                isActive={isActive(item)}
                onClick={onLinkClick}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* User — glass-effect bottom bar with ThemeSwitcher integrated */}
      <div className="border-t border-primary/10 bg-primary/[0.02] px-3 py-3 backdrop-blur-sm dark:border-primary/15">
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

export function PortalSidebar(props: PortalSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile trigger — 44px minimum touch target */}
      <div className="fixed left-0 top-0 z-40 flex h-14 items-center px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2.5 text-muted-foreground hover:bg-primary/[0.06]">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <SidebarContent {...props} onLinkClick={handleLinkClick} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-[220px] flex-shrink-0 border-r border-border md:block">
        <SidebarContent {...props} onLinkClick={handleLinkClick} />
      </aside>
    </>
  );
}
