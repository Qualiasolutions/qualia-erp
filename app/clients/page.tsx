"use client";

import { useState, useEffect } from "react";
import { Plus, Building2, Phone, Globe, MapPin, MoreHorizontal, Trash2, Edit, Search, Users, Target, ChevronDown } from "lucide-react";
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

// Main category tabs
type MainTab = "all" | "leads" | "clients";

// Lead sub-tabs
type LeadSubTab = "all_leads" | "hot" | "cold" | "dropped";

// Client sub-tabs
type ClientSubTab = "all_clients" | "active_client" | "inactive_client";

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
  const [mainTab, setMainTab] = useState<MainTab>("all");
  const [leadSubTab, setLeadSubTab] = useState<LeadSubTab>("all_leads");
  const [clientSubTab, setClientSubTab] = useState<ClientSubTab>("all_clients");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    loadClients();
  }, [currentWorkspace]);

  useEffect(() => {
    filterClients();
  }, [clients, mainTab, leadSubTab, clientSubTab, searchQuery]);

  async function loadClients() {
    setIsLoading(true);
    const data = await getClients();
    setClients(data as Client[]);
    setIsLoading(false);
  }

  function filterClients() {
    let filtered = clients;

    // Filter by main tab and sub-tabs
    if (mainTab === "leads") {
      // Filter to only leads (hot, cold, dropped)
      filtered = filtered.filter((c) => ["hot", "cold", "dropped"].includes(c.lead_status));

      // Apply lead sub-tab filter
      if (leadSubTab !== "all_leads") {
        filtered = filtered.filter((c) => c.lead_status === leadSubTab);
      }
    } else if (mainTab === "clients") {
      // Filter to only clients (active, inactive)
      filtered = filtered.filter((c) => ["active_client", "inactive_client"].includes(c.lead_status));

      // Apply client sub-tab filter
      if (clientSubTab !== "all_clients") {
        filtered = filtered.filter((c) => c.lead_status === clientSubTab);
      }
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

  // Calculate group counts
  const leadsCount = (statusCounts["hot"] || 0) + (statusCounts["cold"] || 0) + (statusCounts["dropped"] || 0);
  const clientsCount = (statusCounts["active_client"] || 0) + (statusCounts["inactive_client"] || 0);

  // Get current filter label for empty state
  const getCurrentFilterLabel = () => {
    if (mainTab === "leads") {
      if (leadSubTab === "all_leads") return "leads";
      return statusLabels[leadSubTab as LeadStatus];
    }
    if (mainTab === "clients") {
      if (clientSubTab === "all_clients") return "clients";
      return statusLabels[clientSubTab as LeadStatus];
    }
    return "";
  };

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

      {/* Main Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-muted/50 p-1 rounded-lg">
        <button
          onClick={() => setMainTab("all")}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors
            ${mainTab === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }
          `}
        >
          <Building2 className="w-4 h-4" />
          All
          <span className="text-xs text-muted-foreground ml-1">({clients.length})</span>
        </button>

        <button
          onClick={() => setMainTab("leads")}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors
            ${mainTab === "leads"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }
          `}
        >
          <Target className="w-4 h-4" />
          Leads
          <span className="text-xs text-muted-foreground ml-1">({leadsCount})</span>
        </button>

        <button
          onClick={() => setMainTab("clients")}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors
            ${mainTab === "clients"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }
          `}
        >
          <Users className="w-4 h-4" />
          Clients
          <span className="text-xs text-muted-foreground ml-1">({clientsCount})</span>
        </button>
      </div>

      {/* Sub-tabs for Leads */}
      {mainTab === "leads" && (
        <div className="flex items-center gap-1 mb-4 pl-2">
          <button
            onClick={() => setLeadSubTab("all_leads")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${leadSubTab === "all_leads"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            All Leads
            <span className="text-muted-foreground">({leadsCount})</span>
          </button>
          <button
            onClick={() => setLeadSubTab("hot")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${leadSubTab === "hot"
                ? "bg-orange-500/20 text-orange-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Hot
            <span className="text-muted-foreground">({statusCounts["hot"] || 0})</span>
          </button>
          <button
            onClick={() => setLeadSubTab("cold")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${leadSubTab === "cold"
                ? "bg-blue-500/20 text-blue-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Cold
            <span className="text-muted-foreground">({statusCounts["cold"] || 0})</span>
          </button>
          <button
            onClick={() => setLeadSubTab("dropped")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${leadSubTab === "dropped"
                ? "bg-gray-500/20 text-gray-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            Dropped
            <span className="text-muted-foreground">({statusCounts["dropped"] || 0})</span>
          </button>
        </div>
      )}

      {/* Sub-tabs for Clients */}
      {mainTab === "clients" && (
        <div className="flex items-center gap-1 mb-4 pl-2">
          <button
            onClick={() => setClientSubTab("all_clients")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${clientSubTab === "all_clients"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            All Clients
            <span className="text-muted-foreground">({clientsCount})</span>
          </button>
          <button
            onClick={() => setClientSubTab("active_client")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${clientSubTab === "active_client"
                ? "bg-green-500/20 text-green-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Active
            <span className="text-muted-foreground">({statusCounts["active_client"] || 0})</span>
          </button>
          <button
            onClick={() => setClientSubTab("inactive_client")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${clientSubTab === "inactive_client"
                ? "bg-yellow-500/20 text-yellow-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Inactive
            <span className="text-muted-foreground">({statusCounts["inactive_client"] || 0})</span>
          </button>
        </div>
      )}

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
            {mainTab !== "all"
              ? `No ${getCurrentFilterLabel()} found`
              : searchQuery
              ? "Try a different search term"
              : "Get started by adding your first client"}
          </p>
          {!searchQuery && mainTab === "all" && (
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
