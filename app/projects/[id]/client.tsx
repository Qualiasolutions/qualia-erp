'use client';

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Folder,
    Users,
    Calendar,
    Trash2,
    Save,
    User,
    Circle,
    CheckCircle2,
    SignalHigh,
    SignalMedium,
    SignalLow,
    MoreHorizontal,
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
    getProjectById,
    updateProject,
    deleteProject,
    getTeams,
    getProfiles,
} from "@/app/actions";
import { PROJECT_GROUP_LABELS, type ProjectGroup } from "@/components/project-group-tabs";
import { ProjectMilestones } from "@/components/project-milestones";

const PROJECT_GROUPS: ProjectGroup[] = ['salman_kuwait', 'tasos_kyriakides', 'other', 'active', 'demos', 'inactive'];

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
}

interface Issue {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
}

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: string;
    project_group: ProjectGroup | null;
    start_date: string | null;
    target_date: string | null;
    created_at: string;
    updated_at: string;
    lead: Profile | null;
    team: { id: string; name: string; key: string } | null;
    client: { id: string; name: string } | null;
    issues: Issue[];
    issue_stats: {
        total: number;
        done: number;
    };
}

const ProjectGroupBadge = ({ group }: { group: ProjectGroup | null }) => {
    const colors: Record<ProjectGroup, string> = {
        'salman_kuwait': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'tasos_kyriakides': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'other': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        'active': 'bg-green-500/10 text-green-400 border-green-500/20',
        'demos': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        'inactive': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };

    if (!group) return null;

    return (
        <span className={`text-xs px-2 py-0.5 rounded border ${colors[group]}`}>
            {PROJECT_GROUP_LABELS[group]}
        </span>
    );
};

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
        default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
};

function formatDate(dateString: string | null): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

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

export function ProjectDetailClient() {
    const params = useParams();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const id = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [projectGroup, setProjectGroup] = useState<ProjectGroup | null>(null);
    const [leadId, setLeadId] = useState<string | null>(null);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [targetDate, setTargetDate] = useState("");

    // Options for selects
    const [teams, setTeams] = useState<{ id: string; name: string; key: string }[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const [projectData, teamsData, profilesData] = await Promise.all([
                getProjectById(id),
                getTeams(),
                getProfiles(),
            ]);

            if (projectData) {
                setProject(projectData as Project);
                setName(projectData.name);
                setDescription(projectData.description || "");
                setProjectGroup((projectData as Project).project_group || null);
                setLeadId(projectData.lead?.id || null);
                setTeamId(projectData.team?.id || null);
                setTargetDate(projectData.target_date || "");
            } else {
                setError("Project not found");
            }

            setTeams(teamsData);
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
        formData.set("name", name);
        formData.set("description", description);
        if (projectGroup) formData.set("project_group", projectGroup);
        if (leadId) formData.set("lead_id", leadId);
        if (teamId) formData.set("team_id", teamId);
        if (targetDate) formData.set("target_date", targetDate);

        const result = await updateProject(formData);
        if (result.success) {
            const updatedProject = await getProjectById(id);
            if (updatedProject) setProject(updatedProject as Project);
        } else {
            setError(result.error || "Failed to update project");
        }

        setSaving(false);
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this project? This will also delete all issues in this project.")) return;

        startTransition(async () => {
            const result = await deleteProject(id);
            if (result.success) {
                router.push("/projects");
            } else {
                setError(result.error || "Failed to delete project");
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full">
                <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-background">
                    <div className="w-32 h-6 bg-muted rounded animate-pulse" />
                </header>
                <div className="flex-1 p-6">
                    <div className="max-w-4xl space-y-6">
                        <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
                        <div className="h-32 bg-muted rounded animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (error && !project) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
                <p>{error}</p>
                <Link href="/projects" className="text-qualia-400 hover:underline mt-2">
                    Back to Projects
                </Link>
            </div>
        );
    }

    if (!project) return null;

    const progress = project.issue_stats.total
        ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
        : 0;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
                <div className="flex items-center gap-4">
                    <Link href="/projects" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                            <Folder className="w-4 h-4" />
                        </div>
                        <ProjectGroupBadge group={projectGroup} />
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
                            {/* Name */}
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="text-xl font-semibold bg-transparent border-0 px-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                                placeholder="Project name"
                            />

                            {/* Progress */}
                            <div className="bg-card border border-border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Progress</span>
                                    <span className="text-sm text-foreground">{progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-qualia-500 rounded-full transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                    <span>{project.issue_stats.done} done</span>
                                    <span>{project.issue_stats.total} total issues</span>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs text-muted-foreground mb-2 block">Description</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="min-h-[100px] bg-card border-border text-foreground"
                                    placeholder="Add a description..."
                                />
                            </div>

                            {/* Milestones */}
                            <div className="border-t border-border pt-6">
                                <ProjectMilestones projectId={id} />
                            </div>

                            {/* Issues List */}
                            <div className="border-t border-border pt-6">
                                <h3 className="text-sm font-medium text-foreground mb-4">
                                    Issues ({project.issues.length})
                                </h3>

                                {project.issues.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No issues in this project</p>
                                ) : (
                                    <div className="space-y-1">
                                        {project.issues.map((issue) => (
                                            <Link
                                                key={issue.id}
                                                href={`/issues/${issue.id}`}
                                                className="flex items-center gap-3 px-3 py-2 rounded hover:bg-card transition-colors group"
                                            >
                                                <StatusIcon status={issue.status} />
                                                <PriorityIcon priority={issue.priority} />
                                                <span className="text-sm text-foreground flex-1 truncate">
                                                    {issue.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTimeAgo(issue.created_at)}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                                {/* Project Group */}
                                <div>
                                    <label className="text-xs text-muted-foreground mb-2 block">Category</label>
                                    <Select value={projectGroup || "none"} onValueChange={(v) => setProjectGroup(v === "none" ? null : v as ProjectGroup)}>
                                        <SelectTrigger className="bg-background border-border">
                                            <SelectValue placeholder="No category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No category</SelectItem>
                                            {PROJECT_GROUPS.map((g) => (
                                                <SelectItem key={g} value={g}>{PROJECT_GROUP_LABELS[g]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Lead */}
                                <div>
                                    <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        Lead
                                    </label>
                                    <Select value={leadId || "none"} onValueChange={(v) => setLeadId(v === "none" ? null : v)}>
                                        <SelectTrigger className="bg-background border-border">
                                            <SelectValue placeholder="No lead" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No lead</SelectItem>
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
                                    <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Team
                                    </label>
                                    <Select value={teamId || "none"} onValueChange={(v) => setTeamId(v === "none" ? null : v)}>
                                        <SelectTrigger className="bg-background border-border">
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

                                {/* Target Date */}
                                <div>
                                    <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Target Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={targetDate}
                                        onChange={(e) => setTargetDate(e.target.value)}
                                        className="bg-background border-border"
                                    />
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    Created {formatDate(project.created_at)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    Updated {formatTimeAgo(project.updated_at)}
                                </div>
                                {project.client && (
                                    <div className="flex items-center gap-2">
                                        <Folder className="w-3 h-3" />
                                        Client: {project.client.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
