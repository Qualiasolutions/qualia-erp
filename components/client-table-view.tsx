'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  X,
  Inbox,
  MoreVertical,
  Trash2,
  Phone,
  Globe,
  UserCheck,
  UserMinus,
  Skull,
  Pencil,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials, getStatusConfig, type Client, type ClientStatus } from '@/lib/client-utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteClientRecord, toggleClientStatus } from '@/app/actions';
import { ClientDetailModal } from '@/components/client-detail-modal';
import { EditClientModal } from '@/components/edit-client-modal';
import { ClientCardView } from '@/components/client-card-view';

type SortField = 'name' | 'status' | 'projects' | 'assigned' | 'last_contact' | 'created';
type SortDirection = 'asc' | 'desc';

// Sortable header component
function SortableHeader({
  field,
  label,
  currentField,
  direction,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = field === currentField;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

// Table row component
const ClientTableRow = React.memo(function ClientTableRow({
  client,
  rowIndex,
  onOpenDetail,
  onOpenEdit,
}: {
  client: Client;
  rowIndex: number;
  onOpenDetail: (client: Client) => void;
  onOpenEdit: (client: Client) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRowClick = () => {
    onOpenDetail(client);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    startTransition(async () => {
      const result = await deleteClientRecord(client.id);
      if (result.success) {
        router.refresh();
      } else {
        alert('Failed to delete client');
      }
    });
  };

  const handleStatusChange = (newStatus: ClientStatus) => {
    if (client.lead_status === newStatus) return;
    startTransition(async () => {
      const result = await toggleClientStatus(client.id, newStatus);
      if (result.success) {
        router.refresh();
      }
    });
  };

  const statusConfig = getStatusConfig(client.lead_status);
  const projectCount = client.projects?.length || 0;

  return (
    <tr
      onClick={handleRowClick}
      className={cn(
        'group cursor-pointer border-b border-border/40 transition-colors',
        'hover:bg-secondary/40',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      {/* ID Column */}
      <td className="px-4 py-3 text-sm text-muted-foreground">#{rowIndex + 1}</td>

      {/* Client Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-500/10 text-xs text-emerald-500">
              {getInitials(client.display_name || 'C')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="block truncate font-medium text-foreground transition-colors group-hover:text-qualia-500">
              {client.display_name || 'Unnamed Client'}
            </span>
            {client.billing_address && (
              <span className="block truncate text-xs text-muted-foreground">
                {client.billing_address}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Status Badge */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusConfig.bg,
            statusConfig.color
          )}
        >
          <statusConfig.icon className="h-3 w-3" />
          {statusConfig.label}
        </span>
      </td>

      {/* Projects Count */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'text-sm tabular-nums',
            projectCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground/50'
          )}
        >
          {projectCount}
        </span>
      </td>

      {/* Assigned To */}
      <td className="px-4 py-3">
        {client.assigned ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-qualia-500/10 text-xs text-qualia-500">
                {getInitials(client.assigned.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[80px] truncate text-sm text-muted-foreground">
              {client.assigned.full_name?.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/50">-</span>
        )}
      </td>

      {/* Last Contact */}
      <td className="px-4 py-3">
        {client.last_contacted_at ? (
          <span
            className="text-sm text-muted-foreground"
            title={format(new Date(client.last_contacted_at), 'PPP')}
          >
            {formatDistanceToNow(new Date(client.last_contacted_at), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50">Never</span>
        )}
      </td>

      {/* Website */}
      <td className="px-4 py-3">
        {client.website ? (
          <a
            href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-qualia-500"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="max-w-[100px] truncate">
              {client.website.replace(/^https?:\/\//, '')}
            </span>
          </a>
        ) : (
          <span className="text-sm text-muted-foreground/50">-</span>
        )}
      </td>

      {/* Phone */}
      <td className="px-4 py-3">
        {client.phone ? (
          <a
            href={`tel:${client.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-qualia-500"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>{client.phone}</span>
          </a>
        ) : (
          <span className="text-sm text-muted-foreground/50">-</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-2 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onOpenEdit(client)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit client
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusChange('active_client')}>
              <UserCheck className="mr-2 h-4 w-4 text-emerald-500" />
              Mark Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('inactive_client')}>
              <UserMinus className="mr-2 h-4 w-4 text-amber-500" />
              Mark Inactive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('dead_lead')}>
              <Skull className="mr-2 h-4 w-4 text-red-500" />
              Mark Dead Lead
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

interface ClientTableViewProps {
  clients: Client[];
}

export function ClientTableView({ clients }: ClientTableViewProps) {
  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('active_client');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Edit modal state
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Extract unique assigned users
  const assignedUsers = useMemo(() => {
    const uniqueUsers = new Map<string, { id: string; full_name: string | null }>();
    clients.forEach((c) => {
      if (c.assigned) {
        uniqueUsers.set(c.assigned.id, { id: c.assigned.id, full_name: c.assigned.full_name });
      }
    });
    return Array.from(uniqueUsers.values());
  }, [clients]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Stats
  const activeCount = clients.filter((c) => c.lead_status === 'active_client').length;
  const inactiveCount = clients.filter((c) => c.lead_status === 'inactive_client').length;

  // Filtered and sorted clients
  const processedClients = useMemo(() => {
    let result = [...clients];

    // Apply filters
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.lead_status === statusFilter);
    }
    if (assignedFilter !== 'all') {
      result = result.filter((c) => c.assigned?.id === assignedFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.display_name?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query) ||
          c.website?.toLowerCase().includes(query) ||
          c.billing_address?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = (a.display_name || '').localeCompare(b.display_name || '');
          break;
        case 'status':
          const statusOrder: Record<string, number> = {
            active_client: 0,
            inactive_client: 1,
            dead_lead: 2,
          };
          comparison = (statusOrder[a.lead_status] || 3) - (statusOrder[b.lead_status] || 3);
          break;
        case 'projects':
          comparison = (a.projects?.length || 0) - (b.projects?.length || 0);
          break;
        case 'assigned':
          comparison = (a.assigned?.full_name || '').localeCompare(b.assigned?.full_name || '');
          break;
        case 'last_contact':
          const aContact = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
          const bContact = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
          comparison = aContact - bContact;
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [clients, statusFilter, assignedFilter, searchQuery, sortField, sortDirection]);

  const hasActiveFilters = statusFilter !== 'all' || assignedFilter !== 'all' || searchQuery;

  const clearFilters = () => {
    setStatusFilter('all');
    setAssignedFilter('all');
    setSearchQuery('');
  };

  const handleOpenDetail = (client: Client) => {
    setSelectedClient(client);
    setIsDetailModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditClient(client);
    setIsEditModalOpen(true);
  };

  if (clients.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-2xl bg-secondary/50 p-5">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground">No clients yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Add your first client to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {clients.length}
          </span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold tabular-nums text-foreground">{activeCount}</span>
          <span className="text-xs text-muted-foreground">active</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {inactiveCount}
          </span>
          <span className="text-xs text-muted-foreground">inactive</span>
        </div>

        {/* View Toggle */}
        <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-border/40 bg-secondary/50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              viewMode === 'table'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              viewMode === 'cards'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {/* Search */}
        <div className="relative min-w-0 w-full sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active_client">Active</SelectItem>
            <SelectItem value="inactive_client">Inactive</SelectItem>
            <SelectItem value="dead_lead">Dead Lead</SelectItem>
          </SelectContent>
        </Select>

        {/* Assigned Filter */}
        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Assigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assigned</SelectItem>
            {assignedUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || 'Unnamed'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}

        {/* Results count */}
        <span className="ml-auto text-sm text-muted-foreground">
          {processedClients.length} of {clients.length} clients
        </span>
      </div>

      {/* Content — Table or Cards */}
      {viewMode === 'cards' ? (
        <ClientCardView clients={processedClients} onOpenDetail={handleOpenDetail} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[950px] table-fixed">
            <thead className="table-header">
              <tr>
                <th className="w-14 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  ID
                </th>
                <th className="w-[200px] px-4 py-3 text-left">
                  <SortableHeader
                    field="name"
                    label="Client Name"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="w-28 px-4 py-3 text-left">
                  <SortableHeader
                    field="status"
                    label="Status"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="w-20 px-4 py-3 text-left">
                  <SortableHeader
                    field="projects"
                    label="Projects"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="w-28 px-4 py-3 text-left">
                  <SortableHeader
                    field="assigned"
                    label="Assigned"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="w-28 px-4 py-3 text-left">
                  <SortableHeader
                    field="last_contact"
                    label="Last Contact"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Website
                </th>
                <th className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Phone
                </th>
                <th className="w-10 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processedClients.map((client, index) => (
                <ClientTableRow
                  key={client.id}
                  client={client}
                  rowIndex={index}
                  onOpenDetail={handleOpenDetail}
                  onOpenEdit={handleOpenEdit}
                />
              ))}
            </tbody>
          </table>

          {/* Empty filtered state */}
          {processedClients.length === 0 && clients.length > 0 && (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">No clients match your filters</p>
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <ClientDetailModal
        client={selectedClient}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />

      {/* Edit Modal */}
      {editClient && (
        <EditClientModal
          client={editClient as unknown as import('@/types/database').Client}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      )}
    </div>
  );
}
