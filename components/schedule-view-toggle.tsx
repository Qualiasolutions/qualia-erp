'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { List, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleViewToggleProps {
    currentView: string;
}

export function ScheduleViewToggle({ currentView }: ScheduleViewToggleProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const setView = (view: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', view);
        router.push(`/schedule?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <button
                onClick={() => setView('list')}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    currentView === 'list'
                        ? "bg-qualia-500/20 text-qualia-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                )}
            >
                <List className="w-4 h-4" />
                <span>List</span>
            </button>
            <button
                onClick={() => setView('calendar')}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    currentView === 'calendar'
                        ? "bg-qualia-500/20 text-qualia-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                )}
            >
                <CalendarDays className="w-4 h-4" />
                <span>Calendar</span>
            </button>
        </div>
    );
}
