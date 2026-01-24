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
  Info,
  HelpCircle,
  Settings,
  BookOpen,
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
  { name: 'Guides', href: '/guides', icon: BookOpen },
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
        'group relative flex h-10 items-center gap-3 overflow-hidden rounded-xl px-4 text-sm transition-all duration-300',
        isActive
          ? 'bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(var(--primary),0.05)]'
          : 'text-muted-foreground/70 hover:bg-white/5 hover:text-foreground'
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/4 h-1/2 w-1 rounded-r-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
      )}
      <item.icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110',
          isActive ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-foreground'
        )}
      />
      <span className="font-semibold tracking-tight">{item.name}</span>
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
            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
            'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/30'
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-medium text-primary">Q</span>
            </div>
            <span className="truncate text-xs font-medium">Account</span>
          </div>
          <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-48">
        <DropdownMenuItem onClick={() => handleMenuItemClick('/settings')}>
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleMenuItemClick('/about')}>
          <Info className="h-4 w-4" />
          About
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuItemClick('/how-it-works')}>
          <HelpCircle className="h-4 w-4" />
          How it Works
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
      <div className="flex h-20 items-center px-6">
        <Link href="/" className="group flex items-center" onClick={onLinkClick}>
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-foreground p-[1px] shadow-glow-sm transition-transform group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-background">
              <Image
                src="/logo.webp"
                alt="Qualia"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>
          </div>
          <span className="ml-3 text-lg font-bold tracking-tighter text-foreground transition-colors group-hover:text-primary">
            QUALIA
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return <NavLink key={item.name} item={item} isActive={isActive} onClick={onLinkClick} />;
        })}
      </nav>

      {/* Ask AI + User Menu */}
      <div className="space-y-2 border-t border-border/50 p-3">
        <SidebarAI />
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
      <aside className="hidden h-full w-60 flex-shrink-0 border-r border-white/5 bg-background md:block">
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
