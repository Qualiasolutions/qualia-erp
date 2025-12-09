'use client';

import Link from 'next/link';
import { Bell, Settings } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function HeaderActions() {
  return (
    <>
      {/* Notifications */}
      <button
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
      </button>

      {/* Settings */}
      <Link
        href="/settings"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </Link>

      {/* Theme */}
      <ThemeSwitcher />
    </>
  );
}
