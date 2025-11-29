import { IssueList, Issue } from "@/components/issue-list";
import { Plus, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function IssuesPage() {
    const supabase = await createClient();

    const { data: issues, error } = await supabase
        .from('issues')
        .select(`
            id,
            title,
            status,
            priority,
            created_at,
            assignee:profiles!issues_assignee_id_fkey (
                id,
                full_name,
                email
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching issues:', error);
    }

    // Transform data to match Issue interface (assignee is returned as array from Supabase)
    const transformedIssues: Issue[] = (issues || []).map((issue) => ({
        ...issue,
        assignee: Array.isArray(issue.assignee) ? issue.assignee[0] || null : issue.assignee,
    }));

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-[#2C2C2C] bg-[#141414]">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-medium text-white">All Issues</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="px-2 py-0.5 rounded bg-[#2C2C2C] text-gray-300">Active</span>
                        <span className="px-2 py-0.5 rounded hover:bg-[#2C2C2C] cursor-pointer">Backlog</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-qualia-600 hover:bg-qualia-500 text-white text-sm font-medium rounded-md transition-colors">
                        <Plus className="w-4 h-4" />
                        <span>New Issue</span>
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <IssueList issues={transformedIssues} />
            </div>
        </div>
    );
}
