import { Folder } from "lucide-react";

export default function ProjectsLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                        <Folder className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">Projects</h1>
                        <p className="text-xs text-muted-foreground">Manage your projects and track progress</p>
                    </div>
                </div>
                <div className="w-28 h-9 bg-muted rounded-md animate-pulse" />
            </header>

            {/* Group Tabs Skeleton */}
            <div className="px-6 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-20 h-8 bg-muted rounded-md animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-5">
                    {/* Stats skeleton */}
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-7 bg-muted rounded animate-pulse" />
                            <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                            <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                        </div>
                    </div>

                    {/* Grid skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="surface rounded-xl p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                                        <div>
                                            <div className="w-28 h-4 bg-muted rounded mb-2 animate-pulse" />
                                            <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                                        <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full animate-pulse" />
                                </div>
                                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                                    <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                                    <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
