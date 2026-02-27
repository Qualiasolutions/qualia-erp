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
  LogOut,
  Settings,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/sidebar-provider';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Sun },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Research', href: '/research', icon: FlaskConical },
  { name: 'Knowledge', href: '/knowledge', icon: BookOpen },
];

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: (typeof navigation)[0];
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-100',
        isActive
          ? 'bg-muted/60 text-foreground'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
      )}
    >
      <item.icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors duration-100',
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground/50 group-hover:text-muted-foreground'
        )}
      />
      <span>{item.name}</span>
    </Link>
  );
}

function UserMenu({ onLinkClick }: { onLinkClick?: () => void }) {
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
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-150',
            'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/30'
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <span className="text-xs font-semibold text-primary">Q</span>
          </div>
          <span className="truncate text-sm font-medium">Qualia</span>
          <ChevronUp className="ml-auto h-3 w-3 shrink-0 opacity-30" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-48">
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

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border/20 px-4">
        <Link href="/" className="group flex items-center gap-2.5" onClick={onLinkClick}>
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg">
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </div>
          <span className="text-[13px] font-semibold tracking-wide text-foreground/80">QUALIA</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 pt-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return <NavLink key={item.name} item={item} isActive={isActive} onClick={onLinkClick} />;
        })}
      </nav>

      {/* Bottom section — account menu */}
      <div className="border-t border-border/20 px-3 py-2.5">
        <UserMenu onLinkClick={onLinkClick} />
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isMobileOpen, toggleMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobileOpen) {
      toggleMobile();
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden h-full w-56 flex-shrink-0 border-r border-border/30 bg-background md:block">
        <SidebarContent onLinkClick={handleLinkClick} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={toggleMobile}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onLinkClick={handleLinkClick} />
        </SheetContent>
      </Sheet>
    </>
  );
}
