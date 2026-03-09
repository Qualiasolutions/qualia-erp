'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Users, UserPlus, Copy, Check, Loader2, Trash2, KeyRound } from 'lucide-react';
import {
  inviteClientByEmail,
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

  // Invite form — always visible, no dialog needed
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState('');

  // Credentials after invite
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [credsCopied, setCredsCopied] = useState(false);

  const portalUrl = 'https://qualia-erp.vercel.app/portal';

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!inviteProjectId) {
      toast.error('Select a project');
      return;
    }

    startTransition(async () => {
      const result = await inviteClientByEmail(
        inviteProjectId,
        inviteEmail.trim(),
        inviteName || undefined
      );
      if (!result.success) {
        toast.error(result.error || 'Failed to create client');
        return;
      }

      const data = result.data as
        | {
            userId?: string;
            tempPassword?: string;
          }
        | undefined;

      if (data?.tempPassword) {
        setCredentials({ email: inviteEmail.trim(), password: data.tempPassword });
        toast.success('Client account created!');
      } else {
        toast.success('Client linked to project');
      }

      // Update local state
      if (data?.userId) {
        const newClient: ClientProfile = {
          id: data.userId,
          full_name: inviteName || null,
          email: inviteEmail.trim(),
          role: 'client',
          created_at: new Date().toISOString(),
        };
        if (!clients.find((c) => c.id === data.userId)) {
          setClients((prev) => [newClient, ...prev]);
        }
        const project = projects.find((p) => p.id === inviteProjectId);
        setAssignments((prev) => [
          {
            id: crypto.randomUUID(),
            client_id: data.userId!,
            project_id: inviteProjectId,
            access_level: null,
            invited_at: new Date().toISOString(),
            client: { id: data.userId!, full_name: inviteName || null, email: inviteEmail.trim() },
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
      }

      setInviteEmail('');
      setInviteName('');
      setInviteProjectId('');
      router.refresh();
    });
  };

  const handleRemoveAccess = (assignmentId: string, projectId: string, clientId: string) => {
    const removed = assignments.find((a) => a.id === assignmentId);
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
    if (!credentials) return;
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
      {/* Invite client — simple inline form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-qualia-600" />
            Add Client to Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <Input
              type="email"
              placeholder="Client email *"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Client name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <Select value={inviteProjectId} onValueChange={setInviteProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project *" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={isPending || !inviteEmail.trim() || !inviteProjectId}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create & Link
            </Button>
          </div>

          {/* Credentials result — shows right after invite */}
          {credentials && (
            <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
                Client credentials — share these with the client:
              </p>
              <div className="flex items-center justify-between rounded-md bg-background p-3 font-mono text-sm">
                <div className="space-y-0.5">
                  <p>
                    <span className="text-muted-foreground">Email:</span> {credentials.email}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Password:</span> {credentials.password}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client accounts table */}
      {clientAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-qualia-600" />
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
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Joined</TableHead>
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
