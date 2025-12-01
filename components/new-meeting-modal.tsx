"use client";

import { useState, useEffect } from "react";
import { Plus, CalendarIcon, Clock, Users, Building2 } from "lucide-react";
import { format, setHours, setMinutes, addMinutes } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { createMeeting, getClients } from "@/app/actions";

// Time slots in 30-minute increments (business hours focused)
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

interface Client {
    id: string;
    display_name: string;
}

export function NewMeetingModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [meetingType, setMeetingType] = useState<"internal" | "client">("internal");
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [title, setTitle] = useState("");

    // Modern time picker state
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedTime, setSelectedTime] = useState<string>("09:00");
    const [duration, setDuration] = useState<number>(60);

    useEffect(() => {
        if (open) {
            getClients().then((data) => setClients(data as Client[]));
            // Reset form
            setSelectedDate(new Date());
            setSelectedTime("09:00");
            setDuration(60);
            setMeetingType("internal");
            setSelectedClientId("");
            setTitle("");
            setError(null);
        }
    }, [open]);

    // Auto-generate title based on meeting type
    useEffect(() => {
        if (meetingType === "internal") {
            setTitle("Internal Meeting");
        } else if (selectedClientId) {
            const client = clients.find(c => c.id === selectedClientId);
            if (client) {
                setTitle(`Meeting with ${client.display_name}`);
            }
        }
    }, [meetingType, selectedClientId, clients]);

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

        const formData = new FormData();
        formData.set("title", title);
        formData.set("start_time", getStartDateTime());
        formData.set("end_time", getEndDateTime());

        if (meetingType === "client" && selectedClientId) {
            formData.set("client_id", selectedClientId);
        }

        const result = await createMeeting(formData);

        if (result.success) {
            setOpen(false);
        } else {
            setError(result.error || "Failed to create meeting");
        }

        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4" />
                    <span>New Meeting</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="text-lg">Quick Schedule</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Meeting Type Toggle */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setMeetingType("internal")}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                                meetingType === "internal"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-muted-foreground/50"
                            )}
                        >
                            <Users className="w-4 h-4" />
                            <span className="font-medium text-sm">Internal</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMeetingType("client")}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                                meetingType === "client"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-muted-foreground/50"
                            )}
                        >
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium text-sm">Client</span>
                        </button>
                    </div>

                    {/* Client Selector (only for client meetings) */}
                    {meetingType === "client" && (
                        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger className="bg-background border-border h-11">
                                <SelectValue placeholder="Select client..." />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border max-h-[200px]">
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.display_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Date Selection */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal h-11 bg-background border-border",
                                    !selectedDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-3 h-4 w-4 text-muted-foreground" />
                                {selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Pick a date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Time & Duration */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Time */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="justify-start text-left font-normal h-11 bg-background border-border"
                                >
                                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {TIME_SLOTS.find(t => t.value === selectedTime)?.label}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-1 bg-card border-border" align="start">
                                <div className="max-h-56 overflow-y-auto">
                                    {TIME_SLOTS.filter((_, i) => i >= 14 && i <= 40).map((slot) => (
                                        <button
                                            key={slot.value}
                                            type="button"
                                            onClick={() => setSelectedTime(slot.value)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                                selectedTime === slot.value
                                                    ? "bg-primary text-primary-foreground"
                                                    : "hover:bg-accent"
                                            )}
                                        >
                                            {slot.label}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Duration */}
                        <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                            <SelectTrigger className="bg-background border-border h-11">
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

                    {/* Summary */}
                    {selectedDate && (
                        <div className="px-3 py-2.5 rounded-lg bg-secondary/50 text-sm">
                            <span className="text-muted-foreground">Scheduling: </span>
                            <span className="font-medium text-foreground">{title}</span>
                            <div className="text-xs text-muted-foreground mt-1">
                                {format(selectedDate, "EEEE, MMM d")} at {TIME_SLOTS.find(t => t.value === selectedTime)?.label}
                                {" "}({DURATION_OPTIONS.find(d => d.value === duration)?.label})
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button
                        type="submit"
                        disabled={loading || (meetingType === "client" && !selectedClientId)}
                        className="w-full h-11 bg-primary hover:bg-primary/90 font-medium"
                    >
                        {loading ? "Scheduling..." : "Schedule Meeting"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
