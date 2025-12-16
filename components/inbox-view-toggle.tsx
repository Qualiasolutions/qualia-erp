'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InboxViewToggleProps {
  currentView: string;
}

export function InboxViewToggle({ currentView }: InboxViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`/inbox?${params.toString()}`);
  };

  const views = [
    { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { id: 'list', label: 'List', icon: List },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;
        return (
          <button
            key={view.id}
            onClick={() => setView(view.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
