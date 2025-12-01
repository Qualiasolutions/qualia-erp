import { Users } from "lucide-react";

export default function TeamsLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                        <Users className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">Teams</h1>
                        <p className="text-xs text-muted-foreground">Manage your teams</p>
                    </div>
                </div>
                <div className="w-24 h-9 bg-muted rounded-md animate-pulse" />
            </header>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="surface rounded-xl p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                                    <div>
                                        <div className="w-24 h-4 bg-muted rounded mb-2 animate-pulse" />
                                        <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="w-full h-3 bg-muted rounded animate-pulse" />
                                <div className="w-3/4 h-3 bg-muted rounded animate-pulse" />
                            </div>
                            <div className="flex items-center gap-2 pt-4 mt-4 border-t border-border">
                                <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                                <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                                <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
