'use client';

import { memo } from 'react';
import {
  Building2,
  Phone,
  Globe,
  MoreHorizontal,
  Trash2,
  Folder,
  Calendar,
  MapPin,
  FileText,
  Skull,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { type Client, type ClientStatus, getInitials, getStatusConfig } from '@/lib/client-utils';
import { EntityAvatar } from '@/components/entity-avatar';

interface ClientCardProps {
  client: Client;
  onDelete: (id: string) => void;
  onChangeStatus: (client: Client, status: ClientStatus) => void;
  onOpenDetail: (client: Client) => void;
  isPending: boolean;
}

export const ClientCard = memo(function ClientCard({
  client,
  onDelete,
  onChangeStatus,
  onOpenDetail,
  isPending,
}: ClientCardProps) {
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
        <EntityAvatar
          src={client.logo_url}
          fallbackIcon={<Building2 className="h-5 w-5" />}
          fallbackBgColor={`bg-gradient-to-br ${statusConfig.iconBg}`}
          fallbackIconColor={statusConfig.color}
          size="lg"
          className="h-11 w-11"
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {client.display_name || 'Unnamed Client'}
          </h3>
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
});
