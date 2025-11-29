import { Suspense } from "react";
import { IssueList, Issue } from "@/components/issue-list";
import { Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewIssueModal } from "@/components/new-issue-modal";
import { getCurrentWorkspaceId } from "@/app/actions";

async function IssueListLoader() {
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

    const { data: issues, error } = await query;

    if (error) {
        console.error('Error fetching issues:', error);
    }

    return <IssueList issues={issues || []} />;
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

export default function IssuesPage() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-medium text-foreground">All Issues</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground">Active</span>
                        <span className="px-2 py-0.5 rounded hover:bg-muted cursor-pointer">Yet to Start</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                    <NewIssueModal />
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <Suspense fallback={<IssueListSkeleton />}>
                    <IssueListLoader />
                </Suspense>
            </div>
        </div>
    );
}
