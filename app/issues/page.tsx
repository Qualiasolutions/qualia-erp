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
        <div className="flex flex-col h-full">
            {/* Stats skeleton */}
            <div className="flex items-center gap-6 px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <div className="w-12 h-8 bg-white/[0.05] rounded animate-pulse" />
                    <div className="w-12 h-4 bg-white/[0.05] rounded animate-pulse" />
                </div>
                <div className="h-6 w-px bg-white/[0.06]" />
                <div className="flex items-center gap-4">
                    <div className="w-24 h-4 bg-white/[0.05] rounded animate-pulse" />
                    <div className="w-24 h-4 bg-white/[0.05] rounded animate-pulse" />
                </div>
            </div>
            {/* Cards skeleton */}
            <div className="p-6 space-y-6">
                {[...Array(3)].map((_, groupIdx) => (
                    <div key={groupIdx}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-4 h-4 bg-white/[0.05] rounded animate-pulse" />
                            <div className="w-6 h-6 bg-white/[0.05] rounded animate-pulse" />
                            <div className="w-20 h-4 bg-white/[0.05] rounded animate-pulse" />
                            <div className="w-6 h-4 bg-white/[0.05] rounded-full animate-pulse" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-9">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-white/[0.05] rounded-lg" />
                                        <div className="flex-1">
                                            <div className="w-3/4 h-4 bg-white/[0.05] rounded mb-2" />
                                            <div className="flex gap-2">
                                                <div className="w-16 h-4 bg-white/[0.05] rounded" />
                                                <div className="w-10 h-4 bg-white/[0.05] rounded" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
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
        <div className="relative flex flex-col h-full">
            {/* Background effects */}
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
            <div className="fixed inset-0 bg-gradient-to-br from-qualia-500/5 via-transparent to-neon-purple/5 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-qualia-500/10 border border-qualia-500/20">
                            <svg className="w-5 h-5 text-qualia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">Issues</h1>
                            <p className="text-xs text-muted-foreground">Track and manage your work</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Suspense fallback={<div className="w-20 h-8" />}>
                        <FilterLoader />
                    </Suspense>
                    <NewIssueModal />
                </div>
            </header>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-hidden">
                <Suspense fallback={<IssueListSkeleton />}>
                    <IssueListLoader filters={filters} />
                </Suspense>
            </div>
        </div>
    );
}
