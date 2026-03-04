'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Folder,
  Lightbulb,
  Receipt,
  HelpCircle,
  UserCog,
  LogOut,
  ChevronUp,
  Menu,
  ArrowLeft,
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

const portalNav = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard, exact: true },
  { name: 'Projects', href: '/portal/projects', icon: Folder },
  { name: 'Requests', href: '/portal/requests', icon: Lightbulb },
  { name: 'Invoices', href: '/portal/invoices', icon: Receipt },
  { name: 'Support', href: '/portal/support', icon: HelpCircle },
  { name: 'Account', href: '/portal/account', icon: UserCog },
];

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
  item: (typeof portalNav)[0];
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-200 ease-premium',
        isActive
          ? 'bg-qualia-600/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
      )}
    >
      <item.icon
        className={cn(
          'h-[18px] w-[18px] flex-shrink-0 transition-all duration-200 ease-premium',
          isActive
            ? 'text-qualia-600'
            : 'text-muted-foreground/60 group-hover:text-muted-foreground'
        )}
      />
      <span>{item.name}</span>
      {isActive && (
        <span className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-qualia-600" />
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
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-200 ease-premium',
            'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-qualia-600/30'
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-qualia-600/10">
            <span className="text-xs font-semibold text-qualia-600">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[13px] font-medium">{displayName}</span>
          </div>
          <ChevronUp className="ml-auto h-3 w-3 shrink-0 opacity-30" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{displayEmail}</p>
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
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
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

  const isActive = (item: (typeof portalNav)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-card to-card/95">
      {/* Logo */}
      <div className="relative flex h-[60px] items-center border-b border-border/50 px-4">
        <Link href="/portal" className="group flex items-center gap-2.5" onClick={onLinkClick}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-qualia-600">
            <span className="text-sm font-bold text-white">Q</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Qualia</span>
            <span className="text-[10px] text-muted-foreground/70">Client Portal</span>
          </div>
        </Link>
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      </div>

      {/* Admin banner */}
      {isAdminViewing && (
        <div className="mx-3 mt-3 rounded-md border border-qualia-200 bg-qualia-50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full bg-qualia-100 px-1.5 py-0.5 text-[10px] font-medium text-qualia-800">
              Admin
            </span>
            <span className="text-qualia-600">Preview mode</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 pt-4">
        {portalNav.map((item) => (
          <NavLink key={item.name} item={item} isActive={isActive(item)} onClick={onLinkClick} />
        ))}
      </nav>

      {/* Bottom — user menu */}
      <div className="border-t border-border/50 px-3 py-2.5">
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
      {/* Mobile trigger — rendered in the header area on mobile */}
      <div className="fixed left-0 top-0 z-40 flex h-14 items-center px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted/50">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent {...props} onLinkClick={handleLinkClick} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-56 flex-shrink-0 border-r border-border/40 bg-card md:block">
        <SidebarContent {...props} onLinkClick={handleLinkClick} />
      </aside>
    </>
  );
}
