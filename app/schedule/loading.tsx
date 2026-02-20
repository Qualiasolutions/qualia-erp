import { Calendar } from "lucide-react";

export default function ScheduleLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                        <Calendar className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">Schedule</h1>
                        <p className="text-xs text-muted-foreground">Manage your meetings and events</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-32 h-9 bg-muted rounded-md animate-pulse" />
                    <div className="w-28 h-9 bg-muted rounded-md animate-pulse" />
                </div>
            </header>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="surface rounded-lg p-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="w-48 h-4 bg-muted rounded animate-pulse" />
                                    <div className="w-32 h-3 bg-muted rounded animate-pulse" />
                                    <div className="flex gap-4 pt-1">
                                        <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                                        <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
