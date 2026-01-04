'use client';

import { memo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AssignmentHighlightProps {
  isHighlighted: boolean;
  onSeen?: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper that adds a highlight animation for newly assigned tasks
 * Auto-clears after 5 seconds or on click
 */
export const AssignmentHighlight = memo(function AssignmentHighlight({
  isHighlighted,
  onSeen,
  children,
  className,
}: AssignmentHighlightProps) {
  const [visible, setVisible] = useState(isHighlighted);

  useEffect(() => {
    if (isHighlighted) {
      setVisible(true);
      // Auto-clear after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        onSeen?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, onSeen]);

  const handleClick = () => {
    if (visible) {
      setVisible(false);
      onSeen?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'transition-all duration-500',
        visible && 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-background',
        className
      )}
    >
      {children}
    </div>
  );
});
