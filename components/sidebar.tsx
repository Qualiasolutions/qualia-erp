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
  Bot,
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
import { SidebarAI } from '@/components/sidebar-ai';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Sun },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Automations', href: '/automations', icon: Bot },
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
        'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary/8 text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-[15%] h-[70%] w-[3px] rounded-r-full bg-primary/80" />
      )}
      <item.icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors duration-200',
          isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground'
        )}
      />
      <span className="tracking-tight">{item.name}</span>
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
      <div className="flex h-16 items-center border-b border-border/40 px-5">
        <Link href="/" className="group flex items-center gap-2.5" onClick={onLinkClick}>
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/80 to-primary p-[1px] transition-transform duration-200 group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-background">
              <Image
                src="/logo.webp"
                alt="Qualia"
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
                priority
              />
            </div>
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">QUALIA</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3.5 pt-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return <NavLink key={item.name} item={item} isActive={isActive} onClick={onLinkClick} />;
        })}
      </nav>

      {/* Bottom section — single row: AI trigger + account */}
      <div className="flex items-center gap-1.5 border-t border-border/40 px-3.5 py-3">
        <SidebarAI />
        <div className="h-5 w-px bg-border/30" />
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
      <aside className="hidden h-full w-60 flex-shrink-0 border-r border-border/50 bg-card/80 md:block">
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
