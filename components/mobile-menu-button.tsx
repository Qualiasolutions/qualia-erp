'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/sidebar-provider';

/**
 * Minimal mobile-only hamburger button for use inside server-rendered page headers
 * that have their own back-button or custom layout (detail pages, etc.)
 */
export function MobileMenuButton() {
  const { toggleMobile } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="min-h-[44px] min-w-[44px] md:hidden"
      onClick={toggleMobile}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
