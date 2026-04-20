'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Globe, Phone, Folder, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials, getStatusConfig, type Client } from '@/lib/client-utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const ClientCard = React.memo(function ClientCard({
  client,
  onOpenDetail,
}: {
  client: Client;
  onOpenDetail: (client: Client) => void;
}) {
  const statusConfig = getStatusConfig(client.lead_status);
  const projectCount = client.projects?.length || 0;

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(client)}
      className="ease-[premium] flex w-full cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all duration-200 hover:border-primary/20 hover:shadow-md"
    >
      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-emerald-500/10 text-sm text-emerald-500">
            {getInitials(client.display_name || 'C')}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {client.display_name || 'Unnamed Client'}
          </p>
          {client.billing_address && (
            <p className="truncate text-xs text-muted-foreground">{client.billing_address}</p>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            statusConfig.bg,
            statusConfig.color
          )}
        >
          <statusConfig.icon className="h-3 w-3" />
          {statusConfig.label}
        </span>
      </div>

      {/* Footer: Projects, Contact, Website */}
      <div className="flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Folder className="h-3 w-3" />
          <span className="tabular-nums">{projectCount}</span>
        </div>

        {client.last_contacted_at && (
          <span className="truncate">
            {formatDistanceToNow(new Date(client.last_contacted_at), { addSuffix: true })}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {client.website && <Globe className="h-3 w-3" />}
          {client.phone && <Phone className="h-3 w-3" />}
        </div>
      </div>
    </button>
  );
});

interface ClientCardViewProps {
  clients: Client[];
  onOpenDetail: (client: Client) => void;
}

export function ClientCardView({ clients, onOpenDetail }: ClientCardViewProps) {
  if (clients.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-base font-medium text-foreground">No clients found</p>
        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  );
}
