import { Suspense } from "react";
import { TeamDetailClient } from "./client";

function TeamDetailSkeleton() {
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

export default function TeamDetailPage() {
    return (
        <Suspense fallback={<TeamDetailSkeleton />}>
            <TeamDetailClient />
        </Suspense>
    );
}
