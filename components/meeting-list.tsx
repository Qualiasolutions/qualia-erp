'use client';

import { format } from "date-fns";
import { Calendar, Clock, User, Folder, Trash2 } from "lucide-react";
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
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-foreground font-medium">No meetings scheduled</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
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

    return (
        <div className="space-y-4">
            {meetings.map((meeting, index) => {
                const startDate = new Date(meeting.start_time);
                const endDate = new Date(meeting.end_time);
                const isPast = endDate < new Date();

                return (
                    <div
                        key={meeting.id}
                        className={cn(
                            "group relative glass-card rounded-xl p-4 transition-all duration-300 hover:border-qualia-500/30 animate-slide-in",
                            isPast && "opacity-60 grayscale-[0.5]"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                {/* Date Box */}
                                <div className={cn(
                                    "flex flex-col items-center justify-center w-14 h-14 rounded-lg border",
                                    isPast 
                                        ? "bg-white/[0.03] border-white/[0.06] text-muted-foreground"
                                        : "bg-qualia-500/10 border-qualia-500/20 text-qualia-400"
                                )}>
                                    <span className="text-xs font-medium uppercase">{format(startDate, 'MMM')}</span>
                                    <span className="text-xl font-bold">{format(startDate, 'd')}</span>
                                </div>

                                <div>
                                    <h3 className="text-base font-semibold text-foreground group-hover:text-qualia-400 transition-colors">
                                        {meeting.title}
                                    </h3>
                                    {meeting.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                            {meeting.description}
                                        </p>
                                    )}
                                    
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                                {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                                            </span>
                                        </div>
                                        {meeting.project && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                                                <Folder className="w-3 h-3" />
                                                <span>{meeting.project.name}</span>
                                            </div>
                                        )}
                                        {meeting.creator && (
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />
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
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                                title="Delete meeting"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
