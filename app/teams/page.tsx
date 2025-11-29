import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewTeamModal } from "@/components/new-team-modal";
import { getCurrentWorkspaceId } from "@/app/actions";
import { TeamsFilter } from "@/components/teams-filter";

interface Team {
    id: string;
    name: string;
    key: string;
    description: string | null;
    icon: string | null;
    created_at: string;
}

interface FilterParams {
    search?: string;
}

async function TeamListLoader({ filters }: { filters: FilterParams }) {
    await connection();
    const supabase = await createClient();
    const workspaceId = await getCurrentWorkspaceId();

    let query = supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

    // Filter by workspace if available
    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }

    // Apply search filter
    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,key.ilike.%${filters.search}%`);
    }

    const { data: teams, error } = await query;

    if (error) {
        console.error('Error fetching teams:', error);
    }

    if (!teams || teams.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                {filters.search ? `No teams matching "${filters.search}"` : "No teams found"}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team: Team) => (
                <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className="group bg-card border border-border rounded-lg p-4 hover:border-muted-foreground transition-colors cursor-pointer block"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded bg-indigo-600 flex items-center justify-center text-white font-medium">
                            {team.icon || team.key.slice(0, 2)}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-foreground group-hover:text-foreground">{team.name}</h3>
                            <span className="text-xs text-muted-foreground">{team.key}</span>
                        </div>
                    </div>
                    {team.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{team.description}</p>
                    )}
                </Link>
            ))}
        </div>
    );
}

function TeamListSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded bg-muted" />
                        <div>
                            <div className="w-24 h-4 bg-muted rounded mb-1" />
                            <div className="w-12 h-3 bg-muted rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default async function TeamsPage({
    searchParams,
}: {
    searchParams: Promise<FilterParams>;
}) {
    const filters = await searchParams;

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-medium text-foreground">Teams</h1>
                </div>
                <div className="flex items-center gap-3">
                    <TeamsFilter />
                    <NewTeamModal />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={<TeamListSkeleton />}>
                    <TeamListLoader filters={filters} />
                </Suspense>
            </div>
        </div>
    );
}
