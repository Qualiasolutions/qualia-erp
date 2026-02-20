import { Building2 } from "lucide-react";

export default function ClientsLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Building2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">Clients</h1>
                        <p className="text-xs text-muted-foreground">Manage your clients</p>
                    </div>
                </div>
                <div className="w-24 h-9 bg-muted rounded-md animate-pulse" />
            </header>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-5">
                    {/* Stats skeleton */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-7 bg-muted rounded animate-pulse" />
                                <div className="w-14 h-4 bg-muted rounded animate-pulse" />
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                                <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Tabs skeleton */}
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit">
                        <div className="w-20 h-9 bg-muted rounded-md animate-pulse" />
                        <div className="w-24 h-9 bg-muted rounded-md animate-pulse" />
                        <div className="w-28 h-9 bg-muted rounded-md animate-pulse" />
                    </div>

                    {/* Search skeleton */}
                    <div className="w-full h-10 bg-muted rounded-md animate-pulse" />

                    {/* Grid skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="surface rounded-xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                                        <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3.5 h-3.5 bg-muted rounded animate-pulse" />
                                        <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3.5 h-3.5 bg-muted rounded animate-pulse" />
                                        <div className="w-32 h-3 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
