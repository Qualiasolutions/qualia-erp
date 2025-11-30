"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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
import { createMeeting, getProjects } from "@/app/actions";

interface Project {
    id: string;
    name: string;
}

export function NewMeetingModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        if (open) {
            getProjects().then(setProjects);
        }
    }, [open]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

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
                <Button className="flex items-center gap-2 bg-qualia-600 hover:bg-qualia-500">
                    <Plus className="w-4 h-4" />
                    <span>New Meeting</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Schedule Meeting</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
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
                            className="bg-background border-border min-h-[100px]"
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
                                className="bg-background border-border"
                            />
                        </div>
                    </div>

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
