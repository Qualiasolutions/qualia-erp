import { Suspense } from "react";
import { Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewTeamModal } from "@/components/new-team-modal";

interface Team {
    id: string;
    name: string;
    key: string;
    description: string | null;
    icon: string | null;
    created_at: string;
}

async function TeamListLoader() {
    const supabase = await createClient();

    const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching teams:', error);
    }

    if (!teams || teams.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No teams found
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team: Team) => (
                <div
                    key={team.id}
                    className="group bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded bg-indigo-600 flex items-center justify-center text-white font-medium">
                            {team.icon || team.key.slice(0, 2)}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-200 group-hover:text-white">{team.name}</h3>
                            <span className="text-xs text-gray-500">{team.key}</span>
                        </div>
                    </div>
                    {team.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{team.description}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

function TeamListSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded bg-[#2C2C2C]" />
                        <div>
                            <div className="w-24 h-4 bg-[#2C2C2C] rounded mb-1" />
                            <div className="w-12 h-3 bg-[#2C2C2C] rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TeamsPage() {
    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between px-6 py-4 border-b border-[#2C2C2C] bg-[#141414]">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-medium text-white">Teams</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                    <NewTeamModal />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={<TeamListSkeleton />}>
                    <TeamListLoader />
                </Suspense>
            </div>
        </div>
    );
}
