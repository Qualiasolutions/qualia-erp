'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Users,
    Folder,
    Calendar,
    Mail,
} from "lucide-react";
import { getTeamById } from "@/app/actions";

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
}

interface TeamMember {
    id: string;
    role: string;
    profile: Profile | null;
}

interface TeamProject {
    id: string;
    name: string;
    status: string;
    lead: { id: string; full_name: string | null } | null;
}

interface Team {
    id: string;
    name: string;
    key: string;
    description: string | null;
    icon: string | null;
    created_at: string;
    members: TeamMember[];
    projects: TeamProject[];
}

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        'Active': 'bg-green-500/10 text-green-400 border-green-500/20',
        'Demos': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Launched': 'bg-qualia-500/10 text-qualia-400 border-qualia-500/20',
        'Delayed': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'Archived': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        'Canceled': 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    return (
        <span className={`text-[10px] px-2 py-0.5 rounded border ${colors[status] || colors['Active']}`}>
            {status}
        </span>
    );
};

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

export function TeamDetailClient() {
    const params = useParams();
    const id = params.id as string;

    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const teamData = await getTeamById(id);

            if (teamData) {
                setTeam(teamData as Team);
            } else {
                setError("Team not found");
            }
            setLoading(false);
        }
        loadData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col h-full">
                <header className="flex items-center gap-4 px-6 py-4 border-b border-[#2C2C2C] bg-[#141414]">
                    <div className="w-32 h-6 bg-[#2C2C2C] rounded animate-pulse" />
                </header>
                <div className="flex-1 p-6">
                    <div className="max-w-4xl space-y-6">
                        <div className="h-8 bg-[#2C2C2C] rounded w-1/2 animate-pulse" />
                        <div className="grid grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-24 bg-[#2C2C2C] rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !team) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-gray-500">
                <p>{error || "Team not found"}</p>
                <Link href="/teams" className="text-qualia-400 hover:underline mt-2">
                    Back to Teams
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-[#2C2C2C] bg-[#141414]">
                <div className="flex items-center gap-4">
                    <Link href="/teams" className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-indigo-600 flex items-center justify-center text-white font-medium">
                            {team.icon || team.key.slice(0, 2)}
                        </div>
                        <div>
                            <h1 className="text-lg font-medium text-white">{team.name}</h1>
                            <span className="text-xs text-gray-500">{team.key}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-6 space-y-8">
                    {/* Description */}
                    {team.description && (
                        <div className="text-sm text-gray-400">
                            {team.description}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-xs">Members</span>
                            </div>
                            <div className="text-2xl font-semibold text-white">{team.members.length}</div>
                        </div>
                        <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Folder className="w-4 h-4" />
                                <span className="text-xs">Projects</span>
                            </div>
                            <div className="text-2xl font-semibold text-white">{team.projects.length}</div>
                        </div>
                        <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs">Created</span>
                            </div>
                            <div className="text-sm font-medium text-white">{formatDate(team.created_at)}</div>
                        </div>
                    </div>

                    {/* Members Section */}
                    <div>
                        <h2 className="text-sm font-medium text-gray-200 mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Team Members ({team.members.length})
                        </h2>

                        {team.members.length === 0 ? (
                            <p className="text-sm text-gray-500">No members in this team</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {team.members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-qualia-900 flex items-center justify-center text-sm text-qualia-200 shrink-0">
                                            {member.profile?.full_name?.[0]?.toUpperCase() || member.profile?.email?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-200 truncate">
                                                {member.profile?.full_name || member.profile?.email?.split('@')[0] || 'Unknown'}
                                            </div>
                                            {member.profile?.email && (
                                                <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                                    <Mail className="w-3 h-3 shrink-0" />
                                                    {member.profile.email}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#2C2C2C] text-gray-400 capitalize">
                                            {member.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Projects Section */}
                    <div>
                        <h2 className="text-sm font-medium text-gray-200 mb-4 flex items-center gap-2">
                            <Folder className="w-4 h-4" />
                            Projects ({team.projects.length})
                        </h2>

                        {team.projects.length === 0 ? (
                            <p className="text-sm text-gray-500">No projects for this team</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {team.projects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="group bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-4 hover:border-gray-600 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Folder className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-200 group-hover:text-white">
                                                    {project.name}
                                                </span>
                                            </div>
                                            <StatusBadge status={project.status} />
                                        </div>
                                        {project.lead && (
                                            <div className="text-xs text-gray-500">
                                                Lead: {project.lead.full_name || 'Unassigned'}
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
