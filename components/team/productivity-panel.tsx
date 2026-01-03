'use client';

import * as React from 'react';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FocusTimerWidget } from './focus-timer-widget';
import { QuickNotesWidget } from './quick-notes-widget';

interface ProductivityPanelProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function ProductivityPanel({ className, defaultExpanded = true }: ProductivityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card/30', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/20"
      >
        <span className="text-sm font-medium text-foreground">Tools</span>
        <ChevronRight
          className={cn(
            'h-4 w-4 text-muted-foreground/40 transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="grid gap-4 border-t border-border/40 p-4 sm:grid-cols-2">
          <FocusTimerWidget />
          <QuickNotesWidget />
        </div>
      )}
    </div>
  );
}
