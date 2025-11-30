'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Meeting {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    project: {
        id: string;
        name: string;
    } | null;
}

interface CalendarViewProps {
    meetings: Meeting[];
    onDateSelect?: (date: Date) => void;
}

export function CalendarView({ meetings, onDateSelect }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const meetingsByDate = useMemo(() => {
        const map = new Map<string, Meeting[]>();
        meetings.forEach(meeting => {
            const dateKey = format(new Date(meeting.start_time), 'yyyy-MM-dd');
            const existing = map.get(dateKey) || [];
            map.set(dateKey, [...existing, meeting]);
        });
        return map;
    }, [meetings]);

    const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    return (
        <div className="glass-card rounded-2xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={goToPreviousMonth}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNextMonth}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div
                        key={day}
                        className="text-center text-xs font-medium text-muted-foreground py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayMeetings = meetingsByDate.get(dateKey) || [];
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isCurrentDay = isToday(day);

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => onDateSelect?.(day)}
                            className={cn(
                                "relative min-h-[80px] p-1 rounded-lg transition-all duration-200 text-left",
                                isCurrentMonth
                                    ? "hover:bg-white/[0.05]"
                                    : "opacity-40",
                                isCurrentDay && "ring-1 ring-qualia-500/50 bg-qualia-500/5"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-flex items-center justify-center w-6 h-6 text-xs rounded-full",
                                    isCurrentDay
                                        ? "bg-qualia-500 text-white font-semibold"
                                        : "text-muted-foreground"
                                )}
                            >
                                {format(day, 'd')}
                            </span>

                            {/* Meeting indicators */}
                            <div className="mt-1 space-y-0.5">
                                {dayMeetings.slice(0, 2).map(meeting => (
                                    <div
                                        key={meeting.id}
                                        className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] bg-qualia-500/20 text-qualia-300 truncate"
                                        title={meeting.title}
                                    >
                                        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span className="truncate">{meeting.title}</span>
                                    </div>
                                ))}
                                {dayMeetings.length > 2 && (
                                    <div className="text-[10px] text-muted-foreground px-1">
                                        +{dayMeetings.length - 2} more
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
