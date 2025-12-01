'use client';

import Link from "next/link";
import { useState } from "react";
import {
    Folder,
    Calendar,
    User,
    LayoutGrid,
    List,
    TrendingUp,
    Inbox,
    Briefcase,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_GROUP_LABELS, type ProjectGroup } from "@/components/project-group-tabs";

export interface Project {
    id: string;
    name: string;
    status: string;
    target_date: string | null;
    project_group?: string | null;
    lead?: {
        id: string;
        full_name: string | null;
        email: string | null;
    } | null;
    issue_stats?: {
        total: number;
        done: number;
    };
    milestone_progress?: number;
}

interface ProjectListProps {
    projects: Project[];
}

type ViewMode = 'grid' | 'list';

const GROUP_CONFIG: Record<string, { color: string; bgColor: string; icon: typeof Folder }> = {
    'salman_kuwait': {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10',
        icon: Briefcase,
    },
    'tasos_kyriakides': {
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-500/10',
        icon: User,
    },
    'other': {
        color: 'text-violet-600 dark:text-violet-400',
        bgColor: 'bg-violet-500/10',
        icon: Users,
    },
    'active': {
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        icon: TrendingUp,
    },
    'demos': {
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-500/10',
        icon: Folder,
    },
    'inactive': {
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        icon: Folder,
    },
    'default': {
        color: 'text-violet-600 dark:text-violet-400',
        bgColor: 'bg-violet-500/10',
        icon: Folder,
    },
};

function formatDate(dateString: string | null): string {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProjectCard({ project, showGroupBadge = true }: { project: Project; showGroupBadge?: boolean }) {
    const groupConfig = GROUP_CONFIG[project.project_group || 'default'] || GROUP_CONFIG['default'];
    const leadName = project.lead?.full_name || project.lead?.email?.split('@')[0] || 'Unassigned';
    const progress = project.project_group === 'finished' ? 100 : (
        project.milestone_progress !== undefined && project.milestone_progress > 0
            ? project.milestone_progress
            : (project.issue_stats?.total
                ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
                : 0)
    );
    const hasMilestones = project.milestone_progress !== undefined && project.milestone_progress > 0;

    return (
        <Link
            href={`/projects/${project.id}`}
            className="group block surface rounded-xl p-5 hover:bg-secondary/50 transition-all duration-200"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2.5 rounded-lg transition-colors",
                        groupConfig.bgColor,
                    )}>
                        <Folder className={cn("w-4 h-4", groupConfig.color)} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {project.name}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Progress */}
            <div className="space-y-2.5 mb-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{hasMilestones ? 'Milestones' : 'Progress'}</span>
                    {!hasMilestones && (
                        <span className="font-medium text-foreground tabular-nums">
                            {project.issue_stats?.done || 0} / {project.issue_stats?.total || 0}
                        </span>
                    )}
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            progress >= 70 ? "bg-emerald-500" :
                            progress >= 30 ? "bg-amber-500" :
                            "bg-blue-500"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center">
                    <span className={cn(
                        "text-base font-semibold tabular-nums",
                        progress >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                        progress >= 30 ? "text-amber-600 dark:text-amber-400" :
                        "text-blue-600 dark:text-blue-400"
                    )}>
                        {progress}%
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[100px]">{leadName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(project.target_date)}</span>
                </div>
            </div>
        </Link>
    );
}

function ProjectRow({ project }: { project: Project }) {
    const groupConfig = GROUP_CONFIG[project.project_group || 'default'] || GROUP_CONFIG['default'];
    const leadName = project.lead?.full_name || project.lead?.email?.split('@')[0] || 'Unassigned';
    const progress = project.project_group === 'finished' ? 100 : (
        project.milestone_progress !== undefined && project.milestone_progress > 0
            ? project.milestone_progress
            : (project.issue_stats?.total
                ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
                : 0)
    );

    return (
        <Link
            href={`/projects/${project.id}`}
            className="group flex items-center gap-4 px-3 py-3 hover:bg-secondary/50 rounded-lg transition-colors duration-200"
        >
            <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                groupConfig.bgColor,
            )}>
                <Folder className={cn("w-4 h-4", groupConfig.color)} />
            </div>

            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate block">
                    {project.name}
                </span>
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
            <div className="w-28 flex-shrink-0">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground tabular-nums">{progress}%</span>
                </div>
                <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full",
                            progress >= 70 ? "bg-emerald-500" :
                            progress >= 30 ? "bg-amber-500" :
                            "bg-blue-500"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </Link>
    );
}

// Section header for grouped projects
function SectionHeader({ title, count, config }: { title: string; count: number; config: typeof GROUP_CONFIG[string] }) {
    const Icon = config.icon;
    return (
        <div className="flex items-center gap-3 mb-4 mt-6 first:mt-0">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
                <Icon className={cn("w-4 h-4", config.color)} />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">{count} project{count !== 1 ? 's' : ''}</p>
            </div>
        </div>
    );
}

