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
  Columns3,
  Folder,
  Calendar,
  ArrowUpDown,
  MapPin,
  FileText,
  ToggleLeft,
  ToggleRight,
  Skull,
  UserCheck,
  UserMinus,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type ViewMode = 'grid' | 'list' | 'columns';
type SortBy = 'status' | 'name' | 'recent' | 'contacted' | 'projects';

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

function getStatusConfig(status: LeadStatus) {
  switch (status) {
    case 'active_client':
      return {
        label: 'Active',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        hoverBg: 'hover:bg-emerald-500/20',
        icon: ToggleRight,
        iconBg: 'from-emerald-500/20 to-emerald-500/5',
      };
    case 'inactive_client':
      return {
        label: 'Inactive',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        hoverBg: 'hover:bg-amber-500/20',
        icon: ToggleLeft,
        iconBg: 'from-amber-500/20 to-amber-500/5',
      };
    case 'dead_lead':
      return {
        label: 'Dead Lead',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/10',
        hoverBg: 'hover:bg-red-500/20',
        icon: Skull,
        iconBg: 'from-red-500/20 to-red-500/5',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-muted-foreground',
        bg: 'bg-muted',
        hoverBg: 'hover:bg-muted/80',
        icon: ToggleLeft,
        iconBg: 'from-muted to-muted/50',
      };
  }
}

type ClientStatus = 'active_client' | 'inactive_client' | 'dead_lead';

function ClientCard({
  client,
  onDelete,
  onChangeStatus,
  onOpenDetail,
  isPending,
}: {
  client: Client;
  onDelete: (id: string) => void;
  onChangeStatus: (client: Client, status: ClientStatus) => void;
  onOpenDetail: (client: Client) => void;
  isPending: boolean;
}) {
  const projectCount = client.projects?.length || 0;
  const statusConfig = getStatusConfig(client.lead_status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={() => onOpenDetail(client)}
      className={cn(
        'surface group relative flex cursor-pointer flex-col gap-3 rounded-xl p-4 transition-all duration-200 hover:shadow-md',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br',
              statusConfig.iconBg
            )}
          >
            <Building2 className={cn('h-5 w-5', statusConfig.color)} />
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

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all',
                  statusConfig.bg,
                  statusConfig.hoverBg,
                  statusConfig.color
                )}
              >
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onChangeStatus(client, 'active_client')}>
                <UserCheck className="mr-2 h-4 w-4 text-emerald-500" />
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus(client, 'inactive_client')}>
                <UserMinus className="mr-2 h-4 w-4 text-amber-500" />
                Inactive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus(client, 'dead_lead')}>
                <Skull className="mr-2 h-4 w-4 text-red-500" />
                Dead Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Options */}
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
      <div
        className="space-y-1.5 text-xs text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
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
  onChangeStatus,
  onOpenDetail,
  isPending,
}: {
  client: Client;
  onDelete: (id: string) => void;
  onChangeStatus: (client: Client, status: ClientStatus) => void;
  onOpenDetail: (client: Client) => void;
  isPending: boolean;
}) {
  const projectCount = client.projects?.length || 0;
  const statusConfig = getStatusConfig(client.lead_status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={() => onOpenDetail(client)}
      className={cn(
        'group flex cursor-pointer items-center gap-4 rounded-lg px-4 py-3 transition-colors duration-200 hover:bg-secondary/50',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div className="relative">
        <div
          className={cn('flex h-10 w-10 items-center justify-center rounded-lg', statusConfig.bg)}
        >
          <Building2 className={cn('h-4 w-4', statusConfig.color)} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {client.display_name}
        </span>
        <div
          className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
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

      {/* Status Dropdown */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                statusConfig.bg,
                statusConfig.hoverBg,
                statusConfig.color
              )}
            >
              <StatusIcon className="h-4 w-4" />
              {statusConfig.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onChangeStatus(client, 'active_client')}>
              <UserCheck className="mr-2 h-4 w-4 text-emerald-500" />
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeStatus(client, 'inactive_client')}>
              <UserMinus className="mr-2 h-4 w-4 text-amber-500" />
              Inactive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeStatus(client, 'dead_lead')}>
              <Skull className="mr-2 h-4 w-4 text-red-500" />
              Dead Lead
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}

