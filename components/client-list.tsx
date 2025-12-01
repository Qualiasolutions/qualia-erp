'use client';

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
    Building2,
    Phone,
    Globe,
    MapPin,
    MoreHorizontal,
    Trash2,
    Edit,
    Search,
    UserCheck,
    UserMinus,
    Plus,
    Inbox,
    LayoutGrid,
    List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteClientRecord, toggleClientStatus, type LeadStatus } from "@/app/actions";
import { NewClientModal } from "@/components/new-client-modal";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export type Client = {
    id: string;
    display_name: string;
    phone: string | null;
    website: string | null;
    billing_address: string | null;
    lead_status: LeadStatus;
    notes: string | null;
    last_contacted_at: string | null;
    created_at: string;
    creator: { id: string; full_name: string | null; email: string | null } | null;
    assigned: { id: string; full_name: string | null; email: string | null } | null;
};

type ViewMode = 'grid' | 'list';

interface ClientListProps {
    clients: Client[];
}

function ClientCard({
    client,
    onDelete,
    onToggleStatus,
    isPending
}: {
    client: Client;
    onDelete: (id: string) => void;
    onToggleStatus: (client: Client) => void;
    isPending: boolean;
}) {
    return (
        <Link
            href={`/clients/${client.id}`}
            className={cn(
                "block surface rounded-xl p-5 hover:bg-secondary/50 transition-all duration-200 group",
                isPending && "opacity-50 pointer-events-none"
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                        "p-2.5 rounded-lg transition-colors",
                        client.lead_status === "active_client"
                            ? "bg-emerald-500/10"
                            : "bg-yellow-500/10"
                    )}>
                        <Building2 className={cn(
                            "w-4 h-4",
                            client.lead_status === "active_client"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-yellow-600 dark:text-yellow-400"
                        )} />
                    </div>
                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {client.display_name}
                    </h3>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                onToggleStatus(client);
                            }}
                        >
                            {client.lead_status === "active_client" ? (
                                <>
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    Move to Inactive
                                </>
                            ) : (
                                <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Move to Active
                                </>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                onDelete(client.id);
                            }}
                            className="text-red-500"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
                {client.phone && (
                    <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="truncate">{client.phone}</span>
                    </div>
                )}
                {client.website && (
                    <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="truncate">{client.website}</span>
                    </div>
                )}
                {client.billing_address && (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{client.billing_address}</span>
                    </div>
                )}
            </div>

            {client.last_contacted_at && (
                <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    Last contacted:{" "}
                    {new Date(client.last_contacted_at).toLocaleDateString()}
                </div>
            )}
        </Link>
    );
}

function ClientRow({
    client,
    onDelete,
    onToggleStatus,
    isPending
}: {
    client: Client;
    onDelete: (id: string) => void;
    onToggleStatus: (client: Client) => void;
    isPending: boolean;
}) {
    return (
        <Link
            href={`/clients/${client.id}`}
            className={cn(
                "group flex items-center gap-4 px-3 py-3 hover:bg-secondary/50 rounded-lg transition-colors duration-200",
                isPending && "opacity-50 pointer-events-none"
            )}
        >
            <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                client.lead_status === "active_client"
                    ? "bg-emerald-500/10"
                    : "bg-yellow-500/10"
            )}>
                <Building2 className={cn(
                    "w-4 h-4",
                    client.lead_status === "active_client"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-yellow-600 dark:text-yellow-400"
                )} />
            </div>

            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate block">
                    {client.display_name}
                </span>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {client.phone && (
                        <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                        </span>
                    )}
                    {client.website && (
                        <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {client.website}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className={cn(
                    "px-2 py-1 text-xs rounded-full",
                    client.lead_status === "active_client"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                )}>
                    {client.lead_status === "active_client" ? "Active" : "Inactive"}
                </span>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                onToggleStatus(client);
                            }}
                        >
                            {client.lead_status === "active_client" ? (
                                <>
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    Move to Inactive
                                </>
                            ) : (
                                <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Move to Active
                                </>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                onDelete(client.id);
                            }}
                            className="text-red-500"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Link>
    );
}

