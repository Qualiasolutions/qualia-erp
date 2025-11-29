'use client';

import { MoreHorizontal, Folder } from "lucide-react";

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

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        'Active': 'bg-green-500/10 text-green-400 border-green-500/20',
        'Demos': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Launched': 'bg-qualia-500/10 text-qualia-400 border-qualia-500/20',
        'Delayed': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'Archived': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        'Canceled': 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    return (
        <span className={`text-[10px] px-2 py-0.5 rounded border ${colors[status] || colors['Active']}`}>
            {status}
        </span>
    );
};

function formatDate(dateString: string | null): string {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProjectList({ projects }: ProjectListProps) {
    if (projects.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No projects found
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
                const leadName = project.lead?.full_name || project.lead?.email?.split('@')[0] || 'Unassigned';
                const progress = project.issue_stats?.total
                    ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
                    : 0;

                return (
                    <div
                        key={project.id}
                        className="group bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-[#2C2C2C] flex items-center justify-center text-gray-400">
                                    <Folder className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-200 group-hover:text-white">{project.name}</h3>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <span>{leadName}</span>
                                        <span>•</span>
                                        <span>{formatDate(project.target_date)}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="text-gray-500 hover:text-white">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <StatusBadge status={project.status} />
                                <span className="text-gray-500">{progress}%</span>
                            </div>

                            <div className="h-1 w-full bg-[#2C2C2C] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-qualia-500 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
