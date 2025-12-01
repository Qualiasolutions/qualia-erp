export default function IssueDetailLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted animate-pulse" />
                    <div>
                        <div className="w-48 h-5 bg-muted rounded animate-pulse mb-1" />
                        <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-20 h-9 bg-muted rounded-md animate-pulse" />
                    <div className="w-20 h-9 bg-muted rounded-md animate-pulse" />
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6 space-y-6">
                    {/* Title and description skeleton */}
                    <div className="surface rounded-xl p-6 space-y-4">
                        <div className="w-3/4 h-6 bg-muted rounded animate-pulse" />
                        <div className="space-y-2">
                            <div className="w-full h-4 bg-muted rounded animate-pulse" />
                            <div className="w-full h-4 bg-muted rounded animate-pulse" />
                            <div className="w-2/3 h-4 bg-muted rounded animate-pulse" />
                        </div>
                    </div>

                    {/* Details grid skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="surface rounded-lg p-4">
                                <div className="w-16 h-3 bg-muted rounded animate-pulse mb-2" />
                                <div className="w-24 h-5 bg-muted rounded animate-pulse" />
                            </div>
                        ))}
                    </div>

                    {/* Comments skeleton */}
                    <div className="surface rounded-xl p-6">
                        <div className="w-24 h-5 bg-muted rounded animate-pulse mb-4" />
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                                        <div className="w-full h-16 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
