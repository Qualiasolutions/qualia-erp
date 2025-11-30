"use client";

import { useState, useEffect } from "react";
import { Plus, Briefcase, User, CheckCircle, PauseCircle, Zap } from "lucide-react";
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
import { useWorkspace } from "@/components/workspace-provider";
import { cn } from "@/lib/utils";

const PROJECT_STATUSES = ["Demos", "Active", "Launched", "Delayed", "Archived", "Canceled"];

const PROJECT_GROUPS = [
    {
        id: 'salman_kuwait',
        label: 'Salman - Kuwait',
        icon: Briefcase,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
    },
    {
        id: 'tasos_kyriakides',
        label: 'Tasos Kyriakides',
        icon: User,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
    },
    {
        id: 'active',
        label: 'Active Projects',
        icon: Zap,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
    },
    {
        id: 'finished',
        label: 'Finished Projects',
        icon: CheckCircle,
        color: 'text-qualia-400',
        bgColor: 'bg-qualia-500/10',
        borderColor: 'border-qualia-500/30',
    },
    {
        id: 'inactive',
        label: 'Inactive Projects',
        icon: PauseCircle,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
    },
];

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
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const { currentWorkspace } = useWorkspace();

    useEffect(() => {
        if (open && currentWorkspace) {
            // Fetch teams for current workspace
            getTeams(currentWorkspace.id).then(setTeams);
            // Reset group selection when dialog opens
            setSelectedGroup(null);
        }
    }, [open, currentWorkspace]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        // Validate project group is selected
        if (!selectedGroup) {
            setError("Please select a project group");
            setLoading(false);
            return;
        }

        // Add workspace_id and project_group to form data
        if (currentWorkspace) {
            formData.set("workspace_id", currentWorkspace.id);
        }
        formData.set("project_group", selectedGroup);

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
            <DialogContent className="bg-card border-border text-foreground">
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
                            className="bg-background border-border"
                        />
                    </div>

                    {/* Project Group Selection */}
                    <div className="space-y-2">
                        <Label>Project Group *</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {PROJECT_GROUPS.map((group) => {
                                const Icon = group.icon;
                                const isSelected = selectedGroup === group.id;
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => setSelectedGroup(group.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all duration-200 border text-left",
                                            isSelected
                                                ? `${group.bgColor} ${group.color} ${group.borderColor}`
                                                : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {group.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Describe the project..."
                            className="bg-background border-border min-h-[100px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Team *</Label>
                            <Select name="team_id" required>
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
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
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
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
                            className="bg-background border-border"
                        />
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
                            {loading ? "Creating..." : "Create Project"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
