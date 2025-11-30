"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Briefcase, User, PauseCircle, Zap, Play, MoreHorizontal } from "lucide-react";

export type ProjectGroup = 'salman_kuwait' | 'tasos_kyriakides' | 'inactive' | 'active' | 'demos' | 'other';

interface ProjectGroupTabsProps {
    currentGroup?: ProjectGroup;
}

// Main groups
const MAIN_GROUPS = [
    {
        id: 'active' as ProjectGroup,
        label: 'Active',
        icon: Zap,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
];

// Active subgroups (Salman, Tasos, Other)
const ACTIVE_SUBGROUPS = [
    {
        id: 'salman_kuwait' as ProjectGroup,
        label: 'Salman',
        icon: Briefcase,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10',
    },
    {
        id: 'tasos_kyriakides' as ProjectGroup,
        label: 'Tasos',
        icon: User,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-500/10',
    },
    {
        id: 'other' as ProjectGroup,
        label: 'Other',
        icon: MoreHorizontal,
        color: 'text-violet-600 dark:text-violet-400',
        bgColor: 'bg-violet-500/10',
    },
];

// Other main groups
const OTHER_GROUPS = [
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
    const activeGroup = currentGroup || 'active';
    const isActiveSection = ['active', 'salman_kuwait', 'tasos_kyriakides', 'other'].includes(activeGroup);

    return (
        <div className="flex items-center gap-1 overflow-x-auto">
            {/* Active main tab */}
            {MAIN_GROUPS.map((group) => {
                const Icon = group.icon;
                const isActive = activeGroup === group.id;

                return (
                    <Link
                        key={group.id}
                        href={`/projects?group=${group.id}`}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                            isActive
                                ? `${group.bgColor} ${group.color}`
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {group.label}
                    </Link>
                );
            })}

            {/* Divider */}
            <div className="h-4 w-px bg-border mx-1" />

            {/* Active subgroups */}
            {ACTIVE_SUBGROUPS.map((group) => {
                const Icon = group.icon;
                const isActive = activeGroup === group.id;

                return (
                    <Link
                        key={group.id}
                        href={`/projects?group=${group.id}`}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
                            isActive
                                ? `${group.bgColor} ${group.color}`
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                    >
                        <Icon className="w-3 h-3" />
                        {group.label}
                    </Link>
                );
            })}

            {/* Divider */}
            <div className="h-4 w-px bg-border mx-1" />

            {/* Demos and Inactive */}
            {OTHER_GROUPS.map((group) => {
                const Icon = group.icon;
                const isActive = activeGroup === group.id;

                return (
                    <Link
                        key={group.id}
                        href={`/projects?group=${group.id}`}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                            isActive
                                ? `${group.bgColor} ${group.color}`
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" />
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
