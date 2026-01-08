'use client';

import { useState } from 'react';
import type { Client } from '@/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Phone, Globe, MapPin, Folder, User, Pencil } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { WorkShowcase } from '@/components/work-showcase';
import { EditClientModal } from '@/components/edit-client-modal';
import { LogoUpload } from '@/components/logo-upload';

const statusConfig = {
  dropped: { label: 'Dropped', bg: 'bg-gray-100', color: 'text-gray-600' },
  cold: { label: 'Cold', bg: 'bg-blue-100', color: 'text-blue-600' },
  hot: { label: 'Hot', bg: 'bg-red-100', color: 'text-red-600' },
  active_client: { label: 'Active Client', bg: 'bg-green-100', color: 'text-green-600' },
  inactive_client: { label: 'Inactive', bg: 'bg-yellow-100', color: 'text-yellow-600' },
  dead_lead: { label: 'Dead Lead', bg: 'bg-gray-100', color: 'text-gray-600' },
} as const;

interface ExtendedClient extends Client {
  assigned?: { full_name: string | null; email: string | null } | null;
  projects?: { id: string; name: string; project_type: string | null; status: string }[];
}

interface ClientDetailViewProps {
  client: ExtendedClient;
}

// Work items mapping for clients
function getClientWorkItems(clientName: string | null): Array<{
  id: string;
  title: string;
  type: 'image' | 'video';
  src: string;
  device: 'mobile' | 'desktop';
  description?: string;
}> {
  const normalizedName = clientName?.toLowerCase().trim().replace(/\s+/g, '') || '';

  // Match InrVo (case-insensitive, allows variations)
  if (normalizedName.includes('inrvo')) {
    return [
      {
        id: 'inrvo-mobile',
        title: 'InrVo Mobile App',
        type: 'image',
        src: '/work/inrvo-mobile.jpeg',
        device: 'mobile',
        description: 'Mobile interface showcasing audio generation',
      },
      {
        id: 'inrvo-desktop',
        title: 'InrVo Web Platform',
        type: 'image',
        src: '/work/inrvo-desktop.jpeg',
        device: 'desktop',
        description: 'Desktop interface for audio generation platform',
      },
    ];
  }

  // Add more client work items here as needed
  return [];
}

export function ClientDetailView({ client: initialClient }: ClientDetailViewProps) {
  const [client, setClient] = useState(initialClient);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const status = statusConfig[client.lead_status || 'cold'] || statusConfig.cold;
  const workItems = getClientWorkItems(client.display_name);

  return (
    <div className="p-6">
      <div className="max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <LogoUpload
              entityType="client"
              entityId={client.id}
              currentLogoUrl={client.logo_url}
              fallbackIcon={<Building2 className="h-10 w-10" />}
              fallbackBgColor="bg-gradient-to-br from-qualia-500 via-qualia-600 to-qualia-700"
              fallbackIconColor="text-white"
              size="xl"
              onLogoChange={(newUrl) => {
                setClient((prev) => ({ ...prev, logo_url: newUrl }));
              }}
            />
            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
                {client.display_name}
              </h1>
              <Badge
                className={cn(status.bg, status.color, 'px-3 py-1 text-xs font-medium')}
                variant="secondary"
              >
                {status.label}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Information */}
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Phone className="h-4 w-4 text-qualia-500" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="group/item flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-200 hover:border-qualia-500/40 hover:bg-qualia-500/5 hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-qualia-500/10 text-qualia-500 transition-colors group-hover/item:bg-qualia-500/20">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{client.phone}</span>
                </a>
              )}
              {client.website && (
                <a
                  href={
                    client.website.startsWith('http') ? client.website : `https://${client.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/item flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-200 hover:border-qualia-500/40 hover:bg-qualia-500/5 hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-qualia-500/10 text-qualia-500 transition-colors group-hover/item:bg-qualia-500/20">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{client.website}</span>
                </a>
              )}
              {client.billing_address && (
                <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="text-sm leading-relaxed">{client.billing_address}</span>
                </div>
              )}
              {!client.phone && !client.website && !client.billing_address && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No contact information available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-4 w-4 text-qualia-500" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Assigned To */}
              {client.assigned && (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-200 hover:border-qualia-500/40 hover:bg-qualia-500/5">
                  <Avatar className="h-10 w-10 ring-2 ring-qualia-500/20">
                    <AvatarFallback className="bg-qualia-500/10 font-semibold text-qualia-600 dark:text-qualia-400">
                      {getInitials(client.assigned.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{client.assigned.full_name}</p>
                    {client.assigned.email && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {client.assigned.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Projects */}
              {client.projects && client.projects.length > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-200 hover:border-qualia-500/40 hover:bg-qualia-500/5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-qualia-500/10 text-qualia-500">
                    <Folder className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">
                    {client.projects.length} project{client.projects.length !== 1 ? 's' : ''}{' '}
                    connected
                  </span>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">
                  Client since{' '}
                  {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {client.notes && (
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/50 to-muted/30 p-4 backdrop-blur-sm">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {client.notes}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        {client.projects && client.projects.length > 0 && (
          <Card className="group transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Folder className="h-4 w-4 text-qualia-500" />
                Projects ({client.projects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {client.projects.map((project, index) => (
                  <div
                    key={project.id}
                    className="group/item flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-200 hover:border-qualia-500/40 hover:bg-qualia-500/5 hover:shadow-sm"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{project.name}</p>
                      <p className="mt-1 text-sm capitalize text-muted-foreground">
                        {project.project_type?.replace('_', ' ')} •{' '}
                        <span className="capitalize">{project.status}</span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="ml-4 hover:border-qualia-500/40 hover:bg-qualia-500/10 hover:text-qualia-600 dark:hover:text-qualia-400"
                    >
                      <a href={`/projects/${project.id}`}>View Project</a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Work Showcase */}
        {workItems.length > 0 && (
          <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
            <CardContent className="pt-6">
              <WorkShowcase clientName={client.display_name || 'Client'} workItems={workItems} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Client Modal */}
      <EditClientModal client={client} open={editModalOpen} onOpenChange={setEditModalOpen} />
    </div>
  );
}
