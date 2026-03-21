'use client';

import { Building2, Phone, Globe, MapPin, Folder } from 'lucide-react';
import { RichText } from '@/components/ui/rich-text';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { type Client, getInitials, getStatusConfig } from '@/lib/client-utils';

interface ClientDetailModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailModal({ client, open, onOpenChange }: ClientDetailModalProps) {
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
              <DialogTitle className="text-lg">
                {client.display_name || 'Unnamed Client'}
              </DialogTitle>
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
                <RichText>{client.notes}</RichText>
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
