'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutGrid,
    ListTodo,
    Users,
    Settings,
    Plus,
    Search,
    Bell,
    HelpCircle,
    Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <div className="flex flex-col h-screen w-64 bg-[#1C1C1C] border-r border-[#2C2C2C] text-[#D4D4D4]">
            {/* Header / User / Org */}
            <div className="p-4 flex items-center justify-between border-b border-[#2C2C2C]">
                <div className="flex items-center gap-2 font-semibold text-white">
                    <Image
                        src="/logo.webp"
                        alt="Qualia Internal Suite"
                        width={24}
                        height={24}
                        className="rounded"
                    />
                    <span className="text-sm">Qualia Internal Suite</span>
                </div>
                <Bell className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer" />
            </div>

            {/* Quick Actions */}
            <div className="p-3">
                <button className="w-full flex items-center gap-2 bg-[#2C2C2C] hover:bg-[#3C3C3C] text-white px-3 py-1.5 rounded-md text-sm transition-colors border border-[#3C3C3C]">
                    <Plus className="w-4 h-4" />
                    <span>New Issue</span>
                    <span className="ml-auto text-xs text-gray-500">C</span>
                </button>
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
                                    ? "bg-[#2C2C2C] text-white"
                                    : "text-gray-400 hover:bg-[#262626] hover:text-gray-200"
                            )}
                        >
                            <item.icon className={cn("w-4 h-4", isActive ? "text-qualia-400" : "text-gray-500 group-hover:text-gray-400")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#2C2C2C]">
                <div className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 cursor-pointer">
                    <HelpCircle className="w-4 h-4" />
                    <span>Help & Feedback</span>
                </div>
            </div>
        </div>
    );
}
