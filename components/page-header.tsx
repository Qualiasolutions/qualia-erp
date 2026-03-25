'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/sidebar-provider';
import { type ReactNode } from 'react';

interface PageHeaderProps {
  /** Icon element rendered inside the icon container */
  icon: ReactNode;
  /** Background color class for the icon container, e.g. "bg-emerald-500/10" */
  iconBg?: string;
  /** Page title */
  title: string;
  /** Right-side action slot */
  children?: ReactNode;
  /** Additional className for the outer <header> */
  className?: string;
}

/**
 * Shared page header with a mobile hamburger menu trigger.
 * Replaces inline <header> tags across all main pages.
 *
 * Mobile: shows hamburger button (md:hidden) + icon + title + actions
 * Desktop: hides hamburger, shows icon + title + actions
 */
export function PageHeader({ icon, iconBg, title, children, className }: PageHeaderProps) {
  const { toggleMobile } = useSidebar();

  return (
    <header
      className={`flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2.5">
        {/* Hamburger — mobile only, 44×44 touch target */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mr-1 min-h-[44px] min-w-[44px] md:hidden"
          onClick={toggleMobile}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Icon badge */}
        {iconBg ? (
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
            {icon}
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            {icon}
          </div>
        )}

        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      </div>

      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
