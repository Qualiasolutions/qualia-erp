'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Folder,
  Lightbulb,
  Receipt,
  MessageSquare,
  LogOut,
  ChevronUp,
  Menu,
  Settings,
} from 'lucide-react';
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
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
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
        'group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-foreground/[0.06] text-foreground'
          : 'text-muted-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground'
      )}
    >
      <item.icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors duration-150',
          isActive
            ? 'text-qualia-600'
            : 'text-muted-foreground/50 group-hover:text-muted-foreground'
        )}
      />
      <span>{item.name}</span>
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-qualia-600" />
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
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150',
            'text-muted-foreground hover:bg-foreground/[0.04]',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-qualia-600/30'
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-qualia-600 text-[11px] font-semibold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">{displayName}</p>
            <p className="truncate text-[11px] text-muted-foreground/60">{displayEmail}</p>
          </div>
          <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground/30" />
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
  onLinkClick,
}: PortalSidebarProps & { onLinkClick?: () => void }) {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if ('exact' in item && item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Link href="/portal" className="flex items-center gap-2.5" onClick={onLinkClick}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-qualia-600">
            <span className="text-xs font-bold text-white">Q</span>
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-foreground">Qualia</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-6 px-3 pt-2">
        <nav className="space-y-0.5">
          {mainNav.map((item) => (
            <NavLink key={item.name} item={item} isActive={isActive(item)} onClick={onLinkClick} />
          ))}
        </nav>

        <div>
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
            Manage
          </p>
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

      {/* User */}
      <div className="border-t border-border/30 px-3 py-2">
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
      {/* Mobile trigger */}
      <div className="fixed left-0 top-0 z-40 flex h-14 items-center px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <SidebarContent {...props} onLinkClick={handleLinkClick} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-52 flex-shrink-0 border-r border-border/30 md:block">
        <SidebarContent {...props} onLinkClick={handleLinkClick} />
      </aside>
    </>
  );
}
