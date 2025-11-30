"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Briefcase, User, CheckCircle, PauseCircle, Zap } from "lucide-react";

export type ProjectGroup = 'salman_kuwait' | 'tasos_kyriakides' | 'finished' | 'inactive' | 'active';

interface ProjectGroupTabsProps {
    currentGroup?: ProjectGroup;
}

const PROJECT_GROUPS = [
    {
        id: 'salman_kuwait' as ProjectGroup,
        label: 'Salman - Kuwait',
        icon: Briefcase,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
    },
    {
        id: 'tasos_kyriakides' as ProjectGroup,
        label: 'Tasos Kyriakides',
        icon: User,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
    },
    {
        id: 'active' as ProjectGroup,
        label: 'Active Projects',
        icon: Zap,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
    },
    {
        id: 'finished' as ProjectGroup,
        label: 'Finished Projects',
        icon: CheckCircle,
        color: 'text-qualia-400',
        bgColor: 'bg-qualia-500/10',
        borderColor: 'border-qualia-500/30',
    },
    {
        id: 'inactive' as ProjectGroup,
        label: 'Inactive Projects',
        icon: PauseCircle,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
    },
];

export function ProjectGroupTabs({ currentGroup }: ProjectGroupTabsProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {/* All Projects Tab */}
            <Link
                href="/projects"
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border",
                    !currentGroup
                        ? "bg-qualia-500/20 text-qualia-400 border-qualia-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
                )}
            >
                All Projects
            </Link>

            <div className="h-6 w-px bg-border mx-1" />

            {/* Group Tabs */}
            {PROJECT_GROUPS.map((group) => {
                const Icon = group.icon;
                const isActive = currentGroup === group.id;

                return (
                    <Link
                        key={group.id}
                        href={`/projects?group=${group.id}`}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border",
                            isActive
                                ? `${group.bgColor} ${group.color} ${group.borderColor}`
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {group.label}
                    </Link>
                );
            })}
        </div>
    );
}

// Export group labels for use in other components
export const PROJECT_GROUP_LABELS: Record<ProjectGroup, string> = {
    salman_kuwait: 'Salman - Kuwait',
    tasos_kyriakides: 'Tasos Kyriakides',
    finished: 'Finished Projects',
    inactive: 'Inactive Projects',
    active: 'Active Projects',
};
