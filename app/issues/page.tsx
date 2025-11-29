import { Suspense } from "react";
import { connection } from "next/server";
import { IssueList } from "@/components/issue-list";
import { createClient } from "@/lib/supabase/server";
import { NewIssueModal } from "@/components/new-issue-modal";
import { getCurrentWorkspaceId, getTeams, getProjects } from "@/app/actions";
import { IssuesFilter } from "@/components/issues-filter";

interface FilterParams {
    status?: string;
    priority?: string;
    team?: string;
    project?: string;
}

async function IssueListLoader({ filters }: { filters: FilterParams }) {
    await connection();
    const supabase = await createClient();
    const workspaceId = await getCurrentWorkspaceId();

    let query = supabase
        .from('issues')
        .select(`
            id,
            title,
            status,
            priority,
            created_at
        `)
        .order('created_at', { ascending: false });

    // Filter by workspace if available
    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }

    // Apply status filter
    if (filters.status) {
        const statuses = filters.status.split(',');
        query = query.in('status', statuses);
    }

    // Apply priority filter
    if (filters.priority) {
        const priorities = filters.priority.split(',');
        query = query.in('priority', priorities);
    }

    // Apply team filter
    if (filters.team) {
        const teams = filters.team.split(',');
        query = query.in('team_id', teams);
    }

    // Apply project filter
    if (filters.project) {
        const projects = filters.project.split(',');
        query = query.in('project_id', projects);
    }

    const { data: issues, error } = await query;

    if (error) {
        console.error('Error fetching issues:', error);
    }

    return <IssueList issues={issues || []} />;
}

async function FilterLoader() {
    await connection();
    const [teams, projects] = await Promise.all([
        getTeams(),
        getProjects(),
    ]);

    return <IssuesFilter teams={teams} projects={projects} />;
}

function IssueListSkeleton() {
    return (
        <div className="w-full animate-pulse">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3 border-b border-border">
                    <div className="w-24 h-4 bg-muted rounded" />
                    <div className="flex-1 h-4 bg-muted rounded" />
                    <div className="w-20 h-4 bg-muted rounded" />
                </div>
            ))}
        </div>
    );
}

export default async function IssuesPage({
    searchParams,
}: {
    searchParams: Promise<FilterParams>;
}) {
    const filters = await searchParams;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-medium text-foreground">All Issues</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Suspense fallback={<div className="w-20 h-8" />}>
                        <FilterLoader />
                    </Suspense>
                    <NewIssueModal />
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <Suspense fallback={<IssueListSkeleton />}>
                    <IssueListLoader filters={filters} />
                </Suspense>
            </div>
        </div>
    );
}
