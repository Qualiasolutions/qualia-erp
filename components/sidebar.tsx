'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutGrid,
    ListTodo,
    Users,
    Settings,
    Bell,
    HelpCircle,
    Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSelector } from '@/components/workspace-selector';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutGrid },
    { name: 'Issues', href: '/issues', icon: ListTodo },
    { name: 'Projects', href: '/projects', icon: Folder },
    { name: 'Teams', href: '/teams', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-screen w-64 bg-card border-r border-border text-muted-foreground">
            {/* Header / User / Org */}
            <div className="p-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Image
                        src="/logo.webp"
                        alt="Qualia Internal Suite"
                        width={24}
                        height={24}
                        className="rounded"
                    />
                    <span className="text-sm">Qualia Internal Suite</span>
                </div>
                <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
            </div>

            {/* Workspace Selector */}
            <div className="p-3">
                <WorkspaceSelector />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-2 space-y-0.5">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors group",
                                isActive
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("w-4 h-4", isActive ? "text-qualia-400" : "text-muted-foreground group-hover:text-foreground")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                    <HelpCircle className="w-4 h-4" />
                    <span>Help & Feedback</span>
                </div>
            </div>
        </div>
    );
}
