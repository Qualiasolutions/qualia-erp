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
    Folder,
    Sparkles,
    PanelLeftClose,
    PanelLeft,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useSidebar } from '@/components/sidebar-provider';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutGrid },
    { name: 'Issues', href: '/issues', icon: ListTodo },
    { name: 'Projects', href: '/projects', icon: Folder },
    { name: 'Teams', href: '/teams', icon: Users },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();

    return (
        <div
            className={cn(
                "flex flex-col h-screen bg-gradient-to-b from-card/80 to-card border-r border-white/[0.06] text-muted-foreground relative overflow-hidden transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[72px]" : "w-64"
            )}
        >
            {/* Subtle background effects */}
            <div className="absolute inset-0 bg-grid-sm opacity-30 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-qualia-500/[0.08] to-transparent pointer-events-none" />

            {/* Header / User / Org */}
            <div className={cn(
                "relative z-10 p-4 flex items-center border-b border-white/[0.06]",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                <div className={cn(
                    "flex items-center gap-3 font-semibold text-foreground",
                    isCollapsed && "justify-center"
                )}>
                    <div className="relative">
                        <Image
                            src="/logo.webp"
                            alt="Qualia Internal Suite"
                            width={28}
                            height={28}
                            className="rounded-lg"
                        />
                        <div className="absolute -inset-1 bg-qualia-500/20 blur-md rounded-lg -z-10" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="text-sm font-medium tracking-tight">Qualia</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Internal Suite</span>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button className="relative p-2 rounded-lg hover:bg-white/[0.05] transition-colors group">
                        <Bell className="w-4 h-4 text-muted-foreground group-hover:text-qualia-400 transition-colors" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-qualia-500 rounded-full animate-pulse" />
                    </button>
                )}
            </div>

            {/* Workspace Selector */}
            {!isCollapsed && (
                <div className="relative z-10 p-3">
                    <WorkspaceSelector />
                </div>
            )}

            {/* Navigation */}
            <nav className={cn(
                "relative z-10 flex-1 py-2 space-y-1",
                isCollapsed ? "px-2" : "px-3"
            )}>
                {navigation.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={isCollapsed ? item.name : undefined}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className={cn(
                                "relative flex items-center rounded-xl text-sm transition-all duration-300 group animate-slide-in",
                                isCollapsed
                                    ? "justify-center p-2.5"
                                    : "gap-3 px-3 py-2.5",
                                isActive
                                    ? "bg-gradient-to-r from-qualia-500/20 to-qualia-500/5 text-foreground border border-qualia-500/20"
                                    : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground border border-transparent"
                            )}
                        >
                            {/* Active indicator glow */}
                            {isActive && (
                                <div className="absolute inset-0 rounded-xl bg-qualia-500/10 blur-xl -z-10" />
                            )}

                            <div className={cn(
                                "relative flex items-center justify-center rounded-lg transition-all duration-300",
                                isCollapsed ? "w-10 h-10" : "w-8 h-8",
                                isActive
                                    ? "bg-qualia-500/20 shadow-glow"
                                    : "bg-white/[0.03] group-hover:bg-white/[0.06]"
                            )}>
                                <item.icon className={cn(
                                    "transition-all duration-300",
                                    isCollapsed ? "w-5 h-5" : "w-4 h-4",
                                    isActive
                                        ? "text-qualia-400"
                                        : "text-muted-foreground group-hover:text-foreground"
                                )} />
                            </div>

                            {!isCollapsed && (
                                <span className={cn(
                                    "font-medium transition-all duration-300",
                                    isActive && "text-qualia-100"
                                )}>
                                    {item.name}
                                </span>
                            )}

                            {/* Hover indicator */}
                            {!isActive && !isCollapsed && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-qualia-500 rounded-r-full transition-all duration-300 group-hover:h-4 opacity-0 group-hover:opacity-100" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* AI Badge */}
            {!isCollapsed && (
                <div className="relative z-10 mx-3 mb-3">
                    <div className="glass-card rounded-xl p-3 border-qualia-500/10">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-qualia-500/20">
                                <Sparkles className="w-4 h-4 text-qualia-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-foreground">AI Assistant</p>
                                <p className="text-[10px] text-muted-foreground">Ask anything about your work</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed AI Icon */}
            {isCollapsed && (
                <div className="relative z-10 mx-2 mb-3 flex justify-center">
                    <div className="p-2.5 rounded-xl bg-qualia-500/10 border border-qualia-500/20" title="AI Assistant">
                        <Sparkles className="w-5 h-5 text-qualia-400" />
                    </div>
                </div>
            )}

            {/* Footer with Toggle */}
            <div className="relative z-10 p-3 border-t border-white/[0.06] space-y-2">
                {!isCollapsed && (
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full px-1">
                        <HelpCircle className="w-4 h-4 group-hover:text-qualia-400 transition-colors" />
                        <span>Help & Feedback</span>
                    </button>
                )}

                {/* Collapse Toggle Button */}
                <button
                    onClick={toggleSidebar}
                    className={cn(
                        "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 group w-full rounded-lg hover:bg-white/[0.05]",
                        isCollapsed ? "justify-center p-2.5" : "px-1 py-2"
                    )}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <PanelLeft className="w-5 h-5 group-hover:text-qualia-400 transition-colors" />
                    ) : (
                        <>
                            <PanelLeftClose className="w-4 h-4 group-hover:text-qualia-400 transition-colors" />
                            <span>Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
