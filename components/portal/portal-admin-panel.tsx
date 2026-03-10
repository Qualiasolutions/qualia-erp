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
import {
  Users,
  Copy,
  Check,
  Loader2,
  Trash2,
  KeyRound,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  FolderPlus,
} from 'lucide-react';
import {
  setupPortalForClient,
  removeClientFromProject,
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

interface CrmClient {
  id: string;
  name: string;
  contacts: Array<{ email?: string }> | null;
}

interface PortalAdminPanelProps {
  projects: Project[];
  clients: ClientProfile[];
  assignments: Assignment[];
  crmClients: CrmClient[];
}

export function PortalAdminPanel({
  projects,
  clients: initialClients,
  assignments: initialAssignments,
  crmClients,
}: PortalAdminPanelProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isPending, startTransition] = useTransition();

  // Two-step flow state
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCrmClientId, setSelectedCrmClientId] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Project creation
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Credentials after setup
  const [credentials, setCredentials] = useState<{
    email: string;
    password?: string;
    name: string;
    alreadyExisted: boolean;
    projectsLinked: number;
  } | null>(null);
  const [credsCopied, setCredsCopied] = useState(false);

  const portalUrl = 'https://qualia-erp.vercel.app/portal';

  // Derived: selected CRM client details
  const selectedCrmClient = crmClients.find((c) => c.id === selectedCrmClientId) || null;
  const selectedCrmClientEmail =
    selectedCrmClient?.contacts?.[0]?.email?.trim().toLowerCase() || null;

  const handleNextStep = () => {
    if (!selectedCrmClientId) {
      toast.error('Select a client');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedProjectIds([]);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    setIsCreatingProject(true);
    try {
      const result = await createProjectFromPortal({
        name: newProjectName.trim(),
        project_type: newProjectType || 'web_design',
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to create project');
        return;
      }
      toast.success('Project created');
      setNewProjectName('');
      setNewProjectType('');
      router.refresh();
    } finally {
      setIsCreatingProject(false);
    }
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSetup = async () => {
    if (!selectedCrmClientId) {
      toast.error('No client selected');
      return;
    }
    if (selectedProjectIds.length === 0) {
      toast.error('Select at least one project');
      return;
    }

    setIsSettingUp(true);
    setCredentials(null);

    try {
      const result = await setupPortalForClient(selectedCrmClientId, selectedProjectIds);
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
        projectsLinked: number;
      };

      setCredentials({
        email: data.email,
        password: data.tempPassword,
        name: data.name,
        alreadyExisted: data.alreadyExisted,
        projectsLinked: data.projectsLinked,
      });

      if (data.alreadyExisted) {
        toast.success(`${data.name} linked to ${data.projectsLinked} project(s)`);
      } else {
        toast.success('Client portal account created!');
      }

      // Update local state optimistically
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

      for (const projectId of selectedProjectIds) {
        const project = projects.find((p) => p.id === projectId);
        const alreadyLinked = assignments.some(
          (a) => a.client_id === data.userId && a.project_id === projectId
        );
        if (!alreadyLinked) {
          setAssignments((prev) => [
            {
              id: crypto.randomUUID(),
              client_id: data.userId,
              project_id: projectId,
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
        }
      }

      // Reset form back to step 1
      setSelectedCrmClientId('');
      setSelectedProjectIds([]);
      setStep(1);
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
      {/* Create new project */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/10">
              <FolderPlus className="h-4 w-4 text-qualia-600" />
            </div>
            Create New Project
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add a project before setting up client access.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Select value={newProjectType} onValueChange={setNewProjectType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web_design">Web Design</SelectItem>
                <SelectItem value="ai_agent">AI Agent</SelectItem>
                <SelectItem value="voice_agent">Voice Agent</SelectItem>
                <SelectItem value="seo">SEO</SelectItem>
                <SelectItem value="ads">Ads</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreateProject}
              disabled={isCreatingProject || !newProjectName.trim()}
              className="shrink-0 gap-2 bg-qualia-600 text-white hover:bg-qualia-700"
            >
              {isCreatingProject ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup client access — two-step flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/10">
              <UserPlus className="h-4 w-4 text-qualia-600" />
            </div>
            Setup Client Access
            <span className="ml-auto text-xs font-normal text-muted-foreground/60">
              Step {step} of 2
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === 1
              ? 'Pick a CRM client — their email is used for portal credentials.'
              : `Assign projects for ${selectedCrmClient?.name || 'client'}.`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="flex gap-3">
              <Select value={selectedCrmClientId} onValueChange={setSelectedCrmClientId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a CRM client..." />
                </SelectTrigger>
                <SelectContent>
                  {crmClients.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No CRM clients found
                    </SelectItem>
                  ) : (
                    crmClients.map((c) => {
                      const email = c.contacts?.[0]?.email;
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {email ? ` (${email})` : ''}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleNextStep}
                disabled={!selectedCrmClientId}
                className="shrink-0 gap-2 bg-qualia-600 text-white hover:bg-qualia-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && selectedCrmClient && (
            <div className="space-y-4">
              {/* Client info summary */}
              <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium text-foreground">{selectedCrmClient.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCrmClientEmail ?? (
                    <span className="text-amber-500">No email on file</span>
                  )}
                </p>
              </div>

              {/* Project multi-select */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Assign projects</p>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">No active projects</p>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {projects.map((p) => {
                      const checked = selectedProjectIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProject(p.id)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                            checked
                              ? 'border-qualia-500/50 bg-qualia-500/10 text-foreground'
                              : 'border-border/50 bg-background text-muted-foreground hover:border-border hover:text-foreground'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                              checked
                                ? 'border-qualia-600 bg-qualia-600'
                                : 'border-border bg-background'
                            )}
                          >
                            {checked && <Check className="h-2.5 w-2.5 text-white" />}
                          </span>
                          <span className="truncate font-medium">{p.name}</span>
                          {p.status && (
                            <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                              {p.status}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSetup}
                  disabled={isSettingUp || selectedProjectIds.length === 0}
                  className="gap-2 bg-qualia-600 text-white hover:bg-qualia-700"
                >
                  {isSettingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Create Portal Access
                </Button>
              </div>
            </div>
          )}

          {/* Credentials result */}
          {credentials && (
            <div className="rounded-xl border border-qualia-500/20 bg-gradient-to-br from-qualia-500/5 to-transparent p-4 ring-1 ring-qualia-500/10">
              {credentials.password ? (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-qualia-500/15">
                      <Check className="h-3.5 w-3.5 text-qualia-600" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      Client access created — {credentials.projectsLinked} project(s) linked
                    </span>
                  </div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Credentials for {credentials.name} — share with the client:
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
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-qualia-500/15">
                    <Check className="h-3.5 w-3.5 text-qualia-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Existing portal account ({credentials.email}) linked to{' '}
                    {credentials.projectsLinked} project(s).
                  </p>
                </div>
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
