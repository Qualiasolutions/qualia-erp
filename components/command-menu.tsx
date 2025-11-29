'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { Search, Plus, User, Settings, LayoutGrid, ListTodo } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm">
            <Command className="w-full max-w-[640px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="flex items-center border-b border-border px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
                    <Command.Input
                        placeholder="Type a command or search..."
                        className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                    <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>

                    <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-2">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/'))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer aria-selected:bg-muted aria-selected:text-foreground"
                        >
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/issues'))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer aria-selected:bg-muted aria-selected:text-foreground"
                        >
                            <ListTodo className="mr-2 h-4 w-4" />
                            <span>Issues</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Actions" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-2">
                        <Command.Item
                            onSelect={() => runCommand(() => console.log('New Issue'))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer aria-selected:bg-muted aria-selected:text-foreground"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            <span>Create New Issue</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Settings" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-2">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/settings'))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer aria-selected:bg-muted aria-selected:text-foreground"
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
