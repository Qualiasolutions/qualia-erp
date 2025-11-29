'use client';

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Circle,
    CheckCircle2,
    SignalHigh,
    SignalMedium,
    SignalLow,
    MoreHorizontal,
    Trash2,
    Save,
    MessageSquare,
    User,
    Folder,
    Users,
    Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getIssueById,
    updateIssue,
    deleteIssue,
    createComment,
    getTeams,
    getProjects,
    getProfiles,
} from "@/app/actions";

const STATUSES = ["Backlog", "Todo", "In Progress", "Done", "Canceled"];
const PRIORITIES = ["No Priority", "Urgent", "High", "Medium", "Low"];

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
}

interface Comment {
    id: string;
    body: string;
    created_at: string;
    user: Profile | null;
}

interface Issue {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
    assignee: Profile | null;
    creator: Profile | null;
    project: { id: string; name: string } | null;
    team: { id: string; name: string; key: string } | null;
    comments: Comment[];
}

const PriorityIcon = ({ priority }: { priority: string }) => {
    switch (priority) {
        case 'Urgent': return <SignalHigh className="w-4 h-4 text-red-500" />;
        case 'High': return <SignalHigh className="w-4 h-4 text-orange-500" />;
        case 'Medium': return <SignalMedium className="w-4 h-4 text-yellow-500" />;
        case 'Low': return <SignalLow className="w-4 h-4 text-gray-500" />;
        default: return <MoreHorizontal className="w-4 h-4 text-gray-600" />;
    }
};

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'Done': return <CheckCircle2 className="w-4 h-4 text-qualia-500" />;
        case 'In Progress': return <Circle className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />;
        case 'Canceled': return <Circle className="w-4 h-4 text-red-500" />;
        default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
};

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

