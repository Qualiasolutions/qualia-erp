import { Suspense } from "react";
import { connection } from "next/server";
import { ProjectList, Project } from "@/components/project-list";
import { createClient } from "@/lib/supabase/server";
import { NewProjectModal } from "@/components/new-project-modal";
import { getCurrentWorkspaceId } from "@/app/actions";
import { ProjectGroupTabs } from "@/components/project-group-tabs";
import { Folder } from "lucide-react";

export type ProjectGroup = 'salman_kuwait' | 'tasos_kyriakides' | 'inactive' | 'active' | 'demos' | 'other';

interface FilterParams {
    group?: ProjectGroup;
}

async function ProjectListLoader({ filters }: { filters: FilterParams }) {
    await connection();
    const supabase = await createClient();
    const workspaceId = await getCurrentWorkspaceId();

    const { data: rawProjects, error } = await supabase
        .rpc('get_project_stats', { p_workspace_id: workspaceId });

    if (error) {
        console.error('Error fetching projects:', error);
        return <ProjectList projects={[]} />;
    }

    // Map RPC result to Project interface
    let projects: Project[] = (rawProjects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        target_date: p.target_date,
        project_group: p.project_group,
        lead: p.lead_id ? {
            id: p.lead_id,
            full_name: p.lead_full_name,
            email: p.lead_email
        } : null,
        issue_stats: {
            total: Number(p.total_issues),
            done: Number(p.done_issues)
        },
        milestone_progress: p.milestone_progress || 0
    }));

    // Filter by project group (default to 'active')
    const group = filters.group || 'active';

    if (group === 'active') {
        // 'active' shows all active projects including salman, tasos, other subgroups
        projects = projects.filter(p =>
            p.project_group === 'active' ||
            p.project_group === 'salman_kuwait' ||
            p.project_group === 'tasos_kyriakides' ||
            p.project_group === 'other'
        );
    } else {
        projects = projects.filter(p => p.project_group === group);
    }

    return <ProjectList projects={projects} />;
}

function ProjectListSkeleton() {
    return (
        <div className="space-y-5">
            {/* Stats skeleton */}
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-7 bg-muted rounded animate-pulse" />
                    <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-4">
                    <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                    <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                </div>
            </div>
            {/* Grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="surface rounded-xl p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                                <div>
                                    <div className="w-28 h-4 bg-muted rounded mb-2 animate-pulse" />
                                    <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="w-14 h-5 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                                <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full animate-pulse" />
                        </div>
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                            <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                            <div className="w-20 h-3 bg-muted rounded animate-pulse" />
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                        <Folder className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">Projects</h1>
                        <p className="text-xs text-muted-foreground">Manage your projects and track progress</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NewProjectModal />
                </div>
            </header>

            {/* Group Tabs */}
            <div className="px-6 py-3 border-b border-border bg-background">
                <ProjectGroupTabs currentGroup={filters.group} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={<ProjectListSkeleton />}>
                    <ProjectListLoader filters={filters} />
                </Suspense>
            </div>
        </div>
    );
}
