'use client';

import { useState, useTransition } from 'react';
import type { Client } from '@/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Phone, Globe, Folder, User, Pencil, Plus, X } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { WorkShowcase } from '@/components/work-showcase';
import { EditClientModal } from '@/components/edit-client-modal';
import { LogoUpload } from '@/components/logo-upload';
import { ClientProjectAccess } from '@/components/clients/client-project-access';
import { AdminActionItemsPanel } from '@/components/portal/admin-action-items-panel';
import { RichText } from '@/components/ui/rich-text';
import { updateProject } from '@/app/actions/projects';
import { toast } from 'sonner';

const statusConfig = {
  dropped: { label: 'Dropped', bg: 'bg-muted', color: 'text-muted-foreground' },
  cold: { label: 'Cold', bg: 'bg-blue-500/10', color: 'text-blue-600 dark:text-blue-400' },
  hot: { label: 'Hot', bg: 'bg-red-500/10', color: 'text-red-600 dark:text-red-400' },
  active_client: {
    label: 'Active Client',
    bg: 'bg-green-500/10',
    color: 'text-green-600 dark:text-green-400',
  },
  inactive_client: {
    label: 'Inactive',
    bg: 'bg-yellow-500/10',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  dead_lead: {
    label: 'Dead Lead',
    bg: 'bg-muted',
    color: 'text-muted-foreground',
  },
} as const;

interface ExtendedClient extends Client {
  assigned?: { full_name: string | null; email: string | null } | null;
  projects?: { id: string; name: string; project_type: string | null; status: string }[];
}

interface Project {
  id: string;
  name: string;
  project_type?: string | null;
  project_status?: string | null;
}

interface ERPProject {
  id: string;
  name: string;
  project_type: string | null;
  status: string;
}

interface ERPAvailableProject {
  id: string;
  name: string;
  project_type: string | null;
}

interface ClientDetailViewProps {
  client: ExtendedClient;
  assignedProjects: Project[];
  availableProjects: Project[];
  erpLinkedProjects: ERPProject[];
  erpAvailableProjects: ERPAvailableProject[];
  isAdmin: boolean;
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

export function ClientDetailView({
  client: initialClient,
  assignedProjects,
  availableProjects,
  erpLinkedProjects: initialErpLinkedProjects,
  erpAvailableProjects,
  isAdmin,
}: ClientDetailViewProps) {
  const [client, setClient] = useState(initialClient);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [erpLinkedProjects, setErpLinkedProjects] =
    useState<ERPProject[]>(initialErpLinkedProjects);
  const [selectedErpProjectId, setSelectedErpProjectId] = useState('');
  const [isLinkingProject, startLinkTransition] = useTransition();
  const status = statusConfig[client.lead_status || 'cold'] || statusConfig.cold;
  const workItems = getClientWorkItems(client.display_name);

  const filteredErpAvailable = erpAvailableProjects.filter(
    (p) => !erpLinkedProjects.some((lp) => lp.id === p.id)
  );

  function handleLinkProject() {
    if (!selectedErpProjectId) return;
    const toLink = erpAvailableProjects.find((p) => p.id === selectedErpProjectId);
    if (!toLink) return;

    const optimistic: ERPProject = {
      id: toLink.id,
      name: toLink.name,
      project_type: toLink.project_type,
      status: 'Active',
    };
    setErpLinkedProjects((prev) => [...prev, optimistic]);
    setSelectedErpProjectId('');

    startLinkTransition(async () => {
      const fd = new FormData();
      fd.set('id', toLink.id);
      fd.set('client_id', client.id);
      const result = await updateProject(fd);
      if (result.success) {
        toast.success('Project linked to client');
      } else {
        setErpLinkedProjects((prev) => prev.filter((p) => p.id !== toLink.id));
        toast.error(result.error || 'Failed to link project');
      }
    });
  }

  function handleUnlinkProject(projectId: string) {
    const toUnlink = erpLinkedProjects.find((p) => p.id === projectId);
    if (!toUnlink) return;

    setErpLinkedProjects((prev) => prev.filter((p) => p.id !== projectId));

    startLinkTransition(async () => {
      const fd = new FormData();
      fd.set('id', projectId);
      fd.set('client_id', '');
      const result = await updateProject(fd);
      if (result.success) {
        toast.success('Project unlinked from client');
      } else {
        setErpLinkedProjects((prev) => [...prev, toUnlink]);
        toast.error(result.error || 'Failed to unlink project');
      }
    });
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <LogoUpload
              entityType="client"
              entityId={client.id}
              currentLogoUrl={client.logo_url}
              fallbackIcon={<Building2 className="h-10 w-10" />}
              fallbackBgColor="bg-gradient-to-br from-qualia-500 via-qualia-600 to-qualia-700"
              // text-white ok: sits on guaranteed-dark teal gradient fallbackBgColor
              fallbackIconColor="text-white"
              size="xl"
              onLogoChange={(newUrl) => {
                setClient((prev) => ({ ...prev, logo_url: newUrl }));
              }}
            />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {client.display_name}
              </h1>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge
                  className={cn(status.bg, status.color, 'px-3 py-1 text-xs font-medium')}
                  variant="secondary"
                >
                  {status.label}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="gap-2 rounded-xl"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>

        {/* Client Details — structured finance-style layout */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {/* Contact Information */}
            <div>
              <div className="border-b border-border bg-secondary/40 px-5 py-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  Contact
                </h3>
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Phone
                  </span>
                  {client.phone ? (
                    <a
                      href={`tel:${client.phone}`}
                      className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">&mdash;</span>
                  )}
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Website
                  </span>
                  {client.website ? (
                    <a
                      href={
                        client.website.startsWith('http')
                          ? client.website
                          : `https://${client.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      {client.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">&mdash;</span>
                  )}
                </div>
                <div className="flex items-start justify-between gap-6 px-5 py-3">
                  <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Address
                  </span>
                  {client.billing_address ? (
                    <span className="text-right text-sm leading-relaxed text-foreground">
                      {client.billing_address}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">&mdash;</span>
                  )}
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div>
              <div className="border-b border-border bg-secondary/40 px-5 py-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Account
                </h3>
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Assigned To
                  </span>
                  {client.assigned ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                          {getInitials(client.assigned.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {client.assigned.full_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">&mdash;</span>
                  )}
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Projects
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium tabular-nums',
                      (client.projects?.length || 0) > 0
                        ? 'text-foreground'
                        : 'text-muted-foreground/50'
                    )}
                  >
                    {client.projects?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Client Since
                  </span>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {client.created_at
                      ? new Date(client.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {client.notes && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-secondary/40 px-5 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </h3>
            </div>
            <div className="px-5 py-4">
              <RichText className="text-sm leading-relaxed text-foreground/90">
                {client.notes}
              </RichText>
            </div>
          </div>
        )}

        {/* ERP Linked Projects */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Folder className="h-3.5 w-3.5" />
              Linked Projects
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {erpLinkedProjects.length}
              </span>
            </h3>
          </div>

          {/* Link project dropdown (admin only) */}
          {isAdmin && filteredErpAvailable.length > 0 && (
            <div className="flex gap-2 border-b border-border px-5 py-3">
              <Select value={selectedErpProjectId} onValueChange={setSelectedErpProjectId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Link an existing project..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredErpAvailable.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.project_type && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          — {p.project_type.replace('_', ' ')}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleLinkProject}
                disabled={!selectedErpProjectId || isLinkingProject}
                size="default"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Link
              </Button>
            </div>
          )}

          {/* Linked project list */}
          {erpLinkedProjects.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              No projects linked yet.{isAdmin ? ' Use the dropdown above to link a project.' : ''}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {erpLinkedProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-secondary/30"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">{project.name}</span>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{project.project_type?.replace(/_/g, ' ')}</span>
                      <span>&middot;</span>
                      <span className="capitalize">{project.status}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-1.5">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/projects/${project.id}`}>View</a>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        disabled={isLinkingProject}
                        onClick={() => handleUnlinkProject(project.id)}
                        title="Unlink project"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Access Management */}
        <ClientProjectAccess
          clientId={client.id}
          initialProjects={assignedProjects}
          availableProjects={availableProjects}
          isAdmin={isAdmin}
        />

        {/* Action Items — admin can create action items for this client */}
        {isAdmin && erpLinkedProjects.length > 0 && (
          <AdminActionItemsPanel
            clientId={client.id}
            projects={erpLinkedProjects.map((p) => ({ id: p.id, name: p.name }))}
          />
        )}

        {/* Work Showcase */}
        {workItems.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="p-5">
              <WorkShowcase clientName={client.display_name || 'Client'} workItems={workItems} />
            </div>
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      <EditClientModal client={client} open={editModalOpen} onOpenChange={setEditModalOpen} />
    </div>
  );
}