// Client Detail Modal
function ClientDetailModal({
  client,
  open,
  onOpenChange,
}: {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!client) return null;
  const statusConfig = getStatusConfig(client.lead_status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br',
                statusConfig.iconBg
              )}
            >
              <Building2 className={cn('h-6 w-6', statusConfig.color)} />
            </div>
            <div>
              <DialogTitle className="text-lg">{client.display_name}</DialogTitle>
              <DialogDescription>Client details and contact information</DialogDescription>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                  statusConfig.bg,
                  statusConfig.color
                )}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
            <div className="space-y-2">
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.phone}</span>
                </a>
              )}
              {client.website && (
                <a
                  href={
                    client.website.startsWith('http') ? client.website : `https://${client.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.website}</span>
                </a>
              )}
              {client.billing_address && (
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.billing_address}</span>
                </div>
              )}
              {!client.phone && !client.website && !client.billing_address && (
                <p className="text-sm text-muted-foreground">No contact information available</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
              </div>
            </div>
          )}

          {/* Projects */}
          {client.projects && client.projects.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Projects ({client.projects.length})
              </h4>
              <div className="flex items-center gap-2 rounded-lg bg-qualia-500/10 p-3">
                <Folder className="h-4 w-4 text-qualia-500" />
                <span className="text-sm font-medium text-qualia-500">
                  {client.projects.length} project{client.projects.length !== 1 ? 's' : ''}{' '}
                  connected
                </span>
              </div>
            </div>
          )}

          {/* Assigned */}
          {client.assigned && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Assigned To</h4>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(client.assigned.full_name || 'U')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{client.assigned.full_name}</p>
                  {client.assigned.email && (
                    <p className="text-xs text-muted-foreground">{client.assigned.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

  // Status priority for sorting (active first, then inactive, then dead)
  const statusPriority: Record<LeadStatus, number> = {
    active_client: 0,
    inactive_client: 1,
    dead_lead: 2,
    // These are filtered out but needed for type safety
    dropped: 3,
    cold: 4,
    hot: 5,
  };

  // Sort clients
  const sortedClients = useMemo(() => {
    const sorted = [...searchFiltered];
    switch (sortBy) {
      case 'status':
        sorted.sort((a, b) => {
          const statusDiff = statusPriority[a.lead_status] - statusPriority[b.lead_status];
          if (statusDiff !== 0) return statusDiff;
          // Within same status, sort by project count (most first), then name
          const projectDiff = (b.projects?.length || 0) - (a.projects?.length || 0);
          if (projectDiff !== 0) return projectDiff;
          return a.display_name.localeCompare(b.display_name);
        });
        break;
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
  }, [searchFiltered, sortBy, statusPriority]);

  // Group clients by status for column view
  const groupedClients = useMemo(() => {
    const active = searchFiltered.filter((c) => c.lead_status === 'active_client');
    const inactive = searchFiltered.filter((c) => c.lead_status === 'inactive_client');
    const dead = searchFiltered.filter((c) => c.lead_status === 'dead_lead');

    // Sort each group by project count, then name
    const sortGroup = (clients: Client[]) =>
      clients.sort((a, b) => {
        const projectDiff = (b.projects?.length || 0) - (a.projects?.length || 0);
        if (projectDiff !== 0) return projectDiff;
        return a.display_name.localeCompare(b.display_name);
      });

    return {
      active: sortGroup(active),
      inactive: sortGroup(inactive),
      dead: sortGroup(dead),
    };
  }, [searchFiltered]);

  // Count clients by status
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

  async function handleChangeStatus(
    client: Client,
    newStatus: 'active_client' | 'inactive_client' | 'dead_lead'
  ) {
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
          {/* Sort Dropdown - only show when not in columns view */}
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

          {/* View Toggle */}
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
