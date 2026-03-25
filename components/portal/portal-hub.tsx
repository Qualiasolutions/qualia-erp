'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  KeyRound,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Shield,
  ShieldOff,
  Folder,
  RotateCcw,
  Plus,
  UserPlus,
  Trash2,
} from 'lucide-react';
import {
  setupPortalForClient,
  resetClientPassword,
  createClientWorkspace,
  revokePortalAccess,
  updateClientPortalProjects,
} from '@/app/actions/client-portal';
import type { PortalHubClient } from '@/app/actions/client-portal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PortalHubProps {
  clients: PortalHubClient[];
  allProjects: Array<{
    id: string;
    name: string;
    status: string | null;
    project_type: string | null;
  }>;
  assignedProjectIds?: string[];
}

type FilterMode = 'all' | 'with-access' | 'no-access';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Launched: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Demos: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Delayed: 'bg-red-500/10 text-red-600 border-red-500/20',
  Archived: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export function PortalHub({
  clients: initialClients,
  allProjects,
  assignedProjectIds: initialAssigned = [],
}: PortalHubProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('with-access');
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>(initialAssigned);

  // Credential creation dialog
  const [credentialDialog, setCredentialDialog] = useState<{
    clientId: string;
    clientName: string;
  } | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password?: string;
    name: string;
    alreadyExisted: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset password state
  const [resetDialog, setResetDialog] = useState<{
    clientId: string;
    clientName: string;
    email: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

  // Create workspace dialog state
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newProjectIds, setNewProjectIds] = useState<string[]>([]);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceCredentials, setWorkspaceCredentials] = useState<{
    email: string;
    password?: string;
    name: string;
    alreadyExisted: boolean;
  } | null>(null);
  const [workspaceCopied, setWorkspaceCopied] = useState(false);

  // Manage projects dialog state
  const [manageProjectsDialog, setManageProjectsDialog] = useState<{
    clientId: string;
    clientName: string;
    currentProjectIds: string[];
  } | null>(null);
  const [managedProjectIds, setManagedProjectIds] = useState<string[]>([]);
  const [isSavingProjects, setIsSavingProjects] = useState(false);

  const filtered = useMemo(() => {
    let result = clients;

    if (filter === 'with-access') {
      result = result.filter((c) => c.hasPortalAccess);
    } else if (filter === 'no-access') {
      result = result.filter((c) => !c.hasPortalAccess);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.projects.some((p) => p.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [clients, search, filter]);

  const stats = useMemo(() => {
    const withAccess = clients.filter((c) => c.hasPortalAccess).length;
    return { total: clients.length, withAccess, withoutAccess: clients.length - withAccess };
  }, [clients]);

  const openCredentialDialog = (clientId: string, clientName: string) => {
    const clientProjects = clients.find((c) => c.id === clientId)?.projects ?? [];
    setCredentialDialog({ clientId, clientName });
    setSelectedProjectIds(clientProjects.map((p) => p.id));
    setCredentials(null);
    setCopied(false);
  };

  const handleCreateCredentials = async () => {
    if (!credentialDialog) return;
    if (selectedProjectIds.length === 0) {
      toast.error('Select at least one project');
      return;
    }

    setIsCreating(true);
    try {
      const result = await setupPortalForClient(credentialDialog.clientId, selectedProjectIds);
      if (!result.success) {
        toast.error(result.error || 'Failed to create credentials');
        return;
      }

      const data = result.data as {
        userId: string;
        email: string;
        name: string;
        tempPassword?: string;
        alreadyExisted: boolean;
        projectsLinked: number;
      };

      setCredentials({
        email: data.email,
        password: data.tempPassword,
        name: data.name,
        alreadyExisted: data.alreadyExisted,
      });

      // Update local state
      setClients((prev) =>
        prev.map((c) =>
          c.id === credentialDialog.clientId
            ? { ...c, hasPortalAccess: true, portalUserId: data.userId }
            : c
        )
      );

      toast.success(
        data.alreadyExisted
          ? `${data.name} linked to ${data.projectsLinked} project(s)`
          : 'Portal credentials created!'
      );
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetDialog) return;

    setIsResetting(true);
    try {
      const result = await resetClientPassword(resetDialog.email);
      if (!result.success) {
        toast.error(result.error || 'Failed to reset password');
        return;
      }

      const data = result.data as { email: string; tempPassword: string };
      setResetResult(data);
      toast.success('Password reset successfully');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsResetting(false);
    }
  };

  const copyCredentials = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyResetCredentials = (text: string) => {
    navigator.clipboard.writeText(text);
    setResetCopied(true);
    setTimeout(() => setResetCopied(false), 2000);
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const toggleNewProject = (projectId: string) => {
    setNewProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const toggleManagedProject = (projectId: string) => {
    setManagedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleCreateWorkspace = async () => {
    if (!newClientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (!newClientEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    if (newProjectIds.length === 0) {
      toast.error('Select at least one project');
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const result = await createClientWorkspace(
        newClientName.trim(),
        newClientEmail.trim(),
        newProjectIds
      );
      if (!result.success) {
        toast.error(result.error || 'Failed to create workspace');
        return;
      }

      const data = result.data as {
        userId: string;
        email: string;
        name: string;
        tempPassword?: string;
        alreadyExisted: boolean;
        projectsLinked: number;
        clientId: string;
        isNewCrmClient: boolean;
      };

      setWorkspaceCredentials({
        email: data.email,
        password: data.tempPassword,
        name: data.name,
        alreadyExisted: data.alreadyExisted,
      });

      // Add the new client to local state so it appears in the grid immediately
      const linkedProjects = allProjects.filter((p) => newProjectIds.includes(p.id));
      setClients((prev) => [
        ...prev,
        {
          id: data.clientId,
          name: newClientName.trim(),
          email: data.email,
          leadStatus: 'active_client',
          projects: linkedProjects,
          hasPortalAccess: true,
          portalUserId: data.userId,
          lastSignIn: null,
        },
      ]);

      toast.success(
        data.alreadyExisted
          ? `${data.name} linked to ${data.projectsLinked} project(s)`
          : 'Workspace created!'
      );
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const copyWorkspaceCredentials = (text: string) => {
    navigator.clipboard.writeText(text);
    setWorkspaceCopied(true);
    setTimeout(() => setWorkspaceCopied(false), 2000);
  };

  const handleSaveProjects = async () => {
    if (!manageProjectsDialog) return;

    setIsSavingProjects(true);
    try {
      const result = await updateClientPortalProjects(
        manageProjectsDialog.clientId,
        managedProjectIds
      );
      if (!result.success) {
        toast.error(result.error || 'Failed to update projects');
        return;
      }

      // Update local state — projects for this client
      const updatedProjects = allProjects.filter((p) => managedProjectIds.includes(p.id));
      setClients((prev) =>
        prev.map((c) =>
          c.id === manageProjectsDialog.clientId ? { ...c, projects: updatedProjects } : c
        )
      );

      // Update assigned project IDs tracking
      const otherClientProjectIds = clients
        .filter((c) => c.id !== manageProjectsDialog.clientId)
        .flatMap((c) => c.projects.map((p) => p.id));
      setAssignedProjectIds([...otherClientProjectIds, ...managedProjectIds]);

      toast.success('Projects updated');
      setManageProjectsDialog(null);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSavingProjects(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Client Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage portal access and view client projects
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-primary text-white hover:bg-qualia-700"
          onClick={() => {
            setCreateWorkspaceOpen(true);
            setWorkspaceCredentials(null);
            setNewClientName('');
            setNewClientEmail('');
            setNewProjectIds([]);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> New Workspace
        </Button>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setFilter('with-access')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
            filter === 'with-access'
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          Portal Access
          <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">
            {stats.withAccess}
          </span>
        </button>
        <button
          onClick={() => setFilter('no-access')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
            filter === 'no-access'
              ? 'bg-amber-500/10 text-amber-600'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ShieldOff className="h-3.5 w-3.5" />
          No Access
          <span className="ml-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">
            {stats.withoutAccess}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          placeholder="Search clients, projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-lg border-border bg-card pl-10 text-sm placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Client Grid */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No clients found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((client) => (
            <div
              key={client.id}
              className={cn(
                'group relative flex flex-col rounded-xl border bg-card p-4 transition-all duration-200',
                'hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
                client.hasPortalAccess ? 'border-border' : 'border-dashed border-border'
              )}
            >
              {/* Top: Avatar + Name + Status */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-qualia-500 to-qualia-700 text-xs font-semibold text-white shadow-sm">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">{client.name}</h3>
                  {client.email && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{client.email}</p>
                  )}
                </div>
                {client.hasPortalAccess ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-border bg-muted/30 text-[10px] text-muted-foreground"
                  >
                    No Portal
                  </Badge>
                )}
              </div>

              {/* Projects */}
              {client.projects.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {client.projects.slice(0, 3).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/portal/${project.id}`)}
                      className={cn(
                        'inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all',
                        'hover:border-primary/30 hover:bg-primary/5',
                        STATUS_COLORS[project.status || ''] ||
                          'border-border bg-muted/20 text-muted-foreground'
                      )}
                    >
                      <Folder className="h-3 w-3 shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                  {client.projects.length > 3 && (
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-[11px] text-muted-foreground">
                      +{client.projects.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-muted-foreground/70">No projects assigned</p>
              )}

              {/* Last sign-in */}
              {client.hasPortalAccess && (
                <p className="mt-2 text-[10px] text-muted-foreground/70">
                  {client.lastSignIn
                    ? `Last seen ${formatDistanceToNow(new Date(client.lastSignIn), { addSuffix: true })}`
                    : 'Never signed in'}
                </p>
              )}

              {/* Actions */}
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                {client.hasPortalAccess ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        if (client.projects.length === 1) {
                          router.push(`/portal/${client.projects[0].id}`);
                        } else if (client.projects.length > 1) {
                          // Show projects — they're already clickable above
                        }
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Portal
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        if (client.email) {
                          setResetDialog({
                            clientId: client.id,
                            clientName: client.name,
                            email: client.email,
                          });
                          setResetResult(null);
                          setResetCopied(false);
                        } else {
                          toast.error('No email on file');
                        }
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset Password
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setManageProjectsDialog({
                          clientId: client.id,
                          clientName: client.name,
                          currentProjectIds: client.projects.map((p) => p.id),
                        });
                        setManagedProjectIds(client.projects.map((p) => p.id));
                      }}
                    >
                      <Folder className="h-3 w-3" />
                      Manage Projects
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      onClick={async () => {
                        if (
                          !client.portalUserId ||
                          !confirm(
                            `Revoke portal access for ${client.name}? This deletes their account and all project links.`
                          )
                        )
                          return;
                        const result = await revokePortalAccess(client.portalUserId);
                        if (result.success) {
                          toast.success(`Portal access revoked for ${client.name}`);
                          setClients((prev) =>
                            prev.map((c) =>
                              c.id === client.id
                                ? { ...c, hasPortalAccess: false, portalUserId: null }
                                : c
                            )
                          );
                        } else {
                          toast.error(result.error || 'Failed to revoke access');
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Revoke
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 border-primary/20 text-xs text-primary hover:bg-primary/10"
                    onClick={() => openCredentialDialog(client.id, client.name)}
                  >
                    <KeyRound className="h-3 w-3" />
                    Create Credentials
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Credentials Dialog */}
      <Dialog
        open={!!credentialDialog}
        onOpenChange={(open) => {
          if (!open) {
            setCredentialDialog(null);
            setCredentials(null);
            setSelectedProjectIds([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {credentials
                ? 'Credentials Ready'
                : `Set up portal for ${credentialDialog?.clientName}`}
            </DialogTitle>
          </DialogHeader>

          {credentials ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {credentials.alreadyExisted
                    ? `${credentials.name} already had an account — projects linked.`
                    : 'Portal account created successfully!'}
                </p>
              </div>

              {credentials.password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{credentials.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Password</p>
                      <p className="font-mono text-sm font-medium">{credentials.password}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() =>
                      copyCredentials(
                        `Portal: https://portal.qualiasolutions.net/portal\nEmail: ${credentials.email}\nPassword: ${credentials.password}`
                      )
                    }
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy All
                      </>
                    )}
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setCredentialDialog(null);
                  setCredentials(null);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Select projects to give access to:
                </p>
                <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {allProjects.map((project) => {
                    const isSelected = selectedProjectIds.includes(project.id);
                    return (
                      <button
                        key={project.id}
                        onClick={() => toggleProject(project.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all',
                          isSelected
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:bg-muted/30'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                            isSelected ? 'border-primary bg-primary text-white' : 'border-border'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="flex-1 truncate">{project.name}</span>
                        {project.status && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              STATUS_COLORS[project.status] || 'border-border'
                            )}
                          >
                            {project.status}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setCredentialDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary text-white hover:bg-qualia-700"
                  onClick={handleCreateCredentials}
                  disabled={isCreating || selectedProjectIds.length === 0}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-3.5 w-3.5" />
                      Create ({selectedProjectIds.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Workspace Dialog */}
      <Dialog
        open={createWorkspaceOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateWorkspaceOpen(false);
            setWorkspaceCredentials(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {workspaceCredentials ? (
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-emerald-600" />
                  Workspace Created
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  New Client Workspace
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {workspaceCredentials ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {workspaceCredentials.alreadyExisted
                    ? `${workspaceCredentials.name} already had an account — projects linked.`
                    : 'Portal workspace created successfully!'}
                </p>
              </div>

              {workspaceCredentials.password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{workspaceCredentials.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Password</p>
                      <p className="font-mono text-sm font-medium">
                        {workspaceCredentials.password}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() =>
                      copyWorkspaceCredentials(
                        `Portal: https://portal.qualiasolutions.net/portal\nEmail: ${workspaceCredentials.email}\nPassword: ${workspaceCredentials.password}`
                      )
                    }
                  >
                    {workspaceCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy All
                      </>
                    )}
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setCreateWorkspaceOpen(false);
                  setWorkspaceCredentials(null);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground/70">
                    Client Name
                  </label>
                  <Input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="h-9 border-border bg-card text-sm placeholder:text-muted-foreground/70"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground/70">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="h-9 border-border bg-card text-sm placeholder:text-muted-foreground/70"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground/70">
                    Projects to grant access to:
                  </p>
                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                    {allProjects.map((project) => {
                      const isSelected = newProjectIds.includes(project.id);
                      return (
                        <button
                          key={project.id}
                          onClick={() => toggleNewProject(project.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all',
                            isSelected
                              ? 'bg-primary/10 text-foreground'
                              : 'text-muted-foreground hover:bg-muted/30'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                              isSelected ? 'border-primary bg-primary text-white' : 'border-border'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="flex-1 truncate">{project.name}</span>
                          {project.status && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                STATUS_COLORS[project.status] || 'border-border'
                              )}
                            >
                              {project.status}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setCreateWorkspaceOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary text-white hover:bg-qualia-700 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={handleCreateWorkspace}
                  disabled={isCreatingWorkspace || newProjectIds.length === 0}
                >
                  {isCreatingWorkspace ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-3.5 w-3.5" />
                      Create Workspace
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Projects Dialog */}
      <Dialog
        open={!!manageProjectsDialog}
        onOpenChange={(open) => {
          if (!open) {
            setManageProjectsDialog(null);
            setManagedProjectIds([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              Manage Projects — {manageProjectsDialog?.clientName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground/70">
                Select projects this client can access:
              </p>
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {allProjects.map((project) => {
                  const isSelected = managedProjectIds.includes(project.id);
                  // Hide projects assigned to OTHER clients (but show ones assigned to this client)
                  const assignedToOther =
                    !isSelected &&
                    assignedProjectIds.includes(project.id) &&
                    !manageProjectsDialog?.currentProjectIds.includes(project.id);
                  if (assignedToOther) return null;
                  return (
                    <button
                      key={project.id}
                      onClick={() => toggleManagedProject(project.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all',
                        isSelected
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/30'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                          isSelected ? 'border-primary bg-primary text-white' : 'border-border'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="flex-1 truncate">{project.name}</span>
                      {project.status && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            STATUS_COLORS[project.status] || 'border-border'
                          )}
                        >
                          {project.status}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setManageProjectsDialog(null);
                  setManagedProjectIds([]);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary text-white hover:bg-qualia-700"
                onClick={handleSaveProjects}
                disabled={isSavingProjects}
              >
                {isSavingProjects ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Projects'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetDialog}
        onOpenChange={(open) => {
          if (!open) {
            setResetDialog(null);
            setResetResult(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {resetResult ? 'New Password' : `Reset password for ${resetDialog?.clientName}`}
            </DialogTitle>
          </DialogHeader>

          {resetResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{resetResult.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">New Password</p>
                  <p className="font-mono text-sm font-medium">{resetResult.tempPassword}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() =>
                  copyResetCredentials(
                    `Portal: https://portal.qualiasolutions.net/portal\nEmail: ${resetResult.email}\nPassword: ${resetResult.tempPassword}`
                  )
                }
              >
                {resetCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy All
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setResetDialog(null);
                  setResetResult(null);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will generate a new temporary password for{' '}
                <strong>{resetDialog?.email}</strong>. The client will need to use the new password
                to log in.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setResetDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
