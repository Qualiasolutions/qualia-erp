'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Copy, Check, Loader2, Trash2, KeyRound, UserPlus } from 'lucide-react';
import {
  setupClientForProject,
  removeClientFromProject,
  sendClientPasswordReset,
} from '@/app/actions/client-portal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  status: string | null;
  project_type: string | null;
}

interface ClientProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

interface Assignment {
  id: string;
  client_id: string;
  project_id: string;
  access_level: string | null;
  invited_at: string | null;
  client: { id: string; full_name: string | null; email: string | null } | null;
  project: { id: string; name: string; status: string | null; project_type: string | null } | null;
}

interface PortalAdminPanelProps {
  projects: Project[];
  clients: ClientProfile[];
  assignments: Assignment[];
}

export function PortalAdminPanel({
  projects,
  clients: initialClients,
  assignments: initialAssignments,
}: PortalAdminPanelProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isPending, startTransition] = useTransition();

  // Setup form
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Credentials after setup
  const [credentials, setCredentials] = useState<{
    email: string;
    password?: string;
    name: string;
    alreadyExisted: boolean;
  } | null>(null);
  const [credsCopied, setCredsCopied] = useState(false);

  const portalUrl = 'https://qualia-erp.vercel.app/portal';

  // Show all projects (some may already have clients linked)
  const availableProjects = projects;

  const handleSetup = async () => {
    if (!selectedProjectId) {
      toast.error('Select a project');
      return;
    }

    setIsSettingUp(true);
    setCredentials(null);

    try {
      const result = await setupClientForProject(selectedProjectId);
      if (!result.success) {
        toast.error(result.error || 'Failed to setup client');
        return;
      }

      const data = result.data as {
        userId: string;
        email: string;
        name: string;
        tempPassword?: string;
        alreadyExisted: boolean;
      };

      setCredentials({
        email: data.email,
        password: data.tempPassword,
        name: data.name,
        alreadyExisted: data.alreadyExisted,
      });

      if (data.alreadyExisted) {
        toast.success('Existing client linked to project');
      } else {
        toast.success('Client account created!');
      }

      // Update local state
      const newClient: ClientProfile = {
        id: data.userId,
        full_name: data.name,
        email: data.email,
        role: 'client',
        created_at: new Date().toISOString(),
      };
      if (!clients.find((c) => c.id === data.userId)) {
        setClients((prev) => [newClient, ...prev]);
      }

      const project = projects.find((p) => p.id === selectedProjectId);
      setAssignments((prev) => [
        {
          id: crypto.randomUUID(),
          client_id: data.userId,
          project_id: selectedProjectId,
          access_level: null,
          invited_at: new Date().toISOString(),
          client: { id: data.userId, full_name: data.name, email: data.email },
          project: project
            ? {
                id: project.id,
                name: project.name,
                status: project.status,
                project_type: project.project_type,
              }
            : null,
        },
        ...prev,
      ]);

      setSelectedProjectId('');
      router.refresh();
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleRemoveAccess = (assignmentId: string, projectId: string, clientId: string) => {
    const removed = assignments.find((a) => a.id === assignmentId);
    const confirmed = window.confirm(
      `Remove ${removed?.client?.full_name || 'this client'}'s access to ${removed?.project?.name || 'this project'}? This cannot be undone.`
    );
    if (!confirmed) return;
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));

    startTransition(async () => {
      const result = await removeClientFromProject(projectId, clientId);
      if (!result.success) {
        if (removed) setAssignments((prev) => [removed, ...prev]);
        toast.error(result.error || 'Failed to remove access');
        return;
      }
      toast.success('Access removed');
    });
  };

  const handleSendPasswordReset = (email: string) => {
    startTransition(async () => {
      const result = await sendClientPasswordReset(email);
      if (!result.success) {
        toast.error(result.error || 'Failed to send reset email');
        return;
      }
      toast.success(`Password reset email sent to ${email}`);
    });
  };

  const handleCopyCredentials = () => {
    if (!credentials || !credentials.password) return;
    navigator.clipboard.writeText(
      `Email: ${credentials.email}\nPassword: ${credentials.password}\nPortal: ${portalUrl}`
    );
    setCredsCopied(true);
    toast.success('Credentials copied!');
    setTimeout(() => setCredsCopied(false), 2000);
  };

  // Group assignments by client
  const clientAssignments = clients.map((client) => ({
    ...client,
    projects: assignments
      .filter((a) => a.client_id === client.id)
      .map((a) => a.project)
      .filter(Boolean),
  }));

  return (
    <div className="space-y-6">
      {/* Setup client access — single action */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/10">
              <UserPlus className="h-4 w-4 text-qualia-600" />
            </div>
            Setup Client Access
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick a project — credentials are generated automatically.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {availableProjects.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    All projects have clients
                  </SelectItem>
                ) : (
                  availableProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSetup}
              disabled={isSettingUp || !selectedProjectId}
              className="shrink-0 gap-2 bg-qualia-600 text-white hover:bg-qualia-700"
            >
              {isSettingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create Client
            </Button>
          </div>

          {/* Credentials result */}
          {credentials && (
            <div className="mt-4 rounded-xl border border-qualia-500/20 bg-gradient-to-br from-qualia-500/5 to-transparent p-4 ring-1 ring-qualia-500/10">
              {credentials.password ? (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-qualia-500/15">
                      <Check className="h-3.5 w-3.5 text-qualia-600" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      Client access created
                    </span>
                  </div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Client credentials for {credentials.name} — share with the client:
                  </p>
                  <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/50 p-3 font-mono text-xs">
                    <div className="space-y-0.5">
                      <p>
                        <span className="text-muted-foreground">Email:</span> {credentials.email}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Password:</span>{' '}
                        {credentials.password}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Login at:</span> {portalUrl}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 shrink-0 gap-2"
                      onClick={handleCopyCredentials}
                    >
                      {credsCopied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {credsCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Existing client ({credentials.email}) linked to {credentials.name}.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client accounts table */}
      {clientAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-qualia-500/10">
                <Users className="h-3.5 w-3.5 text-qualia-600" />
              </div>
              Client Accounts
              <Badge variant="secondary" className="ml-1">
                {clients.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Client</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Projects</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Joined</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientAssignments.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.full_name || 'No name'}</TableCell>
                      <TableCell className="text-muted-foreground">{client.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.projects.length === 0 ? (
                            <span className="text-sm text-muted-foreground/60">None</span>
                          ) : (
                            client.projects.map((p) =>
                              p ? (
                                <div key={p.id} className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {p.name}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const a = assignments.find(
                                        (a) => a.client_id === client.id && a.project_id === p.id
                                      );
                                      if (a) handleRemoveAccess(a.id, a.project_id, a.client_id);
                                    }}
                                    disabled={isPending}
                                    className={cn(
                                      'h-5 w-5 p-0',
                                      'text-muted-foreground/40 hover:bg-red-500/10 hover:text-red-600'
                                    )}
                                    title="Remove access"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : null
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground/80">
                        {new Date(client.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => client.email && handleSendPasswordReset(client.email)}
                          disabled={isPending || !client.email}
                          title="Send password reset"
                          className="h-8 w-8 p-0"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
