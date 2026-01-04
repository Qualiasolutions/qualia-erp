'use client';

import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  className?: string;
}

/**
 * Collapsible section wrapper - Things 3 inspired
 * Clean, minimal expand/collapse with smooth animation
 */
export const CollapsibleSection = memo(function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <section className={cn('', className)}>
      {/* Header - clickable to toggle */}
      <button
        onClick={toggle}
        className="group flex w-full items-center gap-2 py-2 text-left transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
          {title}
        </span>
        {badge !== undefined && (
          <span className="text-[10px] text-muted-foreground">({badge})</span>
        )}
      </button>

      {/* Content - animated collapse */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
});

export default CollapsibleSection;
