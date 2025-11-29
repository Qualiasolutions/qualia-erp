"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilterDropdown, FilterGroup } from "./filter-dropdown";

const ISSUE_STATUSES = [
    { value: "Yet to Start", label: "Yet to Start" },
    { value: "Todo", label: "Todo" },
    { value: "In Progress", label: "In Progress" },
    { value: "Done", label: "Done" },
    { value: "Canceled", label: "Canceled" },
];

const ISSUE_PRIORITIES = [
    { value: "No Priority", label: "No Priority" },
    { value: "Urgent", label: "Urgent" },
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
];

interface Team {
    id: string;
    name: string;
    key: string;
}

interface Project {
    id: string;
    name: string;
}

interface IssuesFilterProps {
    teams: Team[];
    projects: Project[];
}

export function IssuesFilter({ teams, projects }: IssuesFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Parse current filters from URL
    const getFiltersFromUrl = useCallback(() => {
        const filters: Record<string, string[]> = {};

        const status = searchParams.get("status");
        if (status) filters.status = status.split(",");

        const priority = searchParams.get("priority");
        if (priority) filters.priority = priority.split(",");

        const team = searchParams.get("team");
        if (team) filters.team = team.split(",");

        const project = searchParams.get("project");
        if (project) filters.project = project.split(",");

        return filters;
    }, [searchParams]);

    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(getFiltersFromUrl);

    // Update state when URL changes
    useEffect(() => {
        setActiveFilters(getFiltersFromUrl());
    }, [getFiltersFromUrl]);

    // Build filter groups
    const filterGroups: FilterGroup[] = [
        {
            key: "status",
            label: "Status",
            options: ISSUE_STATUSES,
        },
        {
            key: "priority",
            label: "Priority",
            options: ISSUE_PRIORITIES,
        },
        {
            key: "team",
            label: "Team",
            options: teams.map((t) => ({ value: t.id, label: `${t.name} (${t.key})` })),
        },
        {
            key: "project",
            label: "Project",
            options: projects.map((p) => ({ value: p.id, label: p.name })),
        },
    ];

    // Update URL when filters change
    const updateUrl = useCallback(
        (newFilters: Record<string, string[]>) => {
            const params = new URLSearchParams();

            Object.entries(newFilters).forEach(([key, values]) => {
                if (values.length > 0) {
                    params.set(key, values.join(","));
                }
            });

            const queryString = params.toString();
            router.push(queryString ? `${pathname}?${queryString}` : pathname);
        },
        [pathname, router]
    );

    const handleFilterChange = (key: string, values: string[]) => {
        const newFilters = { ...activeFilters, [key]: values };
        setActiveFilters(newFilters);
        updateUrl(newFilters);
    };

    const handleClearAll = () => {
        setActiveFilters({});
        router.push(pathname);
    };

    return (
        <FilterDropdown
            filters={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAll}
        />
    );
}
