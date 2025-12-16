'use client';

import Link from 'next/link';
import { Bell, Settings, Menu } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { Button } from '@/components/ui/button';

export function HeaderActions() {
  const { toggleMobile } = useSidebar();

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleMobile}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

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
