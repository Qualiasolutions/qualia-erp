'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useServerAction } from '@/lib/hooks/use-server-action';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  MoreHorizontal,
  Phone,
  Plus,
  Pencil,
  Trash2,
  Flame,
  Snowflake,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClientRecord, deleteClientRecord, toggleClientStatus } from '@/app/actions';
import { EmptyState } from '@/components/ui/empty-state';
import type { LeadStatus } from '@/types/database';

interface Lead {
  id: string;
  name: string;
  display_name: string | null;
  phone: string | null;
  website: string | null;
  lead_status: LeadStatus | null;
  last_contacted_at: string | null;
  created_at: string | null;
  assigned_to: string | null;
  projects?: Array<{ id: string; name: string }>;
}

interface ActiveLeadsListProps {
  leads: Lead[];
  workspaceId: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Flame; className: string; iconClass: string }
> = {
  hot: {
    label: 'Hot',
    icon: Flame,
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    iconClass: 'text-orange-500',
  },
  cold: {
    label: 'Cold',
    icon: Snowflake,
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    iconClass: 'text-blue-500',
  },
  active_client: {
    label: 'Active',
    icon: UserCheck,
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    iconClass: 'text-emerald-500',
  },
  inactive_client: {
    label: 'Inactive',
    icon: Users,
    className: 'bg-muted text-muted-foreground border-border',
    iconClass: 'text-muted-foreground',
  },
  dropped: {
    label: 'Dropped',
    icon: Users,
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
    iconClass: 'text-red-400',
  },
  dead_lead: {
    label: 'Dead',
    icon: Users,
    className: 'bg-muted text-muted-foreground/70 border-border',
    iconClass: 'text-muted-foreground/70',
  },
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Quick Add Lead Dialog
function QuickAddLeadDialog({
  workspaceId,
  onSuccess,
}: {
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<string>('hot');

  const { execute: createLead, isPending } = useServerAction(createClientRecord, {
    onSuccess: () => {
      setName('');
      setPhone('');
      setStatus('hot');
      setOpen(false);
      onSuccess();
    },
    onError: (errorMsg: string) => {
      console.error('Failed to create lead:', errorMsg);
      alert(errorMsg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formData = new FormData();
    formData.set('display_name', name.trim());
    if (phone) formData.set('phone', phone);
    formData.set('lead_status', status);
    formData.set('workspace_id', workspaceId);

    createLead(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Lead name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">Hot Lead</SelectItem>
                <SelectItem value="cold">Cold Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Adding...' : 'Add Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Single Lead Row
const LeadRow = React.memo(function LeadRow({
  lead,
  onRefresh,
}: {
  lead: Lead;
  onRefresh: () => void;
}) {
  const router = useRouter();

  const status = lead.lead_status || 'cold';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.cold;
  const StatusIcon = config.icon;

  const { execute: updateStatus, isPending: isUpdating } = useServerAction(toggleClientStatus, {
    onSuccess: () => {
      onRefresh();
    },
  });

  const { execute: deleteLead, isPending: isDeleting } = useServerAction(deleteClientRecord, {
    onSuccess: () => {
      onRefresh();
    },
  });

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (lead.lead_status === newStatus) return;
    updateStatus(lead.id, newStatus);
  };

  const handleDelete = () => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    deleteLead(lead.id);
  };

  const isPending = isUpdating || isDeleting;

  const lastContact = lead.last_contacted_at
    ? formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })
    : 'Never';

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary/10 text-sm text-primary">
          {getInitials(lead.display_name || lead.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{lead.display_name || lead.name}</p>
          <Badge variant="outline" className={cn('px-1.5 py-0 text-[11px]', config.className)}>
            <StatusIcon className="mr-1 h-2.5 w-2.5" />
            {config.label}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-3">
          {lead.phone && (
            <span className="truncate text-xs text-muted-foreground">{lead.phone}</span>
          )}
          <span className="text-xs text-muted-foreground">{lastContact}</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {lead.phone && (
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a href={`tel:${lead.phone}`}>
              <Phone className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/clients?id=${lead.id}`)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusChange('hot')}>
              <Flame className="mr-2 h-3.5 w-3.5 text-orange-500" />
              Mark as Hot
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('cold')}>
              <Snowflake className="mr-2 h-3.5 w-3.5 text-blue-500" />
              Mark as Cold
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('active_client')}>
              <UserCheck className="mr-2 h-3.5 w-3.5 text-emerald-500" />
              Convert to Client
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-red-500">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export function ActiveLeadsList({ leads, workspaceId }: ActiveLeadsListProps) {
  const router = useRouter();

  // Filter to show only hot and cold leads (not converted clients)
  const activeLeads = leads.filter((l) => l.lead_status === 'hot' || l.lead_status === 'cold');

  const hotCount = activeLeads.filter((l) => l.lead_status === 'hot').length;
  const coldCount = activeLeads.filter((l) => l.lead_status === 'cold').length;

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="widget">
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon bg-orange-500/10">
            <Users className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Active Leads</h3>
            <p className="text-xs text-muted-foreground">
              <span className="text-orange-500">{hotCount} hot</span>
              {' · '}
              <span className="text-blue-500">{coldCount} cold</span>
            </p>
          </div>
        </div>
        <QuickAddLeadDialog workspaceId={workspaceId} onSuccess={handleRefresh} />
      </div>
      <div className="widget-content min-h-0 overflow-y-auto p-2">
        {activeLeads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Pipeline is clear"
            description="No hot or cold leads right now. Add one to start tracking."
            compact
          />
        ) : (
          <div className="space-y-1.5">
            {activeLeads.map((lead, i) => (
              <div
                key={lead.id}
                className="animate-stagger-in"
                style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
              >
                <LeadRow lead={lead} onRefresh={handleRefresh} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
