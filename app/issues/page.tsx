import { Suspense } from "react";
import { connection } from "next/server";
import { IssueList } from "@/components/issue-list";
import { createClient } from "@/lib/supabase/server";
import { NewIssueModal } from "@/components/new-issue-modal";
import { getCurrentWorkspaceId, getProjects } from "@/app/actions";
import { IssuesFilter } from "@/components/issues-filter";
import { ListTodo } from "lucide-react";

interface FilterParams {
    status?: string;
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

    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }

    if (filters.status) {
        const statuses = filters.status.split(',');
        query = query.in('status', statuses);
    }

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
    const projects = await getProjects();

    return <IssuesFilter projects={projects} />;
}

function IssueListSkeleton() {
    return (
        <div className="flex flex-col h-full">
            {/* Stats skeleton */}
            <div className="flex items-center gap-6 px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-7 bg-muted rounded animate-pulse" />
                    <div className="w-12 h-4 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-4">
                    <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                    <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                </div>
            </div>
            {/* Cards skeleton */}
            <div className="p-6 space-y-6">
                {[...Array(3)].map((_, groupIdx) => (
                    <div key={groupIdx}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                            <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                            <div className="w-6 h-4 bg-muted rounded-full animate-pulse" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-7">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="surface rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-4 h-4 bg-muted rounded mt-0.5 animate-pulse" />
                                        <div className="flex-1">
                                            <div className="w-3/4 h-4 bg-muted rounded mb-2 animate-pulse" />
                                            <div className="flex gap-2">
                                                <div className="w-14 h-5 bg-muted rounded animate-pulse" />
                                                <div className="w-10 h-5 bg-muted rounded animate-pulse" />
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <ListTodo className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">Issues</h1>
                        <p className="text-xs text-muted-foreground">Track and manage your work</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Suspense fallback={<div className="w-20 h-8" />}>
                        <FilterLoader />
                    </Suspense>
                    <NewIssueModal />
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-background">
                <Suspense fallback={<IssueListSkeleton />}>
                    <IssueListLoader filters={filters} />
                </Suspense>
            </div>
        </div>
    );
}
