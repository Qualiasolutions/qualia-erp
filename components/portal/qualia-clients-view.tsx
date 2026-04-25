'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Plus,
  Search,
  Users,
  X,
  Phone,
  Globe,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Client } from '@/lib/client-utils';
import { getInitials } from '@/lib/client-utils';
import { hueFromId } from '@/lib/color-constants';
import { NewClientModal } from '@/components/new-client-modal';

type StatusFilter = 'all' | 'active' | 'inactive' | 'dead';
type ViewMode = 'list' | 'grid';
type SortField = 'name' | 'status' | 'projects' | 'lastContact';
type SortDir = 'asc' | 'desc';

interface QualiaClientsViewProps {
  clients: Client[];
}

const statusBadgeStyle: Record<string, string> = {
  active_client: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  inactive_client: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  dead_lead: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabel: Record<string, string> = {
  active_client: 'Active',
  inactive_client: 'Inactive',
  dead_lead: 'Dead lead',
};

const palette = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-orange-500',
];

function clientColor(id: string): string {
  return palette[hueFromId(id) % palette.length] ?? palette[0];
}

function relativeContact(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function QualiaClientsView({ clients }: QualiaClientsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'me' | 'unassigned'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const counts = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.lead_status === 'active_client').length;
    const inactive = clients.filter((c) => c.lead_status === 'inactive_client').length;
    const dead = clients.filter((c) => c.lead_status === 'dead_lead').length;
    return { total, active, inactive, dead };
  }, [clients]);

  const filteredClients = useMemo(() => {
    let list = clients.slice();

    if (statusFilter === 'active') list = list.filter((c) => c.lead_status === 'active_client');
    else if (statusFilter === 'inactive')
      list = list.filter((c) => c.lead_status === 'inactive_client');
    else if (statusFilter === 'dead') list = list.filter((c) => c.lead_status === 'dead_lead');

    if (assignedFilter === 'unassigned') list = list.filter((c) => !c.assigned);
    // 'me' filter would need current user id; punt for now — admin-only page,
    // most clients are assigned to Fawzi anyway.

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.display_name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.website?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.display_name ?? '').localeCompare(b.display_name ?? '');
          break;
        case 'status':
          cmp = (a.lead_status ?? '').localeCompare(b.lead_status ?? '');
          break;
        case 'projects':
          cmp = (a.projects?.length ?? 0) - (b.projects?.length ?? 0);
          break;
        case 'lastContact': {
          const ai = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
          const bi = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
          cmp = ai - bi;
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [clients, statusFilter, assignedFilter, searchQuery, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('active');
    setAssignedFilter('all');
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5 flex flex-shrink-0 items-center justify-between">
        <div className="animate-fade-in flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        </div>

        <div className="animate-fade-in">
          <NewClientModal />
        </div>
      </div>

      {/* Stats Badges */}
      <div className="stagger-1 mb-6 flex flex-wrap items-center gap-2 animate-fade-in">
        <Badge variant="secondary" className="h-8 bg-muted/50 px-3 text-sm">
          {counts.total} <span className="ml-1 text-muted-foreground">total</span>
        </Badge>
        <Badge
          variant="secondary"
          className="h-8 bg-emerald-500/10 px-3 text-sm text-emerald-500"
        >
          <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />
          {counts.active} <span className="ml-1 text-emerald-500/70">active</span>
        </Badge>
        <Badge variant="secondary" className="h-8 bg-amber-500/10 px-3 text-sm text-amber-500">
          <span className="mr-2 h-2 w-2 rounded-full bg-amber-500" />
          {counts.inactive} <span className="ml-1 text-amber-500/70">inactive</span>
        </Badge>
        {counts.dead > 0 && (
          <Badge variant="secondary" className="h-8 bg-red-500/10 px-3 text-sm text-red-500">
            <span className="mr-2 h-2 w-2 rounded-full bg-red-500" />
            {counts.dead} <span className="ml-1 text-red-500/70">dead</span>
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="stagger-2 mb-6 flex flex-wrap items-center gap-3 animate-fade-in">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl border-transparent bg-muted/30 pl-10 focus:border-primary/30"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-11 w-32 rounded-xl border-transparent bg-muted/30">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="dead">Dead</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={assignedFilter}
          onValueChange={(v) => setAssignedFilter(v as 'all' | 'me' | 'unassigned')}
        >
          <SelectTrigger className="h-11 w-36 rounded-xl border-transparent bg-muted/30">
            <SelectValue placeholder="All Assigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assigned</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || statusFilter !== 'active' || assignedFilter !== 'all') && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="h-11 gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {filteredClients.length} of {counts.total} clients
          </span>
          <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-lg p-2 transition-all duration-200',
                viewMode === 'list'
                  ? 'bg-card shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-lg p-2 transition-all duration-200',
                viewMode === 'grid'
                  ? 'bg-card shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="stagger-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card animate-fade-in">
        {filteredClients.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {clients.length === 0
                ? 'No clients yet — add your first one to get started.'
                : 'No clients match your filters.'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <ClientsTable
            clients={filteredClients}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        ) : (
          <ClientsGrid clients={filteredClients} />
        )}
      </div>
    </div>
  );
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const isActive = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
      <ArrowUpDown
        className={cn('h-3 w-3', isActive && 'text-primary')}
        style={isActive && sortDir === 'desc' ? { transform: 'rotate(180deg)' } : undefined}
      />
    </button>
  );
}

function ClientsTable({
  clients,
  sortField,
  sortDir,
  onSort,
}: {
  clients: Client[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 border-b border-border bg-card">
          <tr className="text-left">
            <th className="w-12 px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              #
            </th>
            <th className="px-6 py-4">
              <SortHeader
                field="name"
                label="Client"
                sortField={sortField}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-6 py-4">
              <SortHeader
                field="status"
                label="Status"
                sortField={sortField}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-6 py-4">
              <SortHeader
                field="projects"
                label="Projects"
                sortField={sortField}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned
            </th>
            <th className="px-6 py-4">
              <SortHeader
                field="lastContact"
                label="Last Contact"
                sortField={sortField}
                sortDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Website
            </th>
            <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phone
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((c, idx) => {
            const initials = getInitials(c.display_name ?? '?');
            const projectCount = c.projects?.length ?? 0;
            return (
              <tr
                key={c.id}
                className="group cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => {
                  window.location.assign(`/clients/${c.id}`);
                }}
              >
                <td className="px-6 py-4 text-sm tabular-nums text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/clients/${c.id}`}
                    className="flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar className="h-9 w-9">
                      {c.logo_url ? <AvatarImage src={c.logo_url} alt="" /> : null}
                      <AvatarFallback
                        className={cn('text-xs font-semibold text-white', clientColor(c.id))}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium transition-colors group-hover:text-primary">
                        {c.display_name ?? 'Untitled'}
                      </p>
                      {c.billing_address && (
                        <p className="text-xs text-muted-foreground">{c.billing_address}</p>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-normal capitalize',
                      statusBadgeStyle[c.lead_status] ?? 'bg-muted text-muted-foreground'
                    )}
                  >
                    {statusLabel[c.lead_status] ?? c.lead_status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm tabular-nums">{projectCount}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {c.assigned?.full_name ?? '—'}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {relativeContact(c.last_contacted_at)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {c.website ? (
                    <a
                      href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {c.phone ? (
                    <a
                      href={`tel:${c.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{c.phone}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClientsGrid({ clients }: { clients: Client[] }) {
  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clients.map((c) => {
        const initials = getInitials(c.display_name ?? '?');
        return (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--elevation-floating)]"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <Avatar className="h-10 w-10">
                {c.logo_url ? <AvatarImage src={c.logo_url} alt="" /> : null}
                <AvatarFallback
                  className={cn('text-xs font-semibold text-white', clientColor(c.id))}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Badge
                variant="outline"
                className={cn(
                  'font-normal capitalize',
                  statusBadgeStyle[c.lead_status] ?? 'bg-muted text-muted-foreground'
                )}
              >
                {statusLabel[c.lead_status] ?? c.lead_status}
              </Badge>
            </div>
            <h3 className="line-clamp-1 font-semibold transition-colors group-hover:text-primary">
              {c.display_name ?? 'Untitled'}
            </h3>
            {c.billing_address && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {c.billing_address}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.projects?.length ?? 0} projects</span>
              <span>{relativeContact(c.last_contacted_at)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Re-export Plus to satisfy the v0 reference's icon export expectations.
void Plus;
