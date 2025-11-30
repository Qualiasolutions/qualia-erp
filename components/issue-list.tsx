'use client';

import Link from "next/link";
import { useState } from "react";
import {
    Circle,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronDown,
    ChevronRight,
    LayoutList,
    Columns3,
    Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Issue {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
}

interface IssueListProps {
    issues: Issue[];
}

type ViewMode = 'list' | 'grouped';

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; bgColor: string; order: number }> = {
    'Yet to Start': {
        icon: Circle,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        order: 0,
    },
    'Todo': {
        icon: Circle,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        order: 1,
    },
    'In Progress': {
        icon: Clock,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        order: 2,
    },
    'Done': {
        icon: CheckCircle2,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        order: 3,
    },
    'Canceled': {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        order: 4,
    },
};

const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
    'Urgent': {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-500/10',
        label: 'Urgent',
    },
    'High': {
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-500/10',
        label: 'High',
    },
    'Medium': {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10',
        label: 'Medium',
    },
    'Low': {
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-500/10',
        label: 'Low',
    },
    'No Priority': {
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        label: 'None',
    },
};

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function IssueCard({ issue }: { issue: Issue }) {
    const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG['Yet to Start'];
    const priorityConfig = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG['No Priority'];
    const StatusIcon = statusConfig.icon;

    return (
        <Link
            href={`/issues/${issue.id}`}
            className="group block surface rounded-lg p-3.5 hover:bg-secondary/50 transition-all duration-200"
        >
            <div className="flex items-start gap-3">
                <StatusIcon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", statusConfig.color)} />
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {issue.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                            priorityConfig.bgColor,
                            priorityConfig.color
                        )}>
                            {priorityConfig.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {formatTimeAgo(issue.created_at)}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function IssueRow({ issue }: { issue: Issue }) {
    const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG['Yet to Start'];
    const priorityConfig = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG['No Priority'];
    const StatusIcon = statusConfig.icon;

    return (
        <Link
            href={`/issues/${issue.id}`}
            className="group flex items-center gap-4 px-3 py-2.5 hover:bg-secondary/50 rounded-lg transition-colors duration-200"
        >
            <StatusIcon className={cn("w-4 h-4 flex-shrink-0", statusConfig.color)} />

            <span className="text-xs font-mono text-muted-foreground w-16 flex-shrink-0">
                {issue.id.slice(0, 8)}
            </span>

            <span className="flex-1 text-sm text-foreground font-medium truncate group-hover:text-primary transition-colors">
                {issue.title}
            </span>

            <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0",
                priorityConfig.bgColor,
                priorityConfig.color
            )}>
                {priorityConfig.label}
            </span>

            <span className="text-xs text-muted-foreground w-14 text-right flex-shrink-0">
                {formatTimeAgo(issue.created_at)}
            </span>
        </Link>
    );
}

function StatusGroup({
    status,
    issues,
    isExpanded,
    onToggle
}: {
    status: string;
    issues: Issue[];
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['Yet to Start'];
    const StatusIcon = config.icon;

    return (
        <div className="mb-5">
            <button
                onClick={onToggle}
                className="flex items-center gap-2.5 w-full px-2 py-1.5 hover:bg-secondary/50 rounded-lg transition-colors group"
            >
                {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <StatusIcon className={cn("w-4 h-4", config.color)} />
                <span className="text-sm font-medium text-foreground">{status}</span>
                <span className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded-full",
                    config.bgColor,
                    config.color
                )}>
                    {issues.length}
                </span>
            </button>

            {isExpanded && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                    {issues.map((issue, index) => (
                        <div
                            key={issue.id}
                            className="slide-in"
                            style={{ animationDelay: `${index * 20}ms` }}
                        >
                            <IssueCard issue={issue} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function IssueList({ issues }: IssueListProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('grouped');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        Object.keys(STATUS_CONFIG).forEach(status => {
            initial[status] = status !== 'Done' && status !== 'Canceled';
        });
        return initial;
    });

    if (issues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="p-4 rounded-xl bg-muted mb-4">
                    <Inbox className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No issues found</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Create your first issue to get started
                </p>
            </div>
        );
    }

    // Group issues by status
    const groupedIssues = issues.reduce((acc, issue) => {
        const status = issue.status || 'Yet to Start';
        if (!acc[status]) acc[status] = [];
        acc[status].push(issue);
        return acc;
    }, {} as Record<string, Issue[]>);

    // Sort groups by status order
    const sortedStatuses = Object.keys(groupedIssues).sort((a, b) => {
        const orderA = STATUS_CONFIG[a]?.order ?? 99;
        const orderB = STATUS_CONFIG[b]?.order ?? 99;
        return orderA - orderB;
    });

    const toggleGroup = (status: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [status]: !prev[status]
        }));
    };

    // Stats
    const totalIssues = issues.length;
    const doneIssues = groupedIssues['Done']?.length || 0;
    const inProgressIssues = groupedIssues['In Progress']?.length || 0;
    const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

    return (
        <div className="flex flex-col h-full">
            {/* Stats Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold text-foreground tabular-nums">{totalIssues}</span>
                        <span className="text-sm text-muted-foreground">issues</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="text-muted-foreground">{inProgressIssues} in progress</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-muted-foreground">{doneIssues} done</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-primary font-medium">{completionRate}%</span>
                            <span className="text-muted-foreground">complete</span>
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary">
                    <button
                        onClick={() => setViewMode('grouped')}
                        className={cn(
                            "p-1.5 rounded-md transition-all duration-200",
                            viewMode === 'grouped'
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Grouped view"
                    >
                        <Columns3 className="w-4 h-4" />
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
                        <LayoutList className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
                {viewMode === 'grouped' ? (
                    <div>
                        {sortedStatuses.map(status => (
                            <StatusGroup
                                key={status}
                                status={status}
                                issues={groupedIssues[status]}
                                isExpanded={expandedGroups[status] ?? true}
                                onToggle={() => toggleGroup(status)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {issues.map((issue, index) => (
                            <div
                                key={issue.id}
                                className="slide-in"
                                style={{ animationDelay: `${index * 15}ms` }}
                            >
                                <IssueRow issue={issue} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
