"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilterDropdown, FilterGroup } from "./filter-dropdown";

const PROJECT_STATUSES = [
    { value: "Demos", label: "Demos" },
    { value: "Active", label: "Active" },
    { value: "Launched", label: "Launched" },
    { value: "Delayed", label: "Delayed" },
    { value: "Archived", label: "Archived" },
    { value: "Canceled", label: "Canceled" },
];

interface Team {
    id: string;
    name: string;
    key: string;
}

interface ProjectsFilterProps {
    teams: Team[];
}

export function ProjectsFilter({ teams }: ProjectsFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Parse current filters from URL
    const getFiltersFromUrl = useCallback(() => {
        const filters: Record<string, string[]> = {};

        const status = searchParams.get("status");
        if (status) filters.status = status.split(",");

        const team = searchParams.get("team");
        if (team) filters.team = team.split(",");

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
            options: PROJECT_STATUSES,
        },
        {
            key: "team",
            label: "Team",
            options: teams.map((t) => ({ value: t.id, label: `${t.name} (${t.key})` })),
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
