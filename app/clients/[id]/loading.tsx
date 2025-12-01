export default function ClientDetailLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                    <div>
                        <div className="w-36 h-5 bg-muted rounded animate-pulse mb-1" />
                        <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-20 h-9 bg-muted rounded-md animate-pulse" />
                    <div className="w-20 h-9 bg-muted rounded-md animate-pulse" />
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Basic Info skeleton */}
                    <div className="surface rounded-xl p-6">
                        <div className="w-28 h-5 bg-muted rounded animate-pulse mb-4" />
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i}>
                                    <div className="w-16 h-3 bg-muted rounded animate-pulse mb-2" />
                                    <div className="w-32 h-5 bg-muted rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contacts skeleton */}
                    <div className="surface rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-24 h-5 bg-muted rounded animate-pulse" />
                            <div className="w-28 h-8 bg-muted rounded-md animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                                    <div className="flex-1">
                                        <div className="w-32 h-4 bg-muted rounded animate-pulse mb-1" />
                                        <div className="w-48 h-3 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Projects skeleton */}
                    <div className="surface rounded-xl p-6">
                        <div className="w-24 h-5 bg-muted rounded animate-pulse mb-4" />
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                    <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                                    <div className="flex-1">
                                        <div className="w-40 h-4 bg-muted rounded animate-pulse" />
                                    </div>
                                    <div className="w-16 h-6 bg-muted rounded-full animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
