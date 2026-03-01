'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft } from 'lucide-react';
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

export function PortalHeader({ user, profile, isAdminViewing }: PortalHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email;

  return (
    <header className="border-b border-neutral-200 bg-white">
      {/* Admin banner */}
      {isAdminViewing && (
        <div className="border-b border-qualia-200 bg-qualia-50 px-4 py-2">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-qualia-700">
              <span className="inline-flex items-center rounded-full bg-qualia-100 px-2 py-0.5 text-xs font-medium text-qualia-800">
                Admin Preview
              </span>
              <span className="text-qualia-600">
                You&apos;re viewing the client portal as an admin
              </span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-medium text-qualia-700 transition-colors hover:text-qualia-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Admin
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-qualia-600">
            <span className="text-base font-bold text-white">Q</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-900">Qualia</span>
            <span className="text-xs text-neutral-500">Client Portal</span>
          </div>
        </div>

        {/* User Menu */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                'text-neutral-700 hover:bg-neutral-100',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-qualia-600'
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-qualia-100">
                <span className="text-sm font-semibold text-qualia-700">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden flex-col items-start text-left sm:flex">
                <span className="text-sm font-medium text-neutral-900">{displayName}</span>
                <span className="text-xs text-neutral-500">{displayEmail}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-neutral-500">{displayEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdminViewing && (
              <>
                <DropdownMenuItem onClick={() => router.push('/')}>
                  Back to Admin Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
