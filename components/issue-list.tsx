'use client';

import Link from "next/link";
import { useState } from "react";
import {
    Circle,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    ChevronDown,
    ChevronRight,
    LayoutList,
    Columns3,
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

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; bgColor: string; borderColor: string; order: number }> = {
    'Yet to Start': {
        icon: Circle,
        color: 'text-muted-foreground',
        bgColor: 'bg-white/[0.03]',
        borderColor: 'border-white/[0.06]',
        order: 0,
    },
    'Todo': {
        icon: Circle,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        order: 1,
    },
    'In Progress': {
        icon: Clock,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        order: 2,
    },
    'Done': {
        icon: CheckCircle2,
        color: 'text-neon-green',
        bgColor: 'bg-neon-green/10',
        borderColor: 'border-neon-green/20',
        order: 3,
    },
    'Canceled': {
        icon: XCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        order: 4,
    },
};

const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
    'Urgent': {
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        label: 'Urgent',
    },
    'High': {
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        label: 'High',
    },
    'Medium': {
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        label: 'Medium',
    },
    'Low': {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        label: 'Low',
    },
    'No Priority': {
        color: 'text-muted-foreground',
        bgColor: 'bg-white/[0.03]',
        borderColor: 'border-white/[0.06]',
        label: 'No Priority',
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
            className="group block glass-card rounded-xl p-4 hover:border-qualia-500/30 transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(0,255,209,0.15)]"
        >
            <div className="flex items-start gap-3">
                <div className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    statusConfig.bgColor,
                    "border",
                    statusConfig.borderColor,
                    "group-hover:scale-110"
                )}>
                    <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate group-hover:text-qualia-400 transition-colors">
                        {issue.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md border",
                            priorityConfig.bgColor,
                            priorityConfig.borderColor,
                            priorityConfig.color
                        )}>
                            {priorityConfig.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
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
            className="group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] rounded-xl transition-all duration-300"
        >
            <div className={cn(
                "p-2 rounded-lg",
                statusConfig.bgColor,
                "border",
                statusConfig.borderColor,
            )}>
                <StatusIcon className={cn("w-3.5 h-3.5", statusConfig.color)} />
            </div>

            <span className="text-xs font-mono text-muted-foreground/60 w-20 shrink-0">
                {issue.id.slice(0, 8)}
            </span>

            <span className="flex-1 text-sm text-foreground font-medium truncate group-hover:text-qualia-400 transition-colors">
                {issue.title}
            </span>

            <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-md border shrink-0",
                priorityConfig.bgColor,
                priorityConfig.borderColor,
                priorityConfig.color
            )}>
                {priorityConfig.label}
            </span>

            <span className="text-xs text-muted-foreground/60 w-16 text-right shrink-0">
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
        <div className="mb-6">
            <button
                onClick={onToggle}
                className="flex items-center gap-3 w-full px-2 py-2 hover:bg-white/[0.03] rounded-xl transition-colors group"
            >
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <div className={cn(
                    "p-1.5 rounded-lg",
                    config.bgColor,
                    "border",
                    config.borderColor,
                )}>
                    <StatusIcon className={cn("w-3.5 h-3.5", config.color)} />
                </div>
                <span className="text-sm font-medium text-foreground">{status}</span>
                <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    config.bgColor,
                    config.color
                )}>
                    {issues.length}
                </span>
            </button>

            {isExpanded && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-9">
                    {issues.map((issue, index) => (
                        <div
                            key={issue.id}
                            className="animate-slide-in"
                            style={{ animationDelay: `${index * 30}ms` }}
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
        // Start with all groups expanded except Done and Canceled
        const initial: Record<string, boolean> = {};
        Object.keys(STATUS_CONFIG).forEach(status => {
            initial[status] = status !== 'Done' && status !== 'Canceled';
        });
        return initial;
    });

    if (issues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                    <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-foreground font-medium">No issues found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-foreground">{totalIssues}</span>
                        <span className="text-sm text-muted-foreground">issues</span>
                    </div>
                    <div className="h-6 w-px bg-white/[0.06]" />
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-muted-foreground">{inProgressIssues} in progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-neon-green" />
                            <span className="text-muted-foreground">{doneIssues} done</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-qualia-400 font-medium">{completionRate}%</span>
                            <span className="text-muted-foreground">complete</span>
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <button
                        onClick={() => setViewMode('grouped')}
                        className={cn(
                            "p-2 rounded-md transition-all",
                            viewMode === 'grouped'
                                ? "bg-qualia-500/20 text-qualia-400"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Grouped view"
                    >
                        <Columns3 className="w-4 h-4" />
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
                        <LayoutList className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
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
                    <div className="space-y-1">
                        {issues.map((issue, index) => (
                            <div
                                key={issue.id}
                                className="animate-slide-in"
                                style={{ animationDelay: `${index * 20}ms` }}
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
