'use client';

import Link from "next/link";
import { useState } from "react";
import {
    Folder,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    User,
    LayoutGrid,
    List,
    AlertTriangle,
    CheckCircle2,
    Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Project {
    id: string;
    name: string;
    status: string;
    target_date: string | null;
    lead?: {
        id: string;
        full_name: string | null;
        email: string | null;
    } | null;
    issue_stats?: {
        total: number;
        done: number;
    };
}

interface ProjectListProps {
    projects: Project[];
}

type ViewMode = 'grid' | 'list';

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; icon: typeof Folder }> = {
    'Active': {
        color: 'text-neon-green',
        bgColor: 'bg-neon-green/10',
        borderColor: 'border-neon-green/20',
        icon: TrendingUp,
    },
    'Demos': {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        icon: Clock,
    },
    'Launched': {
        color: 'text-qualia-400',
        bgColor: 'bg-qualia-500/10',
        borderColor: 'border-qualia-500/20',
        icon: CheckCircle2,
    },
    'Delayed': {
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        icon: AlertTriangle,
    },
    'Archived': {
        color: 'text-muted-foreground',
        bgColor: 'bg-white/[0.03]',
        borderColor: 'border-white/[0.06]',
        icon: Folder,
    },
    'Canceled': {
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        icon: Minus,
    },
};

function getHealthIndicator(project: Project): { label: string; color: string; bgColor: string; icon: typeof TrendingUp } {
    const progress = project.issue_stats?.total
        ? (project.issue_stats.done / project.issue_stats.total) * 100
        : 0;

    // Check if project has a target date
    if (project.target_date) {
        const targetDate = new Date(project.target_date);
        const now = new Date();
        const daysUntilDue = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Past due and not complete
        if (daysUntilDue < 0 && progress < 100) {
            return {
                label: 'Off track',
                color: 'text-red-400',
                bgColor: 'bg-red-500/10',
                icon: TrendingDown,
            };
        }

        // Due soon and progress is low
        if (daysUntilDue <= 7 && progress < 70) {
            return {
                label: 'At risk',
                color: 'text-orange-400',
                bgColor: 'bg-orange-500/10',
                icon: AlertTriangle,
            };
        }
    }

    // Good progress or no due date concerns
    if (progress >= 70 || project.status === 'Launched') {
        return {
            label: 'On track',
            color: 'text-neon-green',
            bgColor: 'bg-neon-green/10',
            icon: TrendingUp,
        };
    }

    return {
        label: 'In progress',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        icon: Minus,
    };
}

function formatDate(dateString: string | null): string {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProjectCard({ project }: { project: Project }) {
    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['Active'];
    const leadName = project.lead?.full_name || project.lead?.email?.split('@')[0] || 'Unassigned';
    const progress = project.status === 'Launched' ? 100 : (project.issue_stats?.total
        ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
        : 0);

    return (
        <Link
            href={`/projects/${project.id}`}
            className="group block glass-card rounded-2xl p-5 hover:border-qualia-500/30 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(0,255,209,0.15)] hover:scale-[1.02]"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all duration-300",
                        statusConfig.bgColor,
                        "border",
                        statusConfig.borderColor,
                        "group-hover:scale-110"
                    )}>
                        <Folder className={cn("w-5 h-5", statusConfig.color)} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-qualia-400 transition-colors">
                            {project.name}
                        </h3>
                    </div>
                </div>
                {/* Status Badge - Top Right */}
                <span className={cn(
                    "text-[10px] px-2 py-1 rounded-md border font-medium",
                    statusConfig.bgColor,
                    statusConfig.borderColor,
                    statusConfig.color
                )}>
                    {project.status}
                </span>
            </div>

            {/* Progress */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">
                        {project.issue_stats?.done || 0} / {project.issue_stats?.total || 0} issues
                    </span>
                </div>
                <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            progress >= 70 ? "bg-gradient-to-r from-neon-green to-qualia-400" :
                            progress >= 30 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                            "bg-gradient-to-r from-blue-400 to-blue-500"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className={cn(
                        "text-lg font-bold",
                        progress >= 70 ? "text-neon-green" :
                        progress >= 30 ? "text-amber-400" :
                        "text-blue-400"
                    )}>
                        {progress}%
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>{leadName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(project.target_date)}</span>
                </div>
            </div>
        </Link>
    );
}

