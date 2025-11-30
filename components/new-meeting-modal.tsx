"use client";

import { useState, useEffect } from "react";
import { Plus, CalendarIcon, Clock } from "lucide-react";
import { format, setHours, setMinutes, addMinutes } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { createMeeting, getProjects, getClients } from "@/app/actions";

// Time slots in 30-minute increments
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const display = `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
    return { value: time, label: display };
});

// Common meeting durations
const DURATION_OPTIONS = [
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1.5 hours" },
    { value: 120, label: "2 hours" },
];

interface Project {
    id: string;
    name: string;
}

interface Client {
    id: string;
    display_name: string;
    lead_status: string;
}

export function NewMeetingModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [meetingType, setMeetingType] = useState<"internal" | "client">("internal");

    // Modern time picker state
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string>("09:00");
    const [duration, setDuration] = useState<number>(60);

    useEffect(() => {
        if (open) {
            getProjects().then(setProjects);
            getClients().then((data) => setClients(data as Client[]));
            // Set default date to today
            setSelectedDate(new Date());
        }
    }, [open]);

    // Calculate start and end times for the form
    const getStartDateTime = () => {
        if (!selectedDate) return "";
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const dateWithTime = setMinutes(setHours(selectedDate, hours), minutes);
        return dateWithTime.toISOString();
    };

    const getEndDateTime = () => {
        if (!selectedDate) return "";
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const dateWithTime = setMinutes(setHours(selectedDate, hours), minutes);
        const endTime = addMinutes(dateWithTime, duration);
        return endTime.toISOString();
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const form = e.currentTarget;
        const formData = new FormData(form);

        // Add computed datetime values
        formData.set("start_time", getStartDateTime());
        formData.set("end_time", getEndDateTime());

        const result = await createMeeting(formData);

        if (result.success) {
            setOpen(false);
            // Reset form state
            setSelectedDate(new Date());
            setSelectedTime("09:00");
            setDuration(60);
        } else {
            setError(result.error || "Failed to create meeting");
        }

        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-qualia-600 hover:bg-qualia-500">
                    <Plus className="w-4 h-4" />
                    <span>New Meeting</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Schedule Meeting</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Sprint Planning"
                            required
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

                    {/* Modern Date & Time Selection */}
                    <div className="space-y-3">
                        <Label>When</Label>
                        <div className="flex flex-col gap-3">
                            {/* Date Picker */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal bg-background border-border",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        initialFocus
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Time & Duration Row */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Time Selector */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="justify-start text-left font-normal bg-background border-border"
                                        >
                                            <Clock className="mr-2 h-4 w-4" />
                                            {TIME_SLOTS.find(t => t.value === selectedTime)?.label || selectedTime}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-0 bg-card border-border" align="start">
                                        <div className="max-h-64 overflow-y-auto p-1">
                                            {TIME_SLOTS.map((slot) => (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    onClick={() => setSelectedTime(slot.value)}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                                        selectedTime === slot.value
                                                            ? "bg-qualia-600 text-white"
                                                            : "hover:bg-accent"
                                                    )}
                                                >
                                                    {slot.label}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Duration Selector */}
                                <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                                    <SelectTrigger className="bg-background border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        {DURATION_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value.toString()}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Time Summary */}
                            {selectedDate && (
                                <p className="text-xs text-muted-foreground pl-1">
                                    {TIME_SLOTS.find(t => t.value === selectedTime)?.label} - {(() => {
                                        const [hours, mins] = selectedTime.split(":").map(Number);
                                        const endDate = addMinutes(setMinutes(setHours(new Date(), hours), mins), duration);
                                        return format(endDate, "h:mm a");
                                    })()}
                                </p>
                            )}
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
                            <Label>Client *</Label>
                            <Select name="client_id">
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.display_name}
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                ({client.lead_status.replace("_", " ")})
                                            </span>
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
                            onClick={() => setOpen(false)}
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
