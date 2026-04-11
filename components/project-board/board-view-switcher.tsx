'use client';

import React from 'react';
import { LayoutGrid, Table2, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardView } from './board-types';

interface BoardViewSwitcherProps {
  activeView: BoardView;
  onViewChange: (view: BoardView) => void;
}

const VIEW_OPTIONS: {
  id: BoardView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'list', label: 'List', icon: List },
];

export function BoardViewSwitcher({ activeView, onViewChange }: BoardViewSwitcherProps) {
  return (
    <div
      className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1"
      role="tablist"
      aria-label="Board view"
    >
      {VIEW_OPTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = activeView === id;

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label} view`}
            onClick={() => onViewChange(id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              isActive
                ? 'bg-card font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
