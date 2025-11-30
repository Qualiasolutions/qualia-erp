'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutGrid,
    ListTodo,
    Settings,
    Folder,
    Calendar,
    Building2,
    ChevronLeft,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useSidebar } from '@/components/sidebar-provider';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutGrid },
    { name: 'Issues', href: '/issues', icon: ListTodo },
    { name: 'Projects', href: '/projects', icon: Folder },
    { name: 'Clients', href: '/clients', icon: Building2 },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
];

const bottomNav = [
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();

    return (
        <aside
            className={cn(
                "flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-out",
                isCollapsed ? "w-[68px]" : "w-60"
            )}
        >
            {/* Logo */}
            <div className={cn(
                "flex items-center h-14 border-b border-border",
                isCollapsed ? "justify-center px-3" : "px-4"
            )}>
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="relative flex-shrink-0">
                        <Image
                            src="/logo.webp"
                            alt="Qualia"
                            width={28}
                            height={28}
                            className="rounded-lg transition-transform duration-200 group-hover:scale-105"
                        />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground tracking-tight">
                                Qualia
                            </span>
                            <span className="text-[10px] text-muted-foreground -mt-0.5">
                                Internal Suite
                            </span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Workspace Selector */}
            {!isCollapsed && (
                <div className="px-3 py-3 border-b border-border">
                    <WorkspaceSelector />
                </div>
            )}

            {/* Main Navigation */}
            <nav className={cn("flex-1 py-3", isCollapsed ? "px-2" : "px-3")}>
                <div className="space-y-0.5">
                    {navigation.map((item, index) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={cn(
                                    "flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 slide-in",
                                    isCollapsed
                                        ? "justify-center h-10 w-10 mx-auto"
                                        : "px-2.5 h-9",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                                )}
                                style={{ animationDelay: `${index * 30}ms` }}
                            >
                                <item.icon className={cn(
                                    "flex-shrink-0 transition-colors duration-200",
                                    isCollapsed ? "w-[18px] h-[18px]" : "w-4 h-4",
                                    isActive && "text-primary"
                                )} />
                                {!isCollapsed && (
                                    <span>{item.name}</span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* AI Assistant Card */}
            {!isCollapsed && (
                <div className="px-3 pb-2">
                    <div className="rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-3">
                        <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-md bg-primary/15">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground">AI Assistant</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Ask anything about your projects
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed AI Icon */}
            {isCollapsed && (
                <div className="px-2 pb-2 flex justify-center">
                    <button
                        className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 transition-colors hover:bg-primary/15"
                        title="AI Assistant"
                    >
                        <Sparkles className="w-4 h-4 text-primary" />
                    </button>
                </div>
            )}

            {/* Bottom Navigation */}
            <div className={cn(
                "border-t border-border py-2",
                isCollapsed ? "px-2" : "px-3"
            )}>
                {bottomNav.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={isCollapsed ? item.name : undefined}
                            className={cn(
                                "flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                                isCollapsed
                                    ? "justify-center h-10 w-10 mx-auto"
                                    : "px-2.5 h-9",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                            )}
                        >
                            <item.icon className={cn(
                                "flex-shrink-0",
                                isCollapsed ? "w-[18px] h-[18px]" : "w-4 h-4"
                            )} />
                            {!isCollapsed && <span>{item.name}</span>}
                        </Link>
                    );
                })}
            </div>

            {/* Collapse Toggle */}
            <div className={cn(
                "border-t border-border py-2",
                isCollapsed ? "px-2" : "px-3"
            )}>
                <button
                    onClick={toggleSidebar}
                    className={cn(
                        "flex items-center gap-2 rounded-lg text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-secondary/80",
                        isCollapsed
                            ? "justify-center h-10 w-10 mx-auto"
                            : "px-2.5 h-9 w-full"
                    )}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4" />
                            <span>Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
