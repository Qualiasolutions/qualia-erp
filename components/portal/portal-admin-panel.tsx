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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  UserPlus,
  Link2,
  Copy,
  Check,
  Mail,
  Loader2,
  Trash2,
  KeyRound,
  FolderOpen,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  inviteClientByEmail,
  removeClientFromProject,
  inviteClientToProject,
  sendClientPasswordReset,
  createProjectFromPortal,
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
  projects: initialProjects,
  clients: initialClients,
  assignments: initialAssignments,
}: PortalAdminPanelProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [clients, setClients] = useState(initialClients);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Create project form state
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState('');

  // Credentials display state
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [credsCopied, setCredsCopied] = useState(false);

  // Link project form state
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkClientId, setLinkClientId] = useState('');
  const [linkProjectId, setLinkProjectId] = useState('');

  const portalUrl = 'https://qualia-erp.vercel.app/portal';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Portal URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    startTransition(async () => {
      const result = await createProjectFromPortal({
        name: newProjectName.trim(),
        project_type: newProjectType,
        description: newProjectDescription.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to create project');
        return;
      }

      const newProject = result.data as Project;
      setProjects((prev) => [newProject, ...prev]);
      toast.success(`Project "${newProject.name}" created`);

      setNewProjectName('');
      setNewProjectType('');
      setNewProjectDescription('');
      setCreateProjectOpen(false);

      // Refresh server-rendered project picker grid
      router.refresh();
    });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    // Validate email format
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
        toast.error(result.error || 'Failed to invite client');
        return;
      }

      const data = result.data as
        | {
            userId?: string;
            emailSent?: boolean;
            tempPassword?: string;
          }
        | undefined;

      if (data?.tempPassword) {
        // Show credentials dialog so admin can copy them
        setCredentials({ email: inviteEmail.trim(), password: data.tempPassword });
        setCredentialsOpen(true);
        toast.success('Client account created!');
      } else {
        toast.success('Client linked to project');
      }

      // Add to local state
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
      setInviteOpen(false);
      router.refresh();
    });
  };

  const handleLinkProject = () => {
    if (!linkClientId || !linkProjectId) {
      toast.error('Select both client and project');
      return;
    }

    // Check if already linked
    if (assignments.some((a) => a.client_id === linkClientId && a.project_id === linkProjectId)) {
      toast.error('Client already has access to this project');
      return;
    }

    startTransition(async () => {
      const result = await inviteClientToProject(linkProjectId, linkClientId);
      if (!result.success) {
        toast.error(result.error || 'Failed to link project');
        return;
      }

      toast.success('Project access granted');

      const client = clients.find((c) => c.id === linkClientId);
      const project = projects.find((p) => p.id === linkProjectId);
      setAssignments((prev) => [
        {
          id: crypto.randomUUID(),
          client_id: linkClientId,
          project_id: linkProjectId,
          access_level: null,
          invited_at: new Date().toISOString(),
          client: client
            ? { id: client.id, full_name: client.full_name, email: client.email }
            : null,
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

      setLinkClientId('');
      setLinkProjectId('');
      setLinkOpen(false);
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
      {/* Quick actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleCopyUrl} className="gap-2">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy Portal URL'}
        </Button>

        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Portal
        </a>

        <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a project, then invite a client and link them to it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Project Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. ACME Website Redesign"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Project Type</label>
                <Select value={newProjectType} onValueChange={setNewProjectType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web_design">Web Design</SelectItem>
                    <SelectItem value="ai_agent">AI Agent</SelectItem>
                    <SelectItem value="voice_agent">Voice Agent</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="ads">Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Brief project description (optional)"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateProjectOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={isPending || !newProjectName.trim()}
                  className="gap-2"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="h-3.5 w-3.5" />
              Invite Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Client</DialogTitle>
              <DialogDescription>
                Create a client account and get login credentials to share with them.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email *</label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <Input
                  type="text"
                  placeholder="Client name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Assign to Project *
                </label>
                <Select value={inviteProjectId} onValueChange={setInviteProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={isPending || !inviteEmail.trim() || !inviteProjectId}
                  className="gap-2"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Send Invite
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {clients.length > 0 && (
          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Link2 className="h-3.5 w-3.5" />
                Link Project to Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Project to Existing Client</DialogTitle>
                <DialogDescription>Grant an existing client access to a project.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Client</label>
                  <Select value={linkClientId} onValueChange={setLinkClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name || c.email || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <Select value={linkProjectId} onValueChange={setLinkProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setLinkOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleLinkProject}
                    disabled={isPending || !linkClientId || !linkProjectId}
                    className="gap-2"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Grant Access
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Client accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-qualia-600" />
            Client Accounts
            {clients.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {clients.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientAssignments.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Users className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">No client accounts yet</p>
              <p className="mt-1 text-sm text-muted-foreground/80">
                Invite your first client to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                                <Badge key={p.id} variant="outline" className="text-xs">
                                  {p.name}
                                </Badge>
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
                          aria-label="Send password reset"
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
          )}
        </CardContent>
      </Card>

      {/* Project assignments */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4 text-qualia-600" />
              Project Access Log
              <Badge variant="secondary" className="ml-1">
                {assignments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.project?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.client?.full_name || a.client?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground/80">
                        {a.invited_at ? new Date(a.invited_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAccess(a.id, a.project_id, a.client_id)}
                          disabled={isPending}
                          className={cn(
                            'h-8 w-8 p-0',
                            'text-muted-foreground/60 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
                          )}
                          title="Remove access"
                          aria-label="Remove access"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
      {/* Credentials dialog */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Account Created</DialogTitle>
            <DialogDescription>
              Share these login credentials with the client. They can log in at the portal URL.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border bg-muted/50 p-4 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p>
                      <span className="text-muted-foreground">Email:</span> {credentials.email}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Password:</span>{' '}
                      {credentials.password}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Portal:</span> {portalUrl}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Email: ${credentials.email}\nPassword: ${credentials.password}\nPortal: ${portalUrl}`
                    );
                    setCredsCopied(true);
                    toast.success('Credentials copied!');
                    setTimeout(() => setCredsCopied(false), 2000);
                  }}
                >
                  {credsCopied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {credsCopied ? 'Copied!' : 'Copy All'}
                </Button>
                <Button size="sm" onClick={() => setCredentialsOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
