'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { List, CalendarDays, CalendarRange } from 'lucide-react';
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
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary">
            <button
                onClick={() => setView('list')}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    currentView === 'list'
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <List className="w-4 h-4" />
                <span>List</span>
            </button>
            <button
                onClick={() => setView('week')}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    currentView === 'week'
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <CalendarRange className="w-4 h-4" />
                <span>Week</span>
            </button>
            <button
                onClick={() => setView('calendar')}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    currentView === 'calendar'
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <CalendarDays className="w-4 h-4" />
                <span>Month</span>
            </button>
        </div>
    );
}
