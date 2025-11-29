'use client';

import Link from "next/link";
import { Circle, CheckCircle2, MoreHorizontal, SignalHigh, SignalMedium, SignalLow } from "lucide-react";

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

const PriorityIcon = ({ priority }: { priority: string }) => {
    switch (priority) {
        case 'Urgent': return <SignalHigh className="w-4 h-4 text-red-500" />;
        case 'High': return <SignalHigh className="w-4 h-4 text-orange-500" />;
        case 'Medium': return <SignalMedium className="w-4 h-4 text-yellow-500" />;
        case 'Low': return <SignalLow className="w-4 h-4 text-muted-foreground" />;
        default: return <MoreHorizontal className="w-4 h-4 text-muted-foreground" />;
    }
};

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'Done': return <CheckCircle2 className="w-4 h-4 text-qualia-500" />;
        case 'In Progress': return <Circle className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />;
        default: return <Circle className="w-4 h-4 text-muted-foreground" />;
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

export function IssueList({ issues }: IssueListProps) {
    if (issues.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                No issues found
            </div>
        );
    }

    return (
        <div className="w-full">
            {issues.map((issue) => (
                <Link
                    key={issue.id}
                    href={`/issues/${issue.id}`}
                    className="group flex items-center gap-4 px-6 py-3 border-b border-border hover:bg-card cursor-pointer transition-colors"
                >
                    <div className="flex items-center gap-3 w-[120px] shrink-0">
                        <span className="text-xs font-mono text-muted-foreground">{issue.id.slice(0, 8)}</span>
                        <PriorityIcon priority={issue.priority} />
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <StatusIcon status={issue.status} />
                        <span className="text-sm text-foreground font-medium truncate">{issue.title}</span>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-sm text-muted-foreground">
                        <div className="w-24 hidden md:block">{issue.status}</div>
                        <div className="w-20 text-right text-xs text-muted-foreground group-hover:text-foreground">
                            {formatTimeAgo(issue.created_at)}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