export function ProjectList({ projects }: ProjectListProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Check if we're showing mixed active groups
    const hasMultipleGroups = projects.some(p => p.project_group === 'salman_kuwait') ||
                              projects.some(p => p.project_group === 'tasos_kyriakides');

    // Sort projects: 100% complete projects go to bottom within each group
    const getProgress = (p: Project) => {
        if (p.project_group === 'finished') return 100;
        if (p.milestone_progress !== undefined && p.milestone_progress > 0) return p.milestone_progress;
        if (p.issue_stats?.total) return Math.round((p.issue_stats.done / p.issue_stats.total) * 100);
        return 0;
    };

    const sortProjects = (projectList: Project[]) => {
        return [...projectList].sort((a, b) => {
            const progressA = getProgress(a);
            const progressB = getProgress(b);
            if (progressA === 100 && progressB !== 100) return 1;
            if (progressB === 100 && progressA !== 100) return -1;
            return progressB - progressA;
        });
    };

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="p-4 rounded-xl bg-muted mb-4">
                    <Inbox className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No projects found</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Create your first project to get started
                </p>
            </div>
        );
    }

    // Group projects by owner for active view
    const salmanProjects = sortProjects(projects.filter(p => p.project_group === 'salman_kuwait'));
    const tasosProjects = sortProjects(projects.filter(p => p.project_group === 'tasos_kyriakides'));
    const otherProjects = sortProjects(projects.filter(p => p.project_group === 'active' || p.project_group === 'other'));

    // For non-grouped views (demos, inactive)
    const sortedProjects = sortProjects(projects);

    const totalProjects = projects.length;

    const renderGrid = (projectList: Project[]) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectList.map((project, index) => (
                <div
                    key={project.id}
                    className="slide-in"
                    style={{ animationDelay: `${index * 40}ms` }}
                >
                    <ProjectCard project={project} showGroupBadge={!hasMultipleGroups} />
                </div>
            ))}
        </div>
    );

    const renderList = (projectList: Project[]) => (
        <div className="space-y-0.5">
            {projectList.map((project, index) => (
                <div
                    key={project.id}
                    className="slide-in"
                    style={{ animationDelay: `${index * 25}ms` }}
                >
                    <ProjectRow project={project} />
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Stats Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold text-foreground tabular-nums">{totalProjects}</span>
                        <span className="text-sm text-muted-foreground">projects</span>
                    </div>
                    {hasMultipleGroups && (
                        <>
                            <div className="h-4 w-px bg-border" />
                            <div className="flex items-center gap-4 text-xs">
                                {salmanProjects.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        <span className="text-muted-foreground">{salmanProjects.length} Salman</span>
                                    </div>
                                )}
                                {tasosProjects.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span className="text-muted-foreground">{tasosProjects.length} Tasos</span>
                                    </div>
                                )}
                                {otherProjects.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                        <span className="text-muted-foreground">{otherProjects.length} Other</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-1.5 rounded-md transition-all duration-200",
                            viewMode === 'grid'
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Grid view"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-1.5 rounded-md transition-all duration-200",
                            viewMode === 'list'
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="List view"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content - Grouped or Flat */}
            {hasMultipleGroups ? (
                <div className="space-y-8">
                    {/* Salman's Projects */}
                    {salmanProjects.length > 0 && (
                        <div>
                            <SectionHeader
                                title="Salman's Projects"
                                count={salmanProjects.length}
                                config={GROUP_CONFIG['salman_kuwait']}
                            />
                            {viewMode === 'grid' ? renderGrid(salmanProjects) : renderList(salmanProjects)}
                        </div>
                    )}

                    {/* Tasos's Projects */}
                    {tasosProjects.length > 0 && (
                        <div>
                            <SectionHeader
                                title="Tasos's Projects"
                                count={tasosProjects.length}
                                config={GROUP_CONFIG['tasos_kyriakides']}
                            />
                            {viewMode === 'grid' ? renderGrid(tasosProjects) : renderList(tasosProjects)}
                        </div>
                    )}

                    {/* Other Projects */}
                    {otherProjects.length > 0 && (
                        <div>
                            <SectionHeader
                                title="Other Projects"
                                count={otherProjects.length}
                                config={GROUP_CONFIG['other']}
                            />
                            {viewMode === 'grid' ? renderGrid(otherProjects) : renderList(otherProjects)}
                        </div>
                    )}
                </div>
            ) : (
                // Flat list for demos, inactive, etc.
                viewMode === 'grid' ? renderGrid(sortedProjects) : renderList(sortedProjects)
            )}
        </div>
    );
}
