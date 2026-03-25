'use client';

import Link from 'next/link';
import { Settings, Menu } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { Button } from '@/components/ui/button';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';

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
      <NotificationPanel />

      {/* Settings */}
      <Link
        href="/settings"
        className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-primary/10 hover:text-primary dark:hover:text-primary"
        title="Settings"
      >
        <Settings className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
      </Link>

      {/* Theme */}
      <ThemeSwitcher />
    </>
  );
}
