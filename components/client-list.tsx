'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Search,
  Plus,
  Inbox,
  LayoutGrid,
  List,
  Columns3,
  ArrowUpDown,
  UserCheck,
  UserMinus,
  Skull,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { deleteClientRecord, toggleClientStatus } from '@/app/actions';
import { NewClientModal } from '@/components/new-client-modal';
import { ClientCard } from '@/components/client-card';
import { ClientRow } from '@/components/client-row';
import { ClientDetailModal } from '@/components/client-detail-modal';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { type Client, type ClientStatus, statusPriority } from '@/lib/client-utils';

type ViewMode = 'grid' | 'list' | 'columns';
type SortBy = 'status' | 'name' | 'recent' | 'contacted' | 'projects';

interface ClientListProps {
  clients: Client[];
}

export type { Client };

export function ClientList({ clients: initialClients }: ClientListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('columns');
  const [sortBy, setSortBy] = useState<SortBy>('status');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  // Sort clients
  const sortedClients = useMemo(() => {
    const sorted = [...searchFiltered];
    switch (sortBy) {
      case 'status':
        sorted.sort((a, b) => {
          const statusDiff = statusPriority[a.lead_status] - statusPriority[b.lead_status];
          if (statusDiff !== 0) return statusDiff;
          const projectDiff = (b.projects?.length || 0) - (a.projects?.length || 0);
          if (projectDiff !== 0) return projectDiff;
          const aName = a.display_name || '';
          const bName = b.display_name || '';
          return aName.localeCompare(bName);
        });
        break;
      case 'name':
        sorted.sort((a, b) => {
          const aName = a.display_name || '';
          const bName = b.display_name || '';
          return aName.localeCompare(bName);
        });
        break;
      case 'recent':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'contacted':
        sorted.sort((a, b) => {
          if (!a.last_contacted_at) return 1;
          if (!b.last_contacted_at) return -1;
          return new Date(b.last_contacted_at).getTime() - new Date(a.last_contacted_at).getTime();
        });
        break;
      case 'projects':
        sorted.sort((a, b) => (b.projects?.length || 0) - (a.projects?.length || 0));
        break;
    }
    return sorted;
  }, [searchFiltered, sortBy]);

  // Group clients by status for column view
  const groupedClients = useMemo(() => {
    const active = searchFiltered.filter((c) => c.lead_status === 'active_client');
    const inactive = searchFiltered.filter((c) => c.lead_status === 'inactive_client');
    const dead = searchFiltered.filter((c) => c.lead_status === 'dead_lead');

    const sortGroup = (clients: Client[]) =>
      clients.sort((a, b) => {
        const projectDiff = (b.projects?.length || 0) - (a.projects?.length || 0);
        if (projectDiff !== 0) return projectDiff;
        const aName = a.display_name || '';
        const bName = b.display_name || '';
        return aName.localeCompare(bName);
      });

    return {
      active: sortGroup(active),
      inactive: sortGroup(inactive),
      dead: sortGroup(dead),
    };
  }, [searchFiltered]);

  const activeCount = groupedClients.active.length;
  const inactiveCount = groupedClients.inactive.length;
  const deadLeadCount = groupedClients.dead.length;

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this client?')) return;
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteClientRecord(id);
      if (result.success) {
        router.refresh();
      }
      setPendingId(null);
    });
  }

  async function handleChangeStatus(client: Client, newStatus: ClientStatus) {
    if (client.lead_status === newStatus) return;
    setPendingId(client.id);
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

  function handleOpenDetail(client: Client) {
    setSelectedClient(client);
    setIsDetailModalOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {initialClients.length}
            </span>
            <span className="text-sm text-muted-foreground">clients</span>
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-foreground">{activeCount}</span>
              <span className="text-muted-foreground">active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="font-medium text-foreground">{inactiveCount}</span>
              <span className="text-muted-foreground">inactive</span>
            </div>
            {deadLeadCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="font-medium text-foreground">{deadLeadCount}</span>
                <span className="text-muted-foreground">dead</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {viewMode !== 'columns' && (
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">By Status</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="contacted">Last Contacted</SelectItem>
                <SelectItem value="projects">Most Projects</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
            <button
              onClick={() => setViewMode('columns')}
              className={cn(
                'rounded-md p-1.5 transition-all duration-200',
                viewMode === 'columns'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Columns view"
            >
              <Columns3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md p-1.5 transition-all duration-200',
                viewMode === 'grid'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-1.5 transition-all duration-200',
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Client List */}
      {sortedClients.length === 0 ? (
        <div className="surface flex h-64 flex-col items-center justify-center rounded-xl text-center">
          <div className="mb-4 rounded-xl bg-muted p-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">No clients found</p>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            {searchQuery
              ? 'Try a different search term'
              : 'Get started by adding your first client'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setIsNewClientModalOpen(true)}
              className="bg-qualia-600 hover:bg-qualia-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          )}
        </div>
      ) : viewMode === 'columns' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Active Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">Active</span>
              <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                {groupedClients.active.length}
              </span>
            </div>
            <div className="space-y-2">
              {groupedClients.active.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground">No active clients</p>
                </div>
              ) : (
                groupedClients.active.map((client, index) => (
                  <div
                    key={client.id}
                    className="slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <ClientCard
                      client={client}
                      onDelete={handleDelete}
                      onChangeStatus={handleChangeStatus}
                      onOpenDetail={handleOpenDetail}
                      isPending={pendingId === client.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inactive Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
                <UserMinus className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">Inactive</span>
              <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                {groupedClients.inactive.length}
              </span>
            </div>
            <div className="space-y-2">
              {groupedClients.inactive.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground">No inactive clients</p>
                </div>
              ) : (
                groupedClients.inactive.map((client, index) => (
                  <div
                    key={client.id}
                    className="slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <ClientCard
                      client={client}
                      onDelete={handleDelete}
                      onChangeStatus={handleChangeStatus}
                      onOpenDetail={handleOpenDetail}
                      isPending={pendingId === client.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dead Leads Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10">
                <Skull className="h-3.5 w-3.5 text-red-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">Dead Leads</span>
              <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                {groupedClients.dead.length}
              </span>
            </div>
            <div className="space-y-2">
              {groupedClients.dead.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground">No dead leads</p>
                </div>
              ) : (
                groupedClients.dead.map((client, index) => (
                  <div
                    key={client.id}
                    className="slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <ClientCard
                      client={client}
                      onDelete={handleDelete}
                      onChangeStatus={handleChangeStatus}
                      onOpenDetail={handleOpenDetail}
                      isPending={pendingId === client.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedClients.map((client, index) => (
            <div key={client.id} className="slide-in" style={{ animationDelay: `${index * 30}ms` }}>
              <ClientCard
                client={client}
                onDelete={handleDelete}
                onChangeStatus={handleChangeStatus}
                onOpenDetail={handleOpenDetail}
                isPending={pendingId === client.id}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="surface space-y-0.5 rounded-xl p-2">
          {sortedClients.map((client, index) => (
            <div key={client.id} className="slide-in" style={{ animationDelay: `${index * 25}ms` }}>
              <ClientRow
                client={client}
                onDelete={handleDelete}
                onChangeStatus={handleChangeStatus}
                onOpenDetail={handleOpenDetail}
                isPending={pendingId === client.id}
              />
            </div>
          ))}
        </div>
      )}

      <NewClientModal
        open={isNewClientModalOpen}
        onOpenChange={setIsNewClientModalOpen}
        onSuccess={handleClientCreated}
      />

      <ClientDetailModal
        client={selectedClient}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  );
}
