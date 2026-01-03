'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Folder,
  Calendar,
  Building2,
  Settings,
  User,
  Users,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/sidebar-provider';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Documents', href: '/documents', icon: FileText },
];

const bottomNav = [{ name: 'Settings', href: '/settings', icon: Settings }];

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
        'flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors',
        isActive
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">{item.name}</span>
    </Link>
  );
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border/50 px-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={onLinkClick}>
          <Image src="/logo.webp" alt="Qualia" width={24} height={24} className="rounded" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Qualia</span>
            <span className="text-[10px] text-muted-foreground">Solutions</span>
          </div>
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

      {/* Bottom Section */}
      <div className="space-y-1 border-t border-border/50 p-3">
        {bottomNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);

          return <NavLink key={item.name} item={item} isActive={isActive} onClick={onLinkClick} />;
        })}

        {/* Profile */}
        <Link
          href="/settings"
          onClick={onLinkClick}
          className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
            <User className="h-3 w-3" />
          </div>
          <span className="font-medium">Profile</span>
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isMobileOpen, toggleMobile } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);

  const handleLinkClick = () => {
    if (isMobileOpen) {
      toggleMobile();
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'hidden h-full flex-shrink-0 border-r border-border/50 bg-background transition-[width] duration-200 ease-out md:block',
          isHovered ? 'w-52' : 'w-52'
        )}
      >
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
