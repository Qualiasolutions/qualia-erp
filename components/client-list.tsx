'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Building2,
  Phone,
  Globe,
  MoreHorizontal,
  Trash2,
  Search,
  Plus,
  Inbox,
  LayoutGrid,
  List,
  Folder,
  Calendar,
  ArrowUpDown,
  MapPin,
  FileText,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { deleteClientRecord, toggleClientStatus, type LeadStatus } from '@/app/actions';
import { NewClientModal } from '@/components/new-client-modal';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

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
  projects?: { id: string }[];
};

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'recent' | 'contacted' | 'projects';

interface ClientListProps {
  clients: Client[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
  const projectCount = client.projects?.length || 0;
  const isActive = client.lead_status === 'active_client';

  return (
    <div
      className={cn(
        'surface group relative flex flex-col gap-3 rounded-xl p-4 transition-all duration-200',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      {/* Header: Avatar + Name + Toggle */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br',
              isActive ? 'from-emerald-500/20 to-emerald-500/5' : 'from-amber-500/20 to-amber-500/5'
            )}
          >
            <Building2
              className={cn(
                'h-5 w-5',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{client.display_name}</h3>
          {client.assigned && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px]">
                  {getInitials(client.assigned.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{client.assigned.full_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Button */}
          <button
            onClick={() => onToggleStatus(client)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all',
              isActive
                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
            )}
          >
            {isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {isActive ? 'Active' : 'Inactive'}
          </button>

          {/* Delete */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 flex-shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-red-500">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {client.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
            <a href={`tel:${client.phone}`} className="transition-colors hover:text-foreground">
              {client.phone}
            </a>
          </div>
        )}
        {client.website && (
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
            <a
              href={
                client.website.startsWith('http') ? client.website : `https://${client.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="truncate transition-colors hover:text-foreground"
            >
              {client.website.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          </div>
        )}
        {client.billing_address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
            <span className="truncate">{client.billing_address}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <p className="line-clamp-2">{client.notes}</p>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex items-center gap-4 border-t border-border/50 pt-3 text-xs">
        {projectCount > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Folder className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{projectCount}</span>
            <span>project{projectCount !== 1 ? 's' : ''}</span>
          </div>
        )}
        {client.last_contacted_at && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {formatDistanceToNow(new Date(client.last_contacted_at), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
    </div>
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
  const projectCount = client.projects?.length || 0;
  const isActive = client.lead_status === 'active_client';

  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-lg px-4 py-3 transition-colors duration-200 hover:bg-secondary/50',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div className="relative">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            isActive ? 'bg-emerald-500/10' : 'bg-amber-500/10'
          )}
        >
          <Building2
            className={cn(
              'h-4 w-4',
              isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            )}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {client.display_name}
        </span>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Phone className="h-3 w-3" />
              {client.phone}
            </a>
          )}
          {client.website && (
            <a
              href={
                client.website.startsWith('http') ? client.website : `https://${client.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Globe className="h-3 w-3" />
              {client.website.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          )}
          {client.assigned && (
            <span className="flex items-center gap-1">
              <Avatar className="h-3.5 w-3.5">
                <AvatarFallback className="text-[7px]">
                  {getInitials(client.assigned.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              {client.assigned.full_name}
            </span>
          )}
        </div>
      </div>

      {projectCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Folder className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{projectCount}</span>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => onToggleStatus(client)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
          isActive
            ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
        )}
      >
        {isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
        {isActive ? 'Active' : 'Inactive'}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-red-500">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ClientList({ clients: initialClients }: ClientListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
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

  // Sort clients
  const sortedClients = useMemo(() => {
    const sorted = [...searchFiltered];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.display_name.localeCompare(b.display_name));
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="contacted">Last Contacted</SelectItem>
              <SelectItem value="projects">Most Projects</SelectItem>
            </SelectContent>
          </Select>

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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedClients.map((client, index) => (
            <div key={client.id} className="slide-in" style={{ animationDelay: `${index * 30}ms` }}>
              <ClientCard
                client={client}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
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
                onToggleStatus={handleToggleStatus}
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
    </div>
  );
}
