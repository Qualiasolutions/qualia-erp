import { Suspense } from "react";
import { connection } from "next/server";
import { getClients } from "@/app/actions";
import { ClientList, type Client } from "@/components/client-list";
import { NewClientModal } from "@/components/new-client-modal";
import { Building2 } from "lucide-react";

async function ClientListLoader() {
    await connection();
    const data = await getClients();

    // Only show clients (active_client and inactive_client), not leads
    const clients = (data as Client[]).filter(c =>
        c.lead_status === "active_client" || c.lead_status === "inactive_client"
    );

    return <ClientList clients={clients} />;
}

function ClientListSkeleton() {
    return (
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
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary">
                    <div className="w-8 h-8 bg-muted rounded animate-pulse" />
                    <div className="w-8 h-8 bg-muted rounded animate-pulse" />
                </div>
            </div>

            {/* Search skeleton */}
            <div className="w-full h-10 bg-muted rounded-md animate-pulse" />

            {/* Columns skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active column */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="w-12 h-4 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
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
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Inactive column */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <div className="w-14 h-4 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="space-y-3">
                        {[...Array(2)].map((_, i) => (
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
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ClientsPage() {
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
                <div className="flex items-center gap-2">
                    <NewClientModal />
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={<ClientListSkeleton />}>
                    <ClientListLoader />
                </Suspense>
            </div>
        </div>
    );
}
