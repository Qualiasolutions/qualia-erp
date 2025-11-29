import { Suspense } from "react";
import { connection } from "next/server";
import { ProjectList, Project } from "@/components/project-list";
import { createClient } from "@/lib/supabase/server";
import { NewProjectModal } from "@/components/new-project-modal";
import { getCurrentWorkspaceId, getTeams } from "@/app/actions";
import { ProjectsFilter } from "@/components/projects-filter";

interface FilterParams {
    status?: string;
    team?: string;
}

async function ProjectListLoader({ filters }: { filters: FilterParams }) {
    await connection();
    const supabase = await createClient();
    const workspaceId = await getCurrentWorkspaceId();

    // Fetch projects with lead info
    let query = supabase
        .from('projects')
        .select(`
            id,
            name,
            status,
            target_date,
            lead:profiles!projects_lead_id_fkey (
                id,
                full_name,
                email
            )
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

    // Apply team filter
    if (filters.team) {
        const teams = filters.team.split(',');
        query = query.in('team_id', teams);
    }

    const { data: projects, error } = await query;

    if (error) {
        console.error('Error fetching projects:', error);
    }

    // Fetch issue counts per project for progress calculation
    const projectsWithStats: Project[] = await Promise.all(
        (projects || []).map(async (project) => {
            const { count: total } = await supabase
                .from('issues')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', project.id);

            const { count: done } = await supabase
                .from('issues')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', project.id)
                .eq('status', 'Done');

            return {
                ...project,
                // Transform lead from array to single object (Supabase returns array for relations)
                lead: Array.isArray(project.lead) ? project.lead[0] || null : project.lead,
                issue_stats: {
                    total: total || 0,
                    done: done || 0,
                },
            } as Project;
        })
    );

    return <ProjectList projects={projectsWithStats} />;
}

async function FilterLoader() {
    await connection();
    const teams = await getTeams();
    return <ProjectsFilter teams={teams} />;
}

function ProjectListSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats skeleton */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-8 bg-white/[0.05] rounded animate-pulse" />
                    <div className="w-16 h-4 bg-white/[0.05] rounded animate-pulse" />
                </div>
                <div className="h-6 w-px bg-white/[0.06]" />
                <div className="flex items-center gap-4">
                    <div className="w-20 h-4 bg-white/[0.05] rounded animate-pulse" />
                    <div className="w-24 h-4 bg-white/[0.05] rounded animate-pulse" />
                </div>
            </div>
            {/* Grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.05]" />
                                <div>
                                    <div className="w-28 h-4 bg-white/[0.05] rounded mb-2" />
                                    <div className="w-16 h-4 bg-white/[0.05] rounded" />
                                </div>
                            </div>
                            <div className="w-16 h-5 bg-white/[0.05] rounded" />
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between">
                                <div className="w-16 h-3 bg-white/[0.05] rounded" />
                                <div className="w-20 h-3 bg-white/[0.05] rounded" />
                            </div>
                            <div className="h-2 w-full bg-white/[0.05] rounded-full" />
                            <div className="w-10 h-6 bg-white/[0.05] rounded" />
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                            <div className="w-20 h-3 bg-white/[0.05] rounded" />
                            <div className="w-24 h-3 bg-white/[0.05] rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default async function ProjectsPage({
    searchParams,
}: {
    searchParams: Promise<FilterParams>;
}) {
    const filters = await searchParams;

    return (
        <div className="relative flex flex-col h-full">
            {/* Background effects */}
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
            <div className="fixed inset-0 bg-gradient-to-br from-neon-purple/5 via-transparent to-qualia-500/5 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
                            <svg className="w-5 h-5 text-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">Projects</h1>
                            <p className="text-xs text-muted-foreground">Manage your projects and track progress</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Suspense fallback={<div className="w-20 h-8" />}>
                        <FilterLoader />
                    </Suspense>
                    <NewProjectModal />
                </div>
            </header>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6">
                <Suspense fallback={<ProjectListSkeleton />}>
                    <ProjectListLoader filters={filters} />
                </Suspense>
            </div>
        </div>
    );
}
