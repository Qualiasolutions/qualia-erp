"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { PauseCircle, Zap, Play } from "lucide-react";

export type ProjectGroup = 'salman_kuwait' | 'tasos_kyriakides' | 'inactive' | 'active' | 'demos' | 'other';

interface ProjectGroupTabsProps {
    currentGroup?: ProjectGroup;
}

// Main groups only - Active, Demos, Inactive
const GROUPS = [
    {
        id: 'active' as ProjectGroup,
        label: 'Active',
        icon: Zap,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
    {
        id: 'demos' as ProjectGroup,
        label: 'Demos',
        icon: Play,
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-500/10',
    },
    {
        id: 'inactive' as ProjectGroup,
        label: 'Inactive',
        icon: PauseCircle,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
    },
];

export function ProjectGroupTabs({ currentGroup }: ProjectGroupTabsProps) {
    // Default to 'active' if no group is specified
    // Map subgroups to 'active' for tab highlighting
    const effectiveGroup = ['salman_kuwait', 'tasos_kyriakides', 'other'].includes(currentGroup || '')
        ? 'active'
        : (currentGroup || 'active');

    return (
        <div className="flex items-center gap-1">
            {GROUPS.map((group) => {
                const Icon = group.icon;
                const isActive = effectiveGroup === group.id;

                return (
                    <Link
                        key={group.id}
                        href={`/projects?group=${group.id}`}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                            isActive
                                ? `${group.bgColor} ${group.color}`
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
    salman_kuwait: 'Salman',
    tasos_kyriakides: 'Tasos',
    inactive: 'Inactive',
    active: 'Active',
    demos: 'Demos',
    other: 'Other',
};
