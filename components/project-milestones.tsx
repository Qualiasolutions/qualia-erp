'use client';

import { useState, useEffect } from "react";
import { Target, Plus, Calendar, MoreHorizontal, Edit2, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getMilestones, deleteMilestone, updateMilestone } from "@/app/actions";
import { NewMilestoneModal } from "./new-milestone-modal";
import { MilestoneTimeline } from "./milestone-timeline";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ProjectMilestonesProps {
    projectId: string;
}

interface Milestone {
    id: string;
    name: string;
    description: string | null;
    target_date: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
    progress: number;
    color: string;
    issues?: any[];
}

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('timeline');

    useEffect(() => {
        loadMilestones();
    }, [projectId]);

    async function loadMilestones() {
        setLoading(true);
        const data = await getMilestones(projectId);
        setMilestones(data);
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this milestone?")) return;
        const result = await deleteMilestone(id);
        if (result.success) {
            loadMilestones();
        }
    }

    async function handleUpdate(milestone: Milestone) {
        const formData = new FormData();
        formData.set("id", milestone.id);
        formData.set("name", milestone.name);
        formData.set("description", milestone.description || "");
        formData.set("target_date", milestone.target_date);
        formData.set("status", milestone.status);
        formData.set("color", milestone.color);

        const result = await updateMilestone(formData);
        if (result.success) {
            loadMilestones();
            setEditingMilestone(null);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-20 bg-muted rounded-lg animate-pulse" />
                <div className="h-20 bg-muted rounded-lg animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-qualia-500" />
                    <h3 className="text-lg font-semibold">Milestones</h3>
                    <span className="text-sm text-muted-foreground">
                        ({milestones.length})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary">
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={cn(
                                "px-2 py-1 text-xs rounded-md transition-colors",
                                viewMode === 'timeline'
                                    ? "bg-background text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Timeline
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={cn(
                                "px-2 py-1 text-xs rounded-md transition-colors",
                                viewMode === 'cards'
                                    ? "bg-background text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Cards
                        </button>
                    </div>
                    <NewMilestoneModal projectId={projectId} onSuccess={loadMilestones} />
                </div>
            </div>

            {/* Content */}
            {viewMode === 'timeline' ? (
                <MilestoneTimeline
                    milestones={milestones}
                    projectId={projectId}
                    onMilestoneClick={(m) => setSelectedMilestone(m)}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {milestones.map((milestone) => (
                        <div
                            key={milestone.id}
                            className="surface rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => setSelectedMilestone(milestone)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: milestone.color + '20' }}
                                    >
                                        <Target className="w-5 h-5" style={{ color: milestone.color }} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-foreground">{milestone.name}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            {new Date(milestone.target_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingMilestone(milestone);
                                        }}>
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(milestone.id);
                                            }}
                                            className="text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {milestone.description && (
                                <p className="text-sm text-muted-foreground mb-3">
                                    {milestone.description}
                                </p>
                            )}

                            {/* Progress bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-medium">{milestone.progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-qualia-500 to-qualia-400 rounded-full transition-all"
                                        style={{ width: `${milestone.progress}%` }}
                                    />
                                </div>
                                {milestone.issues && milestone.issues.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {milestone.issues.filter((i: any) => i.status === 'Done').length} of{' '}
                                        {milestone.issues.length} issues completed
                                    </p>
                                )}
                            </div>

                            {/* Status badge */}
                            <div className="mt-3">
                                <span className={cn(
                                    "text-xs px-2 py-1 rounded-md",
                                    milestone.status === 'completed'
                                        ? "bg-emerald-500/20 text-emerald-500"
                                        : milestone.status === 'in_progress'
                                        ? "bg-blue-500/20 text-blue-500"
                                        : milestone.status === 'delayed'
                                        ? "bg-red-500/20 text-red-500"
                                        : "bg-gray-500/20 text-gray-500"
                                )}>
                                    {milestone.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Milestone Dialog */}
            <Dialog open={!!editingMilestone} onOpenChange={() => setEditingMilestone(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Milestone</DialogTitle>
                        <DialogDescription>
                            Update milestone details
                        </DialogDescription>
                    </DialogHeader>
                    {editingMilestone && (
                        <div className="space-y-4">
                            <div>
                                <Label>Name</Label>
                                <Input
                                    value={editingMilestone.name}
                                    onChange={(e) => setEditingMilestone({
                                        ...editingMilestone,
                                        name: e.target.value
                                    })}
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    value={editingMilestone.description || ''}
                                    onChange={(e) => setEditingMilestone({
                                        ...editingMilestone,
                                        description: e.target.value
                                    })}
                                />
                            </div>
                            <div>
                                <Label>Target Date</Label>
                                <Input
                                    type="date"
                                    value={editingMilestone.target_date}
                                    onChange={(e) => setEditingMilestone({
                                        ...editingMilestone,
                                        target_date: e.target.value
                                    })}
                                />
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select
                                    value={editingMilestone.status}
                                    onValueChange={(value) => setEditingMilestone({
                                        ...editingMilestone,
                                        status: value as any
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="not_started">Not Started</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="delayed">Delayed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setEditingMilestone(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleUpdate(editingMilestone)}
                                    className="bg-qualia-600 hover:bg-qualia-700"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Milestone Detail Dialog */}
            <Dialog open={!!selectedMilestone && !editingMilestone} onOpenChange={() => setSelectedMilestone(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: selectedMilestone?.color + '20' }}
                            >
                                <Target className="w-4 h-4" style={{ color: selectedMilestone?.color }} />
                            </div>
                            {selectedMilestone?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Target: {selectedMilestone && new Date(selectedMilestone.target_date).toLocaleDateString()}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedMilestone && (
                        <div className="space-y-4">
                            {selectedMilestone.description && (
                                <p className="text-sm text-muted-foreground">
                                    {selectedMilestone.description}
                                </p>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Overall Progress</span>
                                    <span className="font-medium">{selectedMilestone.progress}%</span>
                                </div>
                                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-qualia-500 to-qualia-400 rounded-full transition-all"
                                        style={{ width: `${selectedMilestone.progress}%` }}
                                    />
                                </div>
                            </div>

                            {selectedMilestone.issues && selectedMilestone.issues.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <Link2 className="w-4 h-4" />
                                        Linked Issues ({selectedMilestone.issues.length})
                                    </h4>
                                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                        {selectedMilestone.issues.map((issue: any) => (
                                            <div
                                                key={issue.id}
                                                className="flex items-center justify-between p-2 rounded hover:bg-secondary"
                                            >
                                                <span className="text-sm">{issue.title}</span>
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 rounded",
                                                    issue.status === 'Done'
                                                        ? "bg-emerald-500/20 text-emerald-500"
                                                        : "bg-gray-500/20 text-gray-500"
                                                )}>
                                                    {issue.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { cn } from "@/lib/utils";