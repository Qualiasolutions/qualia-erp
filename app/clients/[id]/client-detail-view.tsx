'use client';

import type { Client } from '@/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Phone, Globe, MapPin, Folder, User } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { WorkShowcase } from '@/components/work-showcase';

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

export function ClientDetailView({ client }: ClientDetailViewProps) {
  const status = statusConfig[client.lead_status || 'cold'] || statusConfig.cold;
  const workItems = getClientWorkItems(client.display_name);

  return (
    <div className="p-6">
      <div className="max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-qualia-500 via-qualia-600 to-qualia-700 shadow-lg shadow-qualia-500/20 transition-transform duration-300 hover:scale-105">
              <Building2 className="h-10 w-10 text-white" />
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-qualia-400/20 to-qualia-600/20 blur-xl opacity-50" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                {client.display_name}
              </h1>
              <Badge className={cn(status.bg, status.color, 'text-xs font-medium px-3 py-1')} variant="secondary">
                {status.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Information */}
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
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
                <p className="text-sm text-muted-foreground py-4 text-center">No contact information available</p>
              )}
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-qualia-500" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Assigned To */}
              {client.assigned && (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-200 hover:border-qualia-500/40 hover:bg-qualia-500/5">
                  <Avatar className="h-10 w-10 ring-2 ring-qualia-500/20">
                    <AvatarFallback className="bg-qualia-500/10 text-qualia-600 dark:text-qualia-400 font-semibold">
                      {getInitials(client.assigned.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{client.assigned.full_name}</p>
                    {client.assigned.email && (
                      <p className="text-xs text-muted-foreground mt-0.5">{client.assigned.email}</p>
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
                  Client since {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {client.notes && (
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/40 p-4 backdrop-blur-sm">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{client.notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        {client.projects && client.projects.length > 0 && (
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
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
                      <p className="text-sm capitalize text-muted-foreground mt-1">
                        {project.project_type?.replace('_', ' ')} •{' '}
                        <span className="capitalize">{project.status}</span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="ml-4 hover:bg-qualia-500/10 hover:border-qualia-500/40 hover:text-qualia-600 dark:hover:text-qualia-400">
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
          <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
            <CardContent className="pt-6">
              <WorkShowcase clientName={client.display_name || 'Client'} workItems={workItems} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
