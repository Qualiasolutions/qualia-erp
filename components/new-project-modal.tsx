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
import { createProject, getTeams } from "@/app/actions";

const PROJECT_STATUSES = ["Demos", "Active", "Launched", "Delayed", "Archived", "Canceled"];

interface Team {
    id: string;
    name: string;
    key: string;
}

export function NewProjectModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        if (open) {
            getTeams().then(setTeams);
        }
    }, [open]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        const result = await createProject(formData);

        if (result.success) {
            setOpen(false);
        } else {
            setError(result.error || "Failed to create project");
        }

        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-qualia-600 hover:bg-qualia-500">
                    <Plus className="w-4 h-4" />
                    <span>New Project</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1C1C1C] border-[#2C2C2C] text-white">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name *</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="My Project"
                            required
                            className="bg-[#141414] border-[#2C2C2C]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Describe the project..."
                            className="bg-[#141414] border-[#2C2C2C] min-h-[100px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Team *</Label>
                            <Select name="team_id" required>
                                <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                    <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1C1C1C] border-[#2C2C2C]">
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name} ({team.key})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select name="status" defaultValue="Active">
                                <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1C1C1C] border-[#2C2C2C]">
                                    {PROJECT_STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="target_date">Target Date</Label>
                        <Input
                            id="target_date"
                            name="target_date"
                            type="date"
                            className="bg-[#141414] border-[#2C2C2C]"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-qualia-600 hover:bg-qualia-500"
                        >
                            {loading ? "Creating..." : "Create Project"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
