'use client';

import { format } from "date-fns";
import { Calendar, Clock, User, Folder, Trash2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteMeeting } from "@/app/actions";
import { useTransition } from "react";

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
    creator: {
        id: string;
        full_name: string | null;
        email: string | null;
    } | null;
}

export function MeetingList({ meetings }: { meetings: Meeting[] }) {
    const [isPending, startTransition] = useTransition();

    if (meetings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="p-4 rounded-xl bg-muted mb-4">
                    <Inbox className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No meetings scheduled</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Schedule a new meeting to get started
                </p>
            </div>
        );
    }

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this meeting?")) {
            startTransition(async () => {
                await deleteMeeting(id);
            });
        }
    };

    // Group meetings by date
    const groupedMeetings = meetings.reduce((groups, meeting) => {
        const date = format(new Date(meeting.start_time), 'yyyy-MM-dd');
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(meeting);
        return groups;
    }, {} as Record<string, Meeting[]>);

    // Sort dates
    const sortedDates = Object.keys(groupedMeetings).sort();

    return (
        <div className="space-y-6">
            {sortedDates.map((date) => {
                const dateObj = new Date(date);
                const isToday = format(new Date(), 'yyyy-MM-dd') === date;
                const dayMeetings = groupedMeetings[date];

                return (
                    <div key={date}>
                        {/* Date Header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className={cn(
                                "text-sm font-medium",
                                isToday ? "text-primary" : "text-muted-foreground"
                            )}>
                                {isToday ? 'Today' : format(dateObj, 'EEEE, MMM d')}
                            </div>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">
                                {dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Meetings for this date */}
                        <div className="space-y-2">
                            {dayMeetings.map((meeting, index) => {
                                const startDate = new Date(meeting.start_time);
                                const endDate = new Date(meeting.end_time);
                                const isPast = endDate < new Date();

                                return (
                                    <div
                                        key={meeting.id}
                                        className={cn(
                                            "group relative surface rounded-lg p-4 transition-all duration-200 hover:bg-secondary/50 slide-in",
                                            isPast && "opacity-50"
                                        )}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                {/* Time Box */}
                                                <div className={cn(
                                                    "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                                                    isPast
                                                        ? "bg-muted text-muted-foreground"
                                                        : "bg-primary/10 text-primary"
                                                )}>
                                                    <span className="text-lg font-semibold">{format(startDate, 'h:mm')}</span>
                                                    <span className="text-[10px] font-medium uppercase">{format(startDate, 'a')}</span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                                        {meeting.title}
                                                    </h3>
                                                    {meeting.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                            {meeting.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>
                                                                {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                                                            </span>
                                                        </div>
                                                        {meeting.project && (
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary">
                                                                <Folder className="w-3 h-3" />
                                                                <span>{meeting.project.name}</span>
                                                            </div>
                                                        )}
                                                        {meeting.creator && (
                                                            <div className="flex items-center gap-1">
                                                                <User className="w-3 h-3" />
                                                                <span>{meeting.creator.full_name || meeting.creator.email}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDelete(meeting.id)}
                                                disabled={isPending}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                                                title="Delete meeting"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
