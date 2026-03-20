'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, CalendarRange, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface ScheduleViewToggleProps {
  currentView: string;
}

// Timezone constants
const TIMEZONE_CYPRUS = 'Europe/Nicosia';
const TIMEZONE_JORDAN = 'Asia/Amman';

export function ScheduleViewToggle({ currentView }: ScheduleViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [timezone, setTimezone] = useState(TIMEZONE_CYPRUS);

  // Load timezone from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('preferred_timezone');
    if (stored && (stored === TIMEZONE_CYPRUS || stored === TIMEZONE_JORDAN)) {
      setTimezone(stored);
    }
  }, []);

  const toggleTimezone = () => {
    const newTz = timezone === TIMEZONE_CYPRUS ? TIMEZONE_JORDAN : TIMEZONE_CYPRUS;
    setTimezone(newTz);
    localStorage.setItem('preferred_timezone', newTz);
    // Trigger re-render of calendar views
    window.dispatchEvent(new Event('timezone-change'));
  };

  const setView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`/schedule?${params.toString()}`);
  };

  const views = [
    { id: 'week', label: 'Week', icon: CalendarRange },
    { id: 'month', label: 'Month', icon: CalendarDays },
  ];

  const isCyprus = timezone === TIMEZONE_CYPRUS;

  return (
    <div className="flex items-center gap-3">
      {/* Timezone Toggle */}
      <button
        onClick={toggleTimezone}
        className={cn(
          'group relative flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all duration-300',
          isCyprus
            ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 hover:border-sky-500/50 dark:text-sky-400'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:border-amber-500/50 dark:text-amber-400'
        )}
        title={`Switch to ${isCyprus ? 'Jordan' : 'Cyprus'} time`}
      >
        {isCyprus ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isCyprus ? 'Cyprus' : 'Jordan'}</span>
        <span className="text-[11px] font-normal opacity-70">
          {isCyprus ? '(Fawzi)' : '(Moayad)'}
        </span>
      </button>

      {/* View Toggle */}
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
    </div>
  );
}
