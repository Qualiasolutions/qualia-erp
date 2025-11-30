"use client";

import { useState, useEffect } from "react";
import { Plus, Building2, Phone, Globe, MapPin, MoreHorizontal, Trash2, Edit, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getClients, deleteClientRecord, type LeadStatus } from "@/app/actions";
import { NewClientModal } from "@/components/new-client-modal";
import { useWorkspace } from "@/components/workspace-provider";
import Link from "next/link";

type Client = {
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

const tabs = [
  { id: null, label: "All", icon: Building2 },
  { id: "dropped" as LeadStatus, label: "Dropped Leads", color: "bg-gray-500" },
  { id: "cold" as LeadStatus, label: "Cold Leads", color: "bg-blue-500" },
  { id: "hot" as LeadStatus, label: "Hot Leads", color: "bg-orange-500" },
  { id: "active_client" as LeadStatus, label: "Active Clients", color: "bg-green-500" },
  { id: "inactive_client" as LeadStatus, label: "Inactive Clients", color: "bg-yellow-500" },
];

const statusColors: Record<LeadStatus, string> = {
  dropped: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cold: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  hot: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  active_client: "bg-green-500/20 text-green-400 border-green-500/30",
  inactive_client: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const statusLabels: Record<LeadStatus, string> = {
  dropped: "Dropped",
  cold: "Cold Lead",
  hot: "Hot Lead",
  active_client: "Active",
  inactive_client: "Inactive",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<LeadStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    loadClients();
  }, [currentWorkspace]);

  useEffect(() => {
    filterClients();
  }, [clients, activeTab, searchQuery]);

  async function loadClients() {
    setIsLoading(true);
    const data = await getClients();
    setClients(data as Client[]);
    setIsLoading(false);
  }

  function filterClients() {
    let filtered = clients;

    // Filter by tab
    if (activeTab) {
      filtered = filtered.filter((c) => c.lead_status === activeTab);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.display_name?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query) ||
          c.website?.toLowerCase().includes(query) ||
          c.billing_address?.toLowerCase().includes(query)
      );
    }

    setFilteredClients(filtered);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this client?")) return;
    const result = await deleteClientRecord(id);
    if (result.success) {
      loadClients();
    }
  }

  // Count clients by status
  const statusCounts = clients.reduce(
    (acc, client) => {
      acc[client.lead_status] = (acc[client.lead_status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your clients and track leads through the sales pipeline
          </p>
        </div>
        <Button
          onClick={() => setIsNewClientModalOpen(true)}
          className="bg-qualia-600 hover:bg-qualia-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-muted/50 p-1 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id || "all"}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap
              ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }
            `}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.color && (
              <span className={`w-2 h-2 rounded-full ${tab.color}`} />
            )}
            {tab.label}
            <span className="text-xs text-muted-foreground ml-1">
              ({tab.id ? statusCounts[tab.id] || 0 : clients.length})
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4 animate-pulse"
            >
              <div className="h-5 bg-muted rounded w-3/4 mb-3" />
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No clients found</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {activeTab
              ? `No clients with status "${statusLabels[activeTab]}"`
              : searchQuery
              ? "Try a different search term"
              : "Get started by adding your first client"}
          </p>
          {!searchQuery && !activeTab && (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="block bg-card border border-border rounded-xl p-4 hover:border-qualia-600/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate group-hover:text-qualia-400 transition-colors">
                    {client.display_name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs ${statusColors[client.lead_status]}`}
                  >
                    {statusLabels[client.lead_status]}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                        handleDelete(client.id);
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
          ))}
        </div>
      )}

      <NewClientModal
        open={isNewClientModalOpen}
        onOpenChange={setIsNewClientModalOpen}
        onSuccess={loadClients}
      />
    </div>
  );
}
