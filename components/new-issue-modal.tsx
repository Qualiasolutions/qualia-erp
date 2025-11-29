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
import { createIssue, getTeams, getProjects } from "@/app/actions";

const ISSUE_STATUSES = ["Backlog", "Todo", "In Progress", "Done", "Canceled"];
const ISSUE_PRIORITIES = ["No Priority", "Urgent", "High", "Medium", "Low"];

interface Team {
    id: string;
    name: string;
    key: string;
}

interface Project {
    id: string;
    name: string;
}

export function NewIssueModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        if (open) {
            getTeams().then(setTeams);
            getProjects().then(setProjects);
        }
    }, [open]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        const result = await createIssue(formData);

        if (result.success) {
            setOpen(false);
        } else {
            setError(result.error || "Failed to create issue");
        }

        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-qualia-600 hover:bg-qualia-500">
                    <Plus className="w-4 h-4" />
                    <span>New Issue</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1C1C1C] border-[#2C2C2C] text-white">
                <DialogHeader>
                    <DialogTitle>Create New Issue</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Issue title"
                            required
                            className="bg-[#141414] border-[#2C2C2C]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Describe the issue..."
                            className="bg-[#141414] border-[#2C2C2C] min-h-[100px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select name="status" defaultValue="Backlog">
                                <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1C1C1C] border-[#2C2C2C]">
                                    {ISSUE_STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select name="priority" defaultValue="No Priority">
                                <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1C1C1C] border-[#2C2C2C]">
                                    {ISSUE_PRIORITIES.map((priority) => (
                                        <SelectItem key={priority} value={priority}>
                                            {priority}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Team</Label>
                            <Select name="team_id">
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
                            <Label>Project</Label>
                            <Select name="project_id">
                                <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1C1C1C] border-[#2C2C2C]">
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
                            {loading ? "Creating..." : "Create Issue"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
