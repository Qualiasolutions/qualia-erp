'use client';

import { useState } from "react";
import { Plus, Calendar, Target, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createMilestone } from "@/app/actions";

interface NewMilestoneModalProps {
    projectId: string;
    onSuccess?: () => void;
}

const PRESET_COLORS = [
    '#00A4AC', // Qualia teal
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
];

const MILESTONE_SUGGESTIONS = [
    'MVP Launch',
    'Beta Release',
    'Phase 1 Complete',
    'User Testing',
    'Production Deploy',
    'Design Complete',
    'Backend Ready',
    'Feature Freeze'
];

export function NewMilestoneModal({ projectId, onSuccess }: NewMilestoneModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData();
        formData.set("project_id", projectId);
        formData.set("name", name);
        formData.set("description", description);
        formData.set("target_date", targetDate);
        formData.set("color", color);

        const result = await createMilestone(formData);

        if (result.success) {
            setOpen(false);
            setName("");
            setDescription("");
            setTargetDate("");
            setColor(PRESET_COLORS[0]);
            onSuccess?.();
        }

        setIsLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-qualia-600 hover:bg-qualia-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Milestone
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-qualia-500" />
                            Create Milestone
                        </DialogTitle>
                        <DialogDescription>
                            Set a key checkpoint for your project
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Milestone Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., MVP Launch"
                                required
                            />
                            {/* Suggestions */}
                            <div className="flex flex-wrap gap-1">
                                {MILESTONE_SUGGESTIONS.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setName(suggestion)}
                                        className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this milestone represents..."
                                className="min-h-[80px]"
                            />
                        </div>

                        {/* Target Date */}
                        <div className="space-y-2">
                            <Label htmlFor="date" className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Target Date
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                required
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Color */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Palette className="w-3 h-3" />
                                Color
                            </Label>
                            <div className="flex gap-2">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg transition-all",
                                            color === c && "ring-2 ring-offset-2 ring-offset-background"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !name || !targetDate}
                            className="bg-qualia-600 hover:bg-qualia-700"
                        >
                            {isLoading ? "Creating..." : "Create Milestone"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

import { cn } from "@/lib/utils";