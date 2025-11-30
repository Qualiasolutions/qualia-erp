'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { format, isSameDay, addDays, subDays, startOfDay, isToday, addMinutes, setHours, setMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Folder, User, Building2, Trash2, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteMeeting, createMeeting, getProjects, getClients } from '@/app/actions';
import { useTransition } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    client?: {
        id: string;
        display_name: string;
        lead_status: string;
    } | null;
    creator: {
        id: string;
        full_name: string | null;
        email: string | null;
    } | null;
    attendees?: {
        id?: string;
        profile: {
            id: string;
            full_name: string | null;
            email: string | null;
            avatar_url: string | null;
        } | null;
    }[];
}

interface Project {
    id: string;
    name: string;
}

interface Client {
    id: string;
    display_name: string;
    lead_status: string;
}

interface DayScheduleViewProps {
    meetings: Meeting[];
}

// Time slots from 9am to 9pm
const START_HOUR = 9;
const END_HOUR = 21; // 9pm
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const HOUR_HEIGHT = 80; // pixels per hour

// Meeting colors based on type
const MEETING_COLORS = [
    { bg: 'bg-qualia-500/20', border: 'border-qualia-500/40', text: 'text-qualia-300', hover: 'hover:bg-qualia-500/30' },
    { bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-300', hover: 'hover:bg-violet-500/30' },
    { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300', hover: 'hover:bg-amber-500/30' },
    { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300', hover: 'hover:bg-emerald-500/30' },
    { bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-300', hover: 'hover:bg-rose-500/30' },
    { bg: 'bg-sky-500/20', border: 'border-sky-500/40', text: 'text-sky-300', hover: 'hover:bg-sky-500/30' },
];

function getColorForMeeting(index: number) {
    return MEETING_COLORS[index % MEETING_COLORS.length];
}

function QuickMeetingModal({
    open,
    onOpenChange,
    defaultStartTime,
    defaultEndTime,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultStartTime: Date;
    defaultEndTime: Date;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [meetingType, setMeetingType] = useState<"internal" | "client">("internal");

    useEffect(() => {
        if (open) {
            getProjects().then(setProjects);
            getClients().then((data) => setClients(data as Client[]));
        }
    }, [open]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        const result = await createMeeting(formData);

        if (result.success) {
            onOpenChange(false);
        } else {
            setError(result.error || "Failed to create meeting");
        }

        setLoading(false);
    }

    // Format for datetime-local input
    const formatForInput = (date: Date) => {
        return format(date, "yyyy-MM-dd'T'HH:mm");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Quick Schedule</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Meeting title"
                            required
                            autoFocus
                            className="bg-background border-border"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Meeting agenda..."
                            className="bg-background border-border min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_time">Start Time *</Label>
                            <Input
                                id="start_time"
                                name="start_time"
                                type="datetime-local"
                                required
                                defaultValue={formatForInput(defaultStartTime)}
                                className="bg-background border-border"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_time">End Time *</Label>
                            <Input
                                id="end_time"
                                name="end_time"
                                type="datetime-local"
                                required
                                defaultValue={formatForInput(defaultEndTime)}
                                className="bg-background border-border"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Meeting Type</Label>
                        <Select
                            value={meetingType}
                            onValueChange={(v) => setMeetingType(v as "internal" | "client")}
                        >
                            <SelectTrigger className="bg-background border-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="internal">Internal Meeting</SelectItem>
                                <SelectItem value="client">Client Meeting</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {meetingType === "client" && (
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Select name="client_id">
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Project (Optional)</Label>
                        <Select name="project_id">
                            <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-qualia-600 hover:bg-qualia-500"
                        >
                            {loading ? "Scheduling..." : "Schedule"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MeetingBlock({
    meeting,
    dayStart,
    colorIndex,
    onDelete,
}: {
    meeting: Meeting;
    dayStart: Date;
    colorIndex: number;
    onDelete: (id: string) => void;
}) {
    const [showDetails, setShowDetails] = useState(false);
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(meeting.end_time);

    // Calculate position and height
    const startMinutes = (startTime.getHours() - START_HOUR) * 60 + startTime.getMinutes();
    const endMinutes = (endTime.getHours() - START_HOUR) * 60 + endTime.getMinutes();
    const durationMinutes = endMinutes - startMinutes;

    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 30); // Minimum 30px height

    const color = getColorForMeeting(colorIndex);
    const isCompact = height < 60;

    const durationHours = durationMinutes / 60;
    const durationText = durationHours >= 1
        ? `${durationHours % 1 === 0 ? durationHours : durationHours.toFixed(1)}h`
        : `${durationMinutes}m`;

    return (
        <>
            <div
                className={cn(
                    "absolute left-1 right-1 rounded-lg border-l-4 px-3 py-2 cursor-pointer transition-all duration-200 group overflow-hidden",
                    color.bg,
                    color.border,
                    color.hover,
                    "hover:shadow-lg hover:scale-[1.02] hover:z-20"
                )}
                style={{
                    top: `${top}px`,
                    height: `${height}px`,
                }}
                onClick={() => setShowDetails(true)}
            >
                <div className={cn("flex flex-col h-full", isCompact ? "gap-0" : "gap-1")}>
                    <div className="flex items-start justify-between">
                        <h4 className={cn(
                            "font-medium truncate",
                            color.text,
                            isCompact ? "text-xs" : "text-sm"
                        )}>
                            {meeting.title}
                        </h4>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(meeting.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-red-400"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>

                    {!isCompact && (
                        <>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                    {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                </span>
                                <span className={cn("px-1.5 py-0.5 rounded text-[10px]", color.bg, color.text)}>
                                    {durationText}
                                </span>
                            </div>

                            {meeting.project && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
                                    <Folder className="w-3 h-3" />
                                    <span className="truncate">{meeting.project.name}</span>
                                </div>
                            )}

                            {meeting.client && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Building2 className="w-3 h-3" />
                                    <span className="truncate">{meeting.client.display_name}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Meeting Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="bg-card border-border text-foreground sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className={color.text}>{meeting.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                                {format(startTime, 'EEEE, MMM d')} &middot; {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded text-xs", color.bg, color.text)}>
                                {durationText}
                            </span>
                        </div>

                        {meeting.description && (
                            <div className="text-sm text-muted-foreground">
                                {meeting.description}
                            </div>
                        )}

                        {meeting.project && (
                            <div className="flex items-center gap-2 text-sm">
                                <Folder className="w-4 h-4 text-muted-foreground" />
                                <span>{meeting.project.name}</span>
                            </div>
                        )}

                        {meeting.client && (
                            <div className="flex items-center gap-2 text-sm">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                <span>{meeting.client.display_name}</span>
                            </div>
                        )}

                        {meeting.creator && (
                            <div className="flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>Created by {meeting.creator.full_name || meeting.creator.email}</span>
                            </div>
                        )}

                        {meeting.attendees && meeting.attendees.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Attendees</div>
                                <div className="flex flex-wrap gap-2">
                                    {meeting.attendees.map((attendee, idx) => (
                                        <div
                                            key={attendee.id || `attendee-${idx}`}
                                            className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.05] text-xs"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-qualia-500/20 flex items-center justify-center text-[10px] text-qualia-400">
                                                {(attendee.profile?.full_name || attendee.profile?.email || '?')[0].toUpperCase()}
                                            </div>
                                            <span>{attendee.profile?.full_name || attendee.profile?.email}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-border">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    onDelete(meeting.id);
                                    setShowDetails(false);
                                }}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Meeting
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CurrentTimeLine() {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Only show if within schedule hours
    if (currentHour < START_HOUR || currentHour > END_HOUR) return null;

    const top = ((currentHour - START_HOUR) * 60 + currentMinute) / 60 * HOUR_HEIGHT;

    return (
        <div
            className="absolute left-0 right-0 z-30 pointer-events-none"
            style={{ top: `${top}px` }}
        >
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <div className="flex-1 h-[2px] bg-red-500/70" />
            </div>
        </div>
    );
}

export function DayScheduleView({ meetings }: DayScheduleViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isPending, startTransition] = useTransition();
    const [quickMeetingOpen, setQuickMeetingOpen] = useState(false);
    const [quickMeetingStart, setQuickMeetingStart] = useState(new Date());
    const [quickMeetingEnd, setQuickMeetingEnd] = useState(new Date());
    const scheduleRef = useRef<HTMLDivElement>(null);

    // Filter meetings for the current day
    const dayMeetings = useMemo(() => {
        return meetings.filter(meeting =>
            isSameDay(new Date(meeting.start_time), currentDate)
        ).sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
    }, [meetings, currentDate]);

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this meeting?")) {
            startTransition(async () => {
                await deleteMeeting(id);
            });
        }
    };

    const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
    const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Handle click on time slot to create meeting
    const handleTimeSlotClick = (hour: number, e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const minuteOffset = Math.floor((clickY / HOUR_HEIGHT) * 60);
        const roundedMinutes = Math.round(minuteOffset / 15) * 15; // Round to nearest 15 minutes

        const startTime = setMinutes(setHours(startOfDay(currentDate), hour), roundedMinutes % 60);
        const endTime = addMinutes(startTime, 60); // Default 1 hour meeting

        setQuickMeetingStart(startTime);
        setQuickMeetingEnd(endTime);
        setQuickMeetingOpen(true);
    };

    // Scroll to current time on mount
    useEffect(() => {
        if (scheduleRef.current && isToday(currentDate)) {
            const now = new Date();
            const currentHour = now.getHours();
            if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
                const scrollTop = ((currentHour - START_HOUR - 1) * HOUR_HEIGHT);
                scheduleRef.current.scrollTop = Math.max(0, scrollTop);
            }
        }
    }, [currentDate]);

    const isCurrentDay = isToday(currentDate);

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-foreground">
                        {format(currentDate, 'EEEE')}
                    </h2>
                    <div className={cn(
                        "px-3 py-1 rounded-lg text-sm font-medium",
                        isCurrentDay
                            ? "bg-qualia-500/20 text-qualia-400 border border-qualia-500/30"
                            : "bg-white/[0.05] text-muted-foreground"
                    )}>
                        {format(currentDate, 'MMM d, yyyy')}
                    </div>
                    {dayMeetings.length > 0 && (
                        <div className="px-2 py-0.5 rounded-full text-xs bg-white/[0.05] text-muted-foreground">
                            {dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                            isCurrentDay
                                ? "bg-qualia-500/20 text-qualia-400"
                                : "bg-white/[0.05] hover:bg-white/[0.1] text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Today
                    </button>
                    <button
                        onClick={goToPreviousDay}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNextDay}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Schedule Grid */}
            <div
                ref={scheduleRef}
                className="overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
                <div className="relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
                    {/* Time labels and hour lines */}
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="absolute left-0 right-0 border-t border-border/50"
                            style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
                        >
                            <div className="absolute -top-3 left-2 text-xs text-muted-foreground w-14">
                                {format(setHours(new Date(), hour), 'h a')}
                            </div>
                        </div>
                    ))}

                    {/* Half-hour lines */}
                    {HOURS.slice(0, -1).map((hour) => (
                        <div
                            key={`${hour}-30`}
                            className="absolute left-16 right-0 border-t border-border/20 border-dashed"
                            style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                        />
                    ))}

                    {/* Clickable time slots */}
                    <div className="absolute left-16 right-4 top-0 bottom-0">
                        {HOURS.slice(0, -1).map((hour) => (
                            <div
                                key={`slot-${hour}`}
                                className="absolute left-0 right-0 cursor-pointer group/slot"
                                style={{
                                    top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`,
                                    height: `${HOUR_HEIGHT}px`
                                }}
                                onClick={(e) => handleTimeSlotClick(hour, e)}
                            >
                                <div className="absolute inset-0 rounded-lg opacity-0 group-hover/slot:opacity-100 transition-opacity bg-qualia-500/5 border border-dashed border-qualia-500/20 flex items-center justify-center">
                                    <div className="flex items-center gap-1 text-xs text-qualia-400 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                                        <Plus className="w-3 h-3" />
                                        <span>Add meeting</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Current time indicator */}
                    {isCurrentDay && <CurrentTimeLine />}

                    {/* Meeting blocks */}
                    <div className="absolute left-16 right-4 top-0 bottom-0">
                        {dayMeetings.map((meeting, index) => (
                            <MeetingBlock
                                key={meeting.id}
                                meeting={meeting}
                                dayStart={startOfDay(currentDate)}
                                colorIndex={index}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {dayMeetings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                        <Clock className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-foreground font-medium">No meetings scheduled</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                        Click on a time slot to schedule a meeting
                    </p>
                </div>
            )}

            {/* Quick Meeting Modal */}
            <QuickMeetingModal
                open={quickMeetingOpen}
                onOpenChange={setQuickMeetingOpen}
                defaultStartTime={quickMeetingStart}
                defaultEndTime={quickMeetingEnd}
            />
        </div>
    );
}
