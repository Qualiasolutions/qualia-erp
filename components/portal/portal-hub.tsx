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
} from 'lucide-react';
import { setupPortalForClient, resetClientPassword } from '@/app/actions/client-portal';
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
}

type FilterMode = 'all' | 'with-access' | 'no-access';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Launched: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Demos: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Delayed: 'bg-red-500/10 text-red-600 border-red-500/20',
  Archived: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export function PortalHub({ clients: initialClients, allProjects }: PortalHubProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Client Portal</h1>
        <p className="mt-1.5 text-sm text-muted-foreground/60">
          Manage portal access and view client projects
        </p>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
            filter === 'all'
              ? 'bg-foreground/[0.06] text-foreground'
              : 'text-muted-foreground/60 hover:text-foreground'
          )}
        >
          All Clients
          <span className="ml-1 rounded-full bg-foreground/[0.08] px-2 py-0.5 text-xs">
            {stats.total}
          </span>
        </button>
        <button
          onClick={() => setFilter('with-access')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
            filter === 'with-access'
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'text-muted-foreground/60 hover:text-foreground'
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
              : 'text-muted-foreground/60 hover:text-foreground'
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
        <Input
          placeholder="Search clients, projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-lg border-border/40 bg-card pl-10 text-sm placeholder:text-muted-foreground/40"
        />
      </div>

      {/* Client Grid */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/40">
          <p className="text-sm text-muted-foreground/50">No clients found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <div
              key={client.id}
              className={cn(
                'group relative flex flex-col rounded-xl border bg-card p-4 transition-all duration-200',
                'hover:border-qualia-500/30 hover:shadow-md hover:shadow-qualia-500/5',
                client.hasPortalAccess ? 'border-border/40' : 'border-dashed border-border/30'
              )}
            >
              {/* Top: Name + Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">{client.name}</h3>
                  {client.email && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground/50">
                      {client.email}
                    </p>
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
                    className="shrink-0 border-border/30 bg-muted/30 text-[10px] text-muted-foreground/50"
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
                        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all',
                        'hover:border-qualia-500/30 hover:bg-qualia-500/5',
                        STATUS_COLORS[project.status || ''] ||
                          'border-border/30 bg-muted/20 text-muted-foreground'
                      )}
                    >
                      <Folder className="h-3 w-3" />
                      {project.name}
                    </button>
                  ))}
                  {client.projects.length > 3 && (
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-[11px] text-muted-foreground/50">
                      +{client.projects.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-muted-foreground/40">No projects assigned</p>
              )}

              {/* Last sign-in */}
              {client.hasPortalAccess && client.lastSignIn && (
                <p className="mt-2 text-[10px] text-muted-foreground/40">
                  Last login {formatDistanceToNow(new Date(client.lastSignIn), { addSuffix: true })}
                </p>
              )}

              {/* Actions */}
              <div className="mt-auto flex items-center gap-2 pt-4">
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
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 border-qualia-500/20 text-xs text-qualia-600 hover:bg-qualia-500/10"
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
                      <p className="text-xs text-muted-foreground/60">Email</p>
                      <p className="text-sm font-medium">{credentials.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-xs text-muted-foreground/60">Password</p>
                      <p className="font-mono text-sm font-medium">{credentials.password}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() =>
                      copyCredentials(
                        `Portal: https://qualia-erp.vercel.app/portal\nEmail: ${credentials.email}\nPassword: ${credentials.password}`
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
                <p className="mb-2 text-xs font-medium text-muted-foreground/60">
                  Select projects to give access to:
                </p>
                <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border/30 p-2">
                  {allProjects.map((project) => {
                    const isSelected = selectedProjectIds.includes(project.id);
                    return (
                      <button
                        key={project.id}
                        onClick={() => toggleProject(project.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all',
                          isSelected
                            ? 'bg-qualia-500/10 text-foreground'
                            : 'text-muted-foreground hover:bg-muted/30'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                            isSelected
                              ? 'border-qualia-500 bg-qualia-500 text-white'
                              : 'border-border/50'
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
                              STATUS_COLORS[project.status] || 'border-border/30'
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
                  className="flex-1 bg-qualia-600 text-white hover:bg-qualia-700"
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
                  <p className="text-xs text-muted-foreground/60">Email</p>
                  <p className="text-sm font-medium">{resetResult.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground/60">New Password</p>
                  <p className="font-mono text-sm font-medium">{resetResult.tempPassword}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() =>
                  copyResetCredentials(
                    `Portal: https://qualia-erp.vercel.app/portal\nEmail: ${resetResult.email}\nPassword: ${resetResult.tempPassword}`
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
