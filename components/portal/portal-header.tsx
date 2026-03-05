'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, ChevronRight, LogOut } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

interface PortalHeaderProps {
  user: User;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role?: string | null;
  } | null;
  isAdminViewing?: boolean;
}

const routeLabels: Record<string, string> = {
  '/portal': 'Dashboard',
  '/portal/projects': 'Projects',
  '/portal/messages': 'Messages',
  '/portal/requests': 'Requests',
  '/portal/billing': 'Billing',
};

export function PortalHeader({ user, profile, isAdminViewing }: PortalHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email;

  // Build breadcrumbs from pathname
  const breadcrumbs: Array<{ label: string; href: string }> = [];
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 1) {
    // Always show "Portal" as root
    breadcrumbs.push({ label: 'Portal', href: '/portal' });
  }
  if (segments.length >= 2 && segments[1] !== '') {
    const route = `/${segments.slice(0, 2).join('/')}`;
    const label = routeLabels[route] || segments[1].charAt(0).toUpperCase() + segments[1].slice(1);
    breadcrumbs.push({ label, href: route });
  }
  if (segments.length >= 3) {
    // Dynamic segment (project detail, etc.) — show as "..."
    breadcrumbs.push({ label: '...', href: pathname });
  }

  return (
    <header className="shrink-0 border-b border-border/40 bg-card/50 backdrop-blur-sm">
      {/* Admin banner */}
      {isAdminViewing && (
        <div className="border-b border-qualia-200 bg-qualia-50 px-4 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-qualia-700">
              <span className="inline-flex items-center rounded-full bg-qualia-100 px-1.5 py-0.5 text-[10px] font-medium text-qualia-800">
                Admin
              </span>
              <span className="text-qualia-600">Preview mode</span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1 text-xs font-medium text-qualia-700 transition-colors hover:text-qualia-900"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Admin
            </Link>
          </div>
        </div>
      )}

      <div className="flex h-12 items-center justify-between px-4 md:px-6">
        {/* Breadcrumbs */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-foreground">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Mobile: just show current page title */}
        <span className="text-sm font-medium text-foreground md:hidden">
          {breadcrumbs[breadcrumbs.length - 1]?.label || 'Portal'}
        </span>

        {/* Right side: theme toggle + user menu */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                  'text-muted-foreground hover:bg-muted/50',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-qualia-600/30'
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-qualia-100">
                  <span className="text-xs font-semibold text-qualia-700">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden text-sm font-medium text-foreground sm:block">
                  {displayName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground/80">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdminViewing && (
                <>
                  <DropdownMenuItem onClick={() => router.push('/')}>
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
        </div>
      </div>
    </header>
  );
}
