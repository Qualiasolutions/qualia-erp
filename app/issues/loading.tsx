import { CircleDot } from "lucide-react";

export default function IssuesLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <CircleDot className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">Issues</h1>
                        <p className="text-xs text-muted-foreground">Track and manage issues</p>
                    </div>
                </div>
                <div className="w-24 h-9 bg-muted rounded-md animate-pulse" />
            </header>

            {/* Filter Skeleton */}
            <div className="px-6 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-3">
                    <div className="w-32 h-9 bg-muted rounded-md animate-pulse" />
                    <div className="w-32 h-9 bg-muted rounded-md animate-pulse" />
                    <div className="w-32 h-9 bg-muted rounded-md animate-pulse" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg surface">
                            <div className="w-5 h-5 rounded bg-muted animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="w-3/4 h-4 bg-muted rounded animate-pulse" />
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                                    <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="w-16 h-6 bg-muted rounded-full animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
