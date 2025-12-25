'use client';

import Link from 'next/link';
import { Bell, Settings, Menu } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { Button } from '@/components/ui/button';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';

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

      {/* Online Users Indicator */}
      <HeaderOnlineIndicator />

      {/* Notifications */}
      <button
        className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-qualia-500/10 hover:text-qualia-600 dark:hover:text-qualia-400"
        title="Notifications"
      >
        <Bell className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
      </button>

      {/* Settings */}
      <Link
        href="/settings"
        className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-qualia-500/10 hover:text-qualia-600 dark:hover:text-qualia-400"
        title="Settings"
      >
        <Settings className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
      </Link>

      {/* Theme */}
      <ThemeSwitcher />
    </>
  );
}
