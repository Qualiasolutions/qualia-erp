'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/sidebar-provider';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
 * Mobile: shows hamburger button (md:hidden) + icon + title + actions.
 * Desktop: sidebar already marks the current route, so the visible header
 * collapses to actions only; the page title remains in the DOM for a11y.
 */
export function PageHeader({ icon, iconBg, title, children, className }: PageHeaderProps) {
  const { toggleMobile } = useSidebar();
  const hasActions = Boolean(children);

  return (
    <header
      className={cn(
        'page-header flex items-center justify-between gap-3',
        !hasActions && 'md:sr-only md:absolute md:h-px md:w-px md:overflow-hidden md:p-0',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2.5',
          hasActions && 'md:sr-only md:absolute md:h-px md:w-px md:overflow-hidden'
        )}
      >
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
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}

        <h1 className="text-base font-semibold text-foreground sm:text-lg">{title}</h1>
      </div>

      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </header>
  );
}
