'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  Phone,
  Globe,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteClientRecord, toggleClientStatus, type LeadStatus } from '@/app/actions';
import { NewClientModal } from '@/components/new-client-modal';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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
  isPending,
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
        'surface group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-secondary/50',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 rounded-md p-1.5',
          client.lead_status === 'active_client' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
        )}
      >
        <Building2
          className={cn(
            'h-3.5 w-3.5',
            client.lead_status === 'active_client'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {client.display_name}
        </h3>
        {(client.phone || client.website) && (
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            {client.phone && (
              <span className="flex items-center gap-1 truncate">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {client.phone}
              </span>
            )}
            {client.website && (
              <span className="flex items-center gap-1 truncate">
                <Globe className="h-3 w-3 flex-shrink-0" />
                {client.website.replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 flex-shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/clients/${client.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              onToggleStatus(client);
            }}
          >
            {client.lead_status === 'active_client' ? (
              <>
                <UserMinus className="mr-2 h-4 w-4" />
                Move to Inactive
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
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
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Link>
  );
}

function ClientRow({
  client,
  onDelete,
  onToggleStatus,
  isPending,
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
        'group flex items-center gap-4 rounded-lg px-3 py-3 transition-colors duration-200 hover:bg-secondary/50',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 rounded-lg p-2',
          client.lead_status === 'active_client' ? 'bg-emerald-500/10' : 'bg-yellow-500/10'
        )}
      >
        <Building2
          className={cn(
            'h-4 w-4',
            client.lead_status === 'active_client'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-yellow-600 dark:text-yellow-400'
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {client.display_name}
        </span>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {client.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {client.phone}
            </span>
          )}
          {client.website && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {client.website}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-1 text-xs',
            client.lead_status === 'active_client'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
          )}
        >
          {client.lead_status === 'active_client' ? 'Active' : 'Inactive'}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/clients/${client.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onToggleStatus(client);
              }}
            >
              {client.lead_status === 'active_client' ? (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Move to Inactive
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
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
              <Trash2 className="mr-2 h-4 w-4" />
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
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
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
  const activeClients = useMemo(
    () => searchFiltered.filter((c) => c.lead_status === 'active_client'),
    [searchFiltered]
  );
  const inactiveClients = useMemo(
    () => searchFiltered.filter((c) => c.lead_status === 'inactive_client'),
    [searchFiltered]
  );

  // Count clients by status
  const activeCount = initialClients.filter((c) => c.lead_status === 'active_client').length;
  const inactiveCount = initialClients.filter((c) => c.lead_status === 'inactive_client').length;

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

  async function handleToggleStatus(client: Client) {
    setPendingId(client.id);
    const newStatus = client.lead_status === 'active_client' ? 'inactive_client' : 'active_client';
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
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {initialClients.length}
            </span>
            <span className="text-sm text-muted-foreground">clients</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">{activeCount} Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">{inactiveCount} Inactive</span>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
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

      {/* Client Columns */}
      {searchFiltered.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active Clients Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-medium text-foreground">Active</h3>
              <span className="text-xs text-muted-foreground">({activeClients.length})</span>
            </div>
            {viewMode === 'grid' ? (
              <div className="space-y-1.5">
                {activeClients.map((client, index) => (
                  <div
                    key={client.id}
                    className="slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
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
                  <div className="surface rounded-lg p-4 text-center text-sm text-muted-foreground">
                    No active clients
                  </div>
                )}
              </div>
            ) : (
              <div className="surface space-y-0.5 rounded-xl p-2">
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
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <h3 className="text-sm font-medium text-foreground">Inactive</h3>
              <span className="text-xs text-muted-foreground">({inactiveClients.length})</span>
            </div>
            {viewMode === 'grid' ? (
              <div className="space-y-1.5">
                {inactiveClients.map((client, index) => (
                  <div
                    key={client.id}
                    className="slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
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
                  <div className="surface rounded-lg p-4 text-center text-sm text-muted-foreground">
                    No inactive clients
                  </div>
                )}
              </div>
            ) : (
              <div className="surface space-y-0.5 rounded-xl p-2">
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
