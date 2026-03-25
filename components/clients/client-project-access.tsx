'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Folder, Trash2, Plus, Mail, Loader2 } from 'lucide-react';
import {
  inviteClientToProject,
  inviteClientByEmail,
  removeClientFromProject,
} from '@/app/actions/client-portal';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  project_type?: string | null;
  project_status?: string | null;
}

interface ClientProjectAccessProps {
  clientId: string;
  clientEmail?: string | null;
  initialProjects: Project[];
  availableProjects: Project[];
  isAdmin: boolean;
}

export function ClientProjectAccess({
  clientId,
  clientEmail,
  initialProjects,
  availableProjects,
  isAdmin,
}: ClientProjectAccessProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState<string>('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAddProject = () => {
    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }

    const projectToAdd = availableProjects.find((p) => p.id === selectedProjectId);
    if (!projectToAdd) {
      toast.error('Project not found');
      return;
    }

    // Optimistic update
    setProjects((prev) => [...prev, projectToAdd]);
    setSelectedProjectId('');

    startTransition(async () => {
      const result = await inviteClientToProject(selectedProjectId, clientId);

      if (!result.success) {
        // Revert on error
        setProjects((prev) => prev.filter((p) => p.id !== selectedProjectId));
        toast.error(result.error || 'Failed to add project access');
      } else {
        toast.success('Project access added successfully');
      }
    });
  };

  const handleInviteByEmail = () => {
    const emailToUse = inviteEmail.trim() || clientEmail?.trim();

    if (!emailToUse) {
      toast.error('Please enter an email address');
      return;
    }

    if (!inviteProjectId) {
      toast.error('Please select a project');
      return;
    }

    const projectToAdd = availableProjects.find((p) => p.id === inviteProjectId);

    startTransition(async () => {
      const result = await inviteClientByEmail(
        inviteProjectId,
        emailToUse,
        inviteName || undefined
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to invite client');
      } else {
        const data = result.data as { emailSent?: boolean } | undefined;
        toast.success(
          data?.emailSent
            ? 'Invite email sent! Client will receive a link to set their password.'
            : 'Project access added successfully'
        );
        if (projectToAdd) {
          setProjects((prev) => [...prev, projectToAdd]);
        }
        setInviteEmail('');
        setInviteName('');
        setInviteProjectId('');
        setShowInviteForm(false);
      }
    });
  };

  const handleRemoveProject = (projectId: string) => {
    const projectToRemove = projects.find((p) => p.id === projectId);
    if (!projectToRemove) return;

    // Optimistic update
    setProjects((prev) => prev.filter((p) => p.id !== projectId));

    startTransition(async () => {
      const result = await removeClientFromProject(projectId, clientId);

      if (!result.success) {
        // Revert on error
        setProjects((prev) => [...prev, projectToRemove]);
        toast.error(result.error || 'Failed to remove project access');
      } else {
        toast.success('Project access removed successfully');
      }
    });
  };

  // Filter out already assigned projects from available list
  const filteredAvailableProjects = availableProjects.filter(
    (available) => !projects.some((assigned) => assigned.id === available.id)
  );

  if (!isAdmin) {
    // Non-admin users can only view assigned projects
    if (projects.length === 0) {
      return (
        <Card className="group transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Folder className="h-4 w-4 text-primary" />
              Project Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-sm text-muted-foreground">
              No projects assigned yet
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="group transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Folder className="h-4 w-4 text-primary" />
            Project Access ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{project.name}</p>
                  {project.project_type && (
                    <p className="mt-1 text-sm capitalize text-muted-foreground">
                      {project.project_type.replace('_', ' ')}
                      {project.project_status && ` • ${project.project_status}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin view with add/remove capabilities
  return (
    <Card className="group transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Folder className="h-4 w-4 text-primary" />
          Project Access ({projects.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Add project form (existing clients) */}
          {filteredAvailableProjects.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredAvailableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddProject}
                disabled={!selectedProjectId || isPending}
                size="default"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Access
              </Button>
            </div>
          )}

          {/* Invite by email toggle */}
          {!showInviteForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteForm(true)}
              className="w-full gap-2"
            >
              <Mail className="h-4 w-4" />
              Invite client by email
            </Button>
          )}

          {/* Invite by email form */}
          {showInviteForm && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Invite new client to portal</p>
              <p className="text-xs text-muted-foreground">
                They&apos;ll receive an email with a link to set their password and access the
                portal.
              </p>
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Client email"
                  value={inviteEmail || clientEmail || ''}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Client name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
                <Select value={inviteProjectId} onValueChange={setInviteProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleInviteByEmail}
                  disabled={isPending || (!inviteEmail.trim() && !clientEmail)}
                  size="sm"
                  className="gap-2"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Send Invite
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Project list */}
          {projects.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No projects assigned yet. Use the dropdown above to grant access.
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className="group/item flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{project.name}</p>
                    {project.project_type && (
                      <p className="mt-1 text-sm capitalize text-muted-foreground">
                        {project.project_type.replace('_', ' ')}
                        {project.project_status && ` • ${project.project_status}`}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProject(project.id)}
                    disabled={isPending}
                    className="ml-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {filteredAvailableProjects.length === 0 && projects.length > 0 && (
            <p className="pt-2 text-center text-sm text-muted-foreground">
              All active projects have been assigned
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
