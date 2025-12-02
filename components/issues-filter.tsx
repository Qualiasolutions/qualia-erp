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

interface Project {
    id: string;
    name: string;
}

interface IssuesFilterProps {
    projects: Project[];
}

export function IssuesFilter({ projects }: IssuesFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Parse current filters from URL
    const getFiltersFromUrl = useCallback(() => {
        const filters: Record<string, string[]> = {};

        const status = searchParams.get("status");
        if (status) filters.status = status.split(",");

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