export function ClientList({ clients: initialClients }: ClientListProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [pendingId, setPendingId] = useState<string | null>(null);

    // Filter clients by search
    const searchFiltered = useMemo(() => {
        if (!searchQuery.trim()) return initialClients;
        const query = searchQuery.toLowerCase();
        return initialClients.filter(
            (c) =>
                c.display_name?.toLowerCase().includes(query) ||
                c.phone?.toLowerCase().includes(query) ||
                c.website?.toLowerCase().includes(query) ||
                c.billing_address?.toLowerCase().includes(query)
        );
    }, [initialClients, searchQuery]);

    // Split into active and inactive
    const activeClients = useMemo(() =>
        searchFiltered.filter((c) => c.lead_status === "active_client"),
        [searchFiltered]
    );
    const inactiveClients = useMemo(() =>
        searchFiltered.filter((c) => c.lead_status === "inactive_client"),
        [searchFiltered]
    );

    // Count clients by status
    const activeCount = initialClients.filter(c => c.lead_status === "active_client").length;
    const inactiveCount = initialClients.filter(c => c.lead_status === "inactive_client").length;

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this client?")) return;
        setPendingId(id);
        startTransition(async () => {
            const result = await deleteClientRecord(id);
            if (result.success) {
                router.refresh();
            }
            setPendingId(null);
        });
    }

    async function handleToggleStatus(client: Client) {
        setPendingId(client.id);
        const newStatus = client.lead_status === "active_client" ? "inactive_client" : "active_client";
        startTransition(async () => {
            const result = await toggleClientStatus(client.id, newStatus);
            if (result.success) {
                router.refresh();
            }
            setPendingId(null);
        });
    }

    function handleClientCreated() {
        setIsNewClientModalOpen(false);
        router.refresh();
    }

    return (
        <div className="space-y-5">
            {/* Stats Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold text-foreground tabular-nums">{initialClients.length}</span>
                        <span className="text-sm text-muted-foreground">clients</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-muted-foreground">{activeCount} Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                            <span className="text-muted-foreground">{inactiveCount} Inactive</span>
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-1.5 rounded-md transition-all duration-200",
                            viewMode === 'grid'
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Grid view"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-1.5 rounded-md transition-all duration-200",
                            viewMode === 'list'
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="List view"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Client Columns */}
            {searchFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center surface rounded-xl">
                    <div className="p-4 rounded-xl bg-muted mb-4">
                        <Inbox className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium">No clients found</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        {searchQuery
                            ? "Try a different search term"
                            : "Get started by adding your first client"}
                    </p>
                    {!searchQuery && (
                        <Button
                            onClick={() => setIsNewClientModalOpen(true)}
                            className="bg-qualia-600 hover:bg-qualia-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Client
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Clients Column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h3 className="text-sm font-medium text-foreground">Active</h3>
                            <span className="text-xs text-muted-foreground">({activeClients.length})</span>
                        </div>
                        {viewMode === 'grid' ? (
                            <div className="space-y-3">
                                {activeClients.map((client, index) => (
                                    <div
                                        key={client.id}
                                        className="slide-in"
                                        style={{ animationDelay: `${index * 40}ms` }}
                                    >
                                        <ClientCard
                                            client={client}
                                            onDelete={handleDelete}
                                            onToggleStatus={handleToggleStatus}
                                            isPending={pendingId === client.id}
                                        />
                                    </div>
                                ))}
                                {activeClients.length === 0 && (
                                    <div className="surface rounded-xl p-6 text-center text-sm text-muted-foreground">
                                        No active clients
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-0.5 surface rounded-xl p-2">
                                {activeClients.map((client, index) => (
                                    <div
                                        key={client.id}
                                        className="slide-in"
                                        style={{ animationDelay: `${index * 25}ms` }}
                                    >
                                        <ClientRow
                                            client={client}
                                            onDelete={handleDelete}
                                            onToggleStatus={handleToggleStatus}
                                            isPending={pendingId === client.id}
                                        />
                                    </div>
                                ))}
                                {activeClients.length === 0 && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No active clients
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Inactive Clients Column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                            <h3 className="text-sm font-medium text-foreground">Inactive</h3>
                            <span className="text-xs text-muted-foreground">({inactiveClients.length})</span>
                        </div>
                        {viewMode === 'grid' ? (
                            <div className="space-y-3">
                                {inactiveClients.map((client, index) => (
                                    <div
                                        key={client.id}
                                        className="slide-in"
                                        style={{ animationDelay: `${index * 40}ms` }}
                                    >
                                        <ClientCard
                                            client={client}
                                            onDelete={handleDelete}
                                            onToggleStatus={handleToggleStatus}
                                            isPending={pendingId === client.id}
                                        />
                                    </div>
                                ))}
                                {inactiveClients.length === 0 && (
                                    <div className="surface rounded-xl p-6 text-center text-sm text-muted-foreground">
                                        No inactive clients
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-0.5 surface rounded-xl p-2">
                                {inactiveClients.map((client, index) => (
                                    <div
                                        key={client.id}
                                        className="slide-in"
                                        style={{ animationDelay: `${index * 25}ms` }}
                                    >
                                        <ClientRow
                                            client={client}
                                            onDelete={handleDelete}
                                            onToggleStatus={handleToggleStatus}
                                            isPending={pendingId === client.id}
                                        />
                                    </div>
                                ))}
                                {inactiveClients.length === 0 && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No inactive clients
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <NewClientModal
                open={isNewClientModalOpen}
                onOpenChange={setIsNewClientModalOpen}
                onSuccess={handleClientCreated}
            />
        </div>
    );
}