function ProjectRow({ project }: { project: Project }) {
    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['Active'];
    const leadName = project.lead?.full_name || project.lead?.email?.split('@')[0] || 'Unassigned';
    const progress = project.status === 'Launched' ? 100 : (project.issue_stats?.total
        ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
        : 0);

    return (
        <Link
            href={`/projects/${project.id}`}
            className="group flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] rounded-xl transition-all duration-300"
        >
            <div className={cn(
                "p-2 rounded-xl",
                statusConfig.bgColor,
                "border",
                statusConfig.borderColor,
            )}>
                <Folder className={cn("w-4 h-4", statusConfig.color)} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground group-hover:text-qualia-400 transition-colors truncate">
                        {project.name}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {leadName}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(project.target_date)}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-32 shrink-0">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full",
                            progress >= 70 ? "bg-neon-green" :
                            progress >= 30 ? "bg-amber-400" :
                            "bg-blue-400"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Status Badge - Right */}
            <span className={cn(
                "text-[10px] px-2 py-1 rounded-md border font-medium shrink-0",
                statusConfig.bgColor,
                statusConfig.borderColor,
                statusConfig.color
            )}>
                {project.status}
            </span>
        </Link>
    );
}

export function ProjectList({ projects }: ProjectListProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Sort projects: 100% complete projects go to bottom
    const sortedProjects = [...projects].sort((a, b) => {
        const progressA = a.status === 'Launched' ? 100 : (a.issue_stats?.total
            ? Math.round((a.issue_stats.done / a.issue_stats.total) * 100)
            : 0);
        const progressB = b.status === 'Launched' ? 100 : (b.issue_stats?.total
            ? Math.round((b.issue_stats.done / b.issue_stats.total) * 100)
            : 0);

        // 100% projects go to bottom
        if (progressA === 100 && progressB !== 100) return 1;
        if (progressB === 100 && progressA !== 100) return -1;

        // For non-100% projects, sort by progress descending (higher progress first)
        return progressB - progressA;
    });

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                    <Folder className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-foreground font-medium">No projects found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                    Create your first project to get started
                </p>
            </div>
        );
    }

    // Stats
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'Active').length;
    const launchedProjects = projects.filter(p => p.status === 'Launched').length;
    const atRiskProjects = projects.filter(p => {
        const health = getHealthIndicator(p);
        return health.label === 'At risk' || health.label === 'Off track';
    }).length;

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-foreground">{totalProjects}</span>
                        <span className="text-sm text-muted-foreground">projects</span>
                    </div>
                    <div className="h-6 w-px bg-white/[0.06]" />
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-neon-green" />
                            <span className="text-muted-foreground">{activeProjects} active</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-qualia-400" />
                            <span className="text-muted-foreground">{launchedProjects} launched</span>
                        </div>
                        {atRiskProjects > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-400" />
                                <span className="text-orange-400">{atRiskProjects} at risk</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded-md transition-all",
                            viewMode === 'grid'
                                ? "bg-qualia-500/20 text-qualia-400"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Grid view"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-md transition-all",
                            viewMode === 'list'
                                ? "bg-qualia-500/20 text-qualia-400"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="List view"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedProjects.map((project, index) => (
                        <div
                            key={project.id}
                            className="animate-slide-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <ProjectCard project={project} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-1">
                    {sortedProjects.map((project, index) => (
                        <div
                            key={project.id}
                            className="animate-slide-in"
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <ProjectRow project={project} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
