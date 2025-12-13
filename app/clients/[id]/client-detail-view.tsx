'use client';

import { Client } from '@/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Phone, Globe, MapPin, Folder, User } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

const statusConfig = {
  dropped: { label: 'Dropped', bg: 'bg-gray-100', color: 'text-gray-600' },
  cold: { label: 'Cold', bg: 'bg-blue-100', color: 'text-blue-600' },
  hot: { label: 'Hot', bg: 'bg-red-100', color: 'text-red-600' },
  active_client: { label: 'Active Client', bg: 'bg-green-100', color: 'text-green-600' },
  inactive_client: { label: 'Inactive', bg: 'bg-yellow-100', color: 'text-yellow-600' },
  dead_lead: { label: 'Dead Lead', bg: 'bg-gray-100', color: 'text-gray-600' },
} as const;

interface ClientDetailViewProps {
  client: Client;
}

export function ClientDetailView({ client }: ClientDetailViewProps) {
  const status = statusConfig[client.lead_status] || statusConfig.cold;

  return (
    <div className="p-6">
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.display_name}</h1>
              <Badge className={cn(status.bg, status.color)} variant="secondary">
                {status.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
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
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.website}</span>
                </a>
              )}
              {client.billing_address && (
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.billing_address}</span>
                </div>
              )}
              {!client.phone && !client.website && !client.billing_address && (
                <p className="text-sm text-muted-foreground">No contact information available</p>
              )}
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Assigned To */}
              {client.assigned && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
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
              )}

              {/* Projects */}
              {client.projects && client.projects.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Folder className="h-4 w-4 text-qualia-500" />
                  <span className="text-sm">
                    {client.projects.length} project{client.projects.length !== 1 ? 's' : ''}{' '}
                    connected
                  </span>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Client since {new Date(client.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {client.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        {client.projects && client.projects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Projects ({client.projects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {client.projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {project.project_type?.replace('_', ' ')} •{' '}
                        <span className="capitalize">{project.status}</span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/projects/${project.id}`}>View Project</a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
