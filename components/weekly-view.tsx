'use client';

import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, isSameDay, parseISO, differenceInMinutes, setHours, setMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Meeting {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    location?: string | null;
    project: {
        id: string;
        name: string;
    } | null;
}

interface WeeklyViewProps {
    meetings: Meeting[];
}

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 7; // 7 AM
const END_HOUR = 21; // 9 PM

export function WeeklyView({ meetings }: WeeklyViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

    const meetingsByDate = useMemo(() => {
        const map = new Map<string, Meeting[]>();
        meetings.forEach(meeting => {
            const dateKey = format(new Date(meeting.start_time), 'yyyy-MM-dd');
            const existing = map.get(dateKey) || [];
            map.set(dateKey, [...existing, meeting]);
        });
        return map;
    }, [meetings]);

    const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const getMeetingPosition = (meeting: Meeting) => {
        const start = parseISO(meeting.start_time);
        const end = parseISO(meeting.end_time);
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();

        const topOffset = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
        const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

        return { top: Math.max(0, topOffset), height: Math.max(30, height) };
    };

    const formatWeekRange = () => {
        const startMonth = format(weekStart, 'MMM');
        const endMonth = format(weekEnd, 'MMM');
        const startDay = format(weekStart, 'd');
        const endDay = format(weekEnd, 'd');
        const year = format(weekEnd, 'yyyy');

        if (startMonth === endMonth) {
            return `${startMonth} ${startDay} - ${endDay}, ${year}`;
        }
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    };

    return (
        <div className="surface rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <h2 className="text-sm font-semibold text-foreground">
                    {formatWeekRange()}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={goToPreviousWeek}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goToNextWeek}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card/50">
                <div className="p-2" /> {/* Time column header */}
                {days.map(day => {
                    const isCurrentDay = isToday(day);
                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "p-2 text-center border-l border-border",
                                isCurrentDay && "bg-primary/5"
                            )}
                        >
                            <div className="text-xs text-muted-foreground">
                                {format(day, 'EEE')}
                            </div>
                            <div className={cn(
                                "text-lg font-semibold mt-0.5",
                                isCurrentDay ? "text-primary" : "text-foreground"
                            )}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto max-h-[600px]">
                {/* Time labels */}
                <div className="relative">
                    {hours.map(hour => (
                        <div
                            key={hour}
                            className="h-[60px] border-b border-border/50 pr-2 text-right"
                        >
                            <span className="text-[10px] text-muted-foreground relative -top-2">
                                {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Day columns */}
                {days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayMeetings = meetingsByDate.get(dateKey) || [];
                    const isCurrentDay = isToday(day);

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "relative border-l border-border",
                                isCurrentDay && "bg-primary/[0.02]"
                            )}
                        >
                            {/* Hour grid lines */}
                            {hours.map(hour => (
                                <div
                                    key={hour}
                                    className="h-[60px] border-b border-border/50"
                                />
                            ))}

                            {/* Current time indicator */}
                            {isCurrentDay && (
                                <div
                                    className="absolute left-0 right-0 border-t-2 border-red-500 z-20"
                                    style={{
                                        top: `${((new Date().getHours() * 60 + new Date().getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`
                                    }}
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-500 -mt-1 -ml-1" />
                                </div>
                            )}

                            {/* Meetings */}
                            {dayMeetings.map(meeting => {
                                const { top, height } = getMeetingPosition(meeting);
                                const startTime = parseISO(meeting.start_time);
                                const endTime = parseISO(meeting.end_time);

                                // Skip if outside visible hours
                                if (startTime.getHours() >= END_HOUR || endTime.getHours() < START_HOUR) {
                                    return null;
                                }

                                return (
                                    <div
                                        key={meeting.id}
                                        className="absolute left-1 right-1 z-10 rounded-md bg-primary/20 border border-primary/30 p-1.5 overflow-hidden cursor-pointer hover:bg-primary/30 transition-colors group"
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                        title={`${meeting.title}\n${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`}
                                    >
                                        <div className="text-[11px] font-medium text-foreground truncate">
                                            {meeting.title}
                                        </div>
                                        {height > 40 && (
                                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                                                <Clock className="w-2.5 h-2.5" />
                                                <span>{format(startTime, 'h:mm a')}</span>
                                            </div>
                                        )}
                                        {height > 60 && meeting.project && (
                                            <div className="mt-1 text-[10px] text-primary/80 truncate">
                                                {meeting.project.name}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
