import { ProjectList, Project } from "@/components/project-list";
import { Plus, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
    const supabase = await createClient();

    // Fetch projects with lead info
    const { data: projects, error } = await supabase
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

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-[#2C2C2C] bg-[#141414]">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-medium text-white">Projects</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="px-2 py-0.5 rounded bg-[#2C2C2C] text-gray-300">Active</span>
                        <span className="px-2 py-0.5 rounded hover:bg-[#2C2C2C] cursor-pointer">All</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-qualia-600 hover:bg-qualia-500 text-white text-sm font-medium rounded-md transition-colors">
                        <Plus className="w-4 h-4" />
                        <span>New Project</span>
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <ProjectList projects={projectsWithStats} />
            </div>
        </div>
    );
}
