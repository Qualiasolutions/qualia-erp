'use client';

import * as React from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
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
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Productivity Tools</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
          <FocusTimerWidget />
          <QuickNotesWidget />
        </div>
      )}
    </div>
  );
}
