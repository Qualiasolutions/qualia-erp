'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import {
  Search,
  Plus,
  Settings,
  LayoutGrid,
  Folder,
  Building2,
  Calendar,
  Kanban,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 pt-[20vh] backdrop-blur-sm">
      <Command className="w-full max-w-[640px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center border-b border-border px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
          <Command.Input
            placeholder="Type a command or search..."
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group
            heading="Navigation"
            className="mb-2 px-2 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Command.Item
              onSelect={() => runCommand(() => router.push('/'))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/board'))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Kanban className="mr-2 h-4 w-4" />
              <span>Board</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/projects'))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Folder className="mr-2 h-4 w-4" />
              <span>Projects</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/clients'))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span>Clients</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/schedule'))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>Schedule</span>
            </Command.Item>
          </Command.Group>

          <Command.Group
            heading="Actions"
            className="mb-2 px-2 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Command.Item
              onSelect={() => runCommand(() => router.push('/projects'))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>Create New Project</span>
            </Command.Item>
          </Command.Group>

          <Command.Group
            heading="Settings"
            className="mb-2 px-2 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Command.Item
              onSelect={() => runCommand(() => router.push('/settings'))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