export function IssueDetailClient() {
    const params = useParams();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const id = params.id as string;

    const [issue, setIssue] = useState<Issue | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const [assigneeId, setAssigneeId] = useState<string | null>(null);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);

    // Options for selects
    const [teams, setTeams] = useState<{ id: string; name: string; key: string }[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);

    // Comment state
    const [newComment, setNewComment] = useState("");
    const [addingComment, setAddingComment] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const [issueData, teamsData, projectsData, profilesData] = await Promise.all([
                getIssueById(id),
                getTeams(),
                getProjects(),
                getProfiles(),
            ]);

            if (issueData) {
                setIssue(issueData as Issue);
                setTitle(issueData.title);
                setDescription(issueData.description || "");
                setStatus(issueData.status);
                setPriority(issueData.priority);
                setAssigneeId(issueData.assignee?.id || null);
                setTeamId(issueData.team?.id || null);
                setProjectId(issueData.project?.id || null);
            } else {
                setError("Issue not found");
            }

            setTeams(teamsData);
            setProjects(projectsData);
            setProfiles(profilesData as Profile[]);
            setLoading(false);
        }
        loadData();
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        const formData = new FormData();
        formData.set("id", id);
        formData.set("title", title);
        formData.set("description", description);
        formData.set("status", status);
        formData.set("priority", priority);
        if (assigneeId) formData.set("assignee_id", assigneeId);
        if (teamId) formData.set("team_id", teamId);
        if (projectId) formData.set("project_id", projectId);

        const result = await updateIssue(formData);
        if (result.success) {
            // Refresh issue data
            const updatedIssue = await getIssueById(id);
            if (updatedIssue) setIssue(updatedIssue as Issue);
        } else {
            setError(result.error || "Failed to update issue");
        }

        setSaving(false);
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this issue?")) return;

        startTransition(async () => {
            const result = await deleteIssue(id);
            if (result.success) {
                router.push("/issues");
            } else {
                setError(result.error || "Failed to delete issue");
            }
        });
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        setAddingComment(true);
        const formData = new FormData();
        formData.set("issue_id", id);
        formData.set("body", newComment);

        const result = await createComment(formData);
        if (result.success) {
            setNewComment("");
            // Refresh issue data to get new comment
            const updatedIssue = await getIssueById(id);
            if (updatedIssue) setIssue(updatedIssue as Issue);
        } else {
            setError(result.error || "Failed to add comment");
        }

        setAddingComment(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full">
                <header className="flex items-center gap-4 px-6 py-4 border-b border-[#2C2C2C] bg-[#141414]">
                    <div className="w-32 h-6 bg-[#2C2C2C] rounded animate-pulse" />
                </header>
                <div className="flex-1 p-6">
                    <div className="max-w-4xl space-y-6">
                        <div className="h-8 bg-[#2C2C2C] rounded w-1/2 animate-pulse" />
                        <div className="h-32 bg-[#2C2C2C] rounded animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (error && !issue) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-gray-500">
                <p>{error}</p>
                <Link href="/issues" className="text-qualia-400 hover:underline mt-2">
                    Back to Issues
                </Link>
            </div>
        );
    }

    if (!issue) return null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-[#2C2C2C] bg-[#141414]">
                <div className="flex items-center gap-4">
                    <Link href="/issues" className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <StatusIcon status={status} />
                        <span className="text-xs font-mono text-gray-500">{id.slice(0, 8)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-qualia-600 hover:bg-qualia-500"
                    >
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </header>

            {error && (
                <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Title */}
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-xl font-semibold bg-transparent border-0 px-0 focus-visible:ring-0 text-white placeholder:text-gray-500"
                                placeholder="Issue title"
                            />

                            {/* Description */}
                            <div>
                                <label className="text-xs text-gray-500 mb-2 block">Description</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="min-h-[150px] bg-[#1C1C1C] border-[#2C2C2C] text-gray-200"
                                    placeholder="Add a description..."
                                />
                            </div>

                            {/* Comments Section */}
                            <div className="border-t border-[#2C2C2C] pt-6">
                                <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2 mb-4">
                                    <MessageSquare className="w-4 h-4" />
                                    Comments ({issue.comments.length})
                                </h3>

                                {/* Comment List */}
                                <div className="space-y-4 mb-4">
                                    {issue.comments.length === 0 ? (
                                        <p className="text-sm text-gray-500">No comments yet</p>
                                    ) : (
                                        issue.comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-qualia-900 flex items-center justify-center text-xs text-qualia-200 shrink-0">
                                                    {comment.user?.full_name?.[0]?.toUpperCase() || comment.user?.email?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-medium text-gray-200">
                                                            {comment.user?.full_name || comment.user?.email?.split('@')[0] || 'Unknown'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatTimeAgo(comment.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-400">{comment.body}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Add Comment */}
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#2C2C2C] flex items-center justify-center text-xs text-gray-400 shrink-0">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <Textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Add a comment..."
                                            className="bg-[#1C1C1C] border-[#2C2C2C] text-gray-200 min-h-[80px]"
                                        />
                                        <div className="flex justify-end mt-2">
                                            <Button
                                                size="sm"
                                                onClick={handleAddComment}
                                                disabled={addingComment || !newComment.trim()}
                                                className="bg-qualia-600 hover:bg-qualia-500"
                                            >
                                                {addingComment ? "Adding..." : "Add Comment"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 space-y-4">
                                {/* Status */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
                                        <StatusIcon status={status} />
                                        Status
                                    </label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUSES.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
                                        <PriorityIcon priority={priority} />
                                        Priority
                                    </label>
                                    <Select value={priority} onValueChange={setPriority}>
                                        <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRIORITIES.map((p) => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Assignee */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        Assignee
                                    </label>
                                    <Select value={assigneeId || "unassigned"} onValueChange={(v) => setAssigneeId(v === "unassigned" ? null : v)}>
                                        <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {profiles.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.full_name || p.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Team */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Team
                                    </label>
                                    <Select value={teamId || "none"} onValueChange={(v) => setTeamId(v === "none" ? null : v)}>
                                        <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                            <SelectValue placeholder="No team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No team</SelectItem>
                                            {teams.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name} ({t.key})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Project */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
                                        <Folder className="w-3 h-3" />
                                        Project
                                    </label>
                                    <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? null : v)}>
                                        <SelectTrigger className="bg-[#141414] border-[#2C2C2C]">
                                            <SelectValue placeholder="No project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No project</SelectItem>
                                            {projects.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 space-y-3 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    Created {formatTimeAgo(issue.created_at)}
                                </div>
                                {issue.creator && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-3 h-3" />
                                        By {issue.creator.full_name || issue.creator.email}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    Updated {formatTimeAgo(issue.updated_at)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
