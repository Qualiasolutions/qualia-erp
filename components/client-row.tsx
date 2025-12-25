'use client';

import { memo } from 'react';
import {
  Building2,
  Phone,
  Globe,
  MoreHorizontal,
  Trash2,
  Folder,
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
import { type Client, type ClientStatus, getInitials, getStatusConfig } from '@/lib/client-utils';

interface ClientRowProps {
  client: Client;
  onDelete: (id: string) => void;
  onChangeStatus: (client: Client, status: ClientStatus) => void;
  onOpenDetail: (client: Client) => void;
  isPending: boolean;
}

export const ClientRow = memo(function ClientRow({
  client,
  onDelete,
  onChangeStatus,
  onOpenDetail,
  isPending,
}: ClientRowProps) {
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
          {client.display_name || 'Unnamed Client'}
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
});
