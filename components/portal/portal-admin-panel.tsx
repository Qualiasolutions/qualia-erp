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
  X,
  Layers,
  RotateCcw,
  Download,
} from 'lucide-react';
import {
  setupPortalForClient,
  removeClientFromProject,
  sendClientPasswordReset,
  createProjectFromPortal,
  bulkSetupPortalForClients,
  resetClientPassword,
} from '@/app/actions/client-portal';
import type { MergedPortalClient } from '@/app/actions/client-portal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
  clientManagement: {
    clients: MergedPortalClient[];
    totalActive: number;
    totalInactive: number;
  } | null;
}

export function PortalAdminPanel({
  projects,
  clients: initialClients,
  assignments: initialAssignments,
  crmClients,
  clientManagement,
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

  // Bulk mode state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedCrmClientIds, setSelectedCrmClientIds] = useState<string[]>([]);
  const [bulkResults, setBulkResults] = useState<Array<{
    crmClientId: string;
    success: boolean;
    email?: string;
    name?: string;
    tempPassword?: string;
    alreadyExisted?: boolean;
    projectsLinked?: number;
    error?: string;
  }> | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [allCredsCopied, setAllCredsCopied] = useState(false);

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

  // Bulk mode handlers
  const toggleBulkMode = () => {
    setIsBulkMode((prev) => !prev);
    // Reset all state when switching modes
    setSelectedCrmClientIds([]);
    setSelectedProjectIds([]);
    setStep(1);
    setSelectedCrmClientId('');
    setCredentials(null);
    setBulkResults(null);
  };

  const toggleBulkClient = (clientId: string) => {
    setSelectedCrmClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const handleBulkNextStep = () => {
    if (selectedCrmClientIds.length === 0) {
      toast.error('Select at least one client');
      return;
    }
    setStep(2);
  };

  const handleBulkBack = () => {
    setStep(1);
    setSelectedProjectIds([]);
  };

  const handleBulkSetup = async () => {
    if (selectedCrmClientIds.length === 0) {
      toast.error('No clients selected');
      return;
    }
    if (selectedProjectIds.length === 0) {
      toast.error('Select at least one project');
      return;
    }

    setIsBulkPending(true);
    setBulkResults(null);

    try {
      const result = await bulkSetupPortalForClients(selectedCrmClientIds, selectedProjectIds);

      if (!result.success && !result.data) {
        toast.error(result.error || 'Bulk setup failed');
        return;
      }

      const data = result.data as {
        results: Array<{
          crmClientId: string;
          success: boolean;
          email?: string;
          name?: string;
          tempPassword?: string;
          alreadyExisted?: boolean;
          projectsLinked?: number;
          error?: string;
        }>;
        totalSuccess: number;
        totalFailed: number;
      };

      setBulkResults(data.results);

      if (data.totalFailed === 0) {
        toast.success(`${data.totalSuccess} client(s) set up successfully`);
      } else if (data.totalSuccess > 0) {
        toast.warning(`${data.totalSuccess} succeeded, ${data.totalFailed} failed`);
      } else {
        toast.error('All client setups failed');
      }

      // Reset form but keep results visible
      setSelectedCrmClientIds([]);
      setSelectedProjectIds([]);
      setStep(1);
      router.refresh();
    } finally {
      setIsBulkPending(false);
    }
  };

  const handleCopyAllCredentials = () => {
    if (!bulkResults) return;
    const lines = bulkResults
      .filter((r) => r.success && r.tempPassword)
      .map((r) => `${r.name} | ${r.email} | ${r.tempPassword} | Portal: ${portalUrl}`)
      .join('\n');
    if (!lines) return;
    navigator.clipboard.writeText(lines);
    setAllCredsCopied(true);
    toast.success('All credentials copied!');
    setTimeout(() => setAllCredsCopied(false), 2000);
  };

  // Group assignments by client (for fallback table)
  const clientAssignments = clients.map((client) => ({
    ...client,
    projects: assignments
      .filter((a) => a.client_id === client.id)
      .map((a) => a.project)
      .filter(Boolean),
  }));

  // Client management table filter state
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Export Credentials state
  const [showExportSection, setShowExportSection] = useState(false);
  const [exportProjectId, setExportProjectId] = useState('');
  const [exportCopied, setExportCopied] = useState(false);

  // Per-row reset state
  const [resetResults, setResetResults] = useState<
    Record<string, { tempPassword: string; name: string | null }>
  >({});
  const [pendingReset, setPendingReset] = useState<string | null>(null);

  // Bulk reset state
  const [bulkResetResults, setBulkResetResults] = useState<Array<{
    email: string;
    name: string | null;
    tempPassword?: string;
    error?: string;
  }> | null>(null);
  const [isBulkResetPending, setIsBulkResetPending] = useState(false);
  const [bulkResetCopied, setBulkResetCopied] = useState(false);

  // Derive unique projects from clientManagement for the project filter dropdown
  const allManagedProjects = clientManagement
    ? Array.from(
        new Map(clientManagement.clients.flatMap((c) => c.projects).map((p) => [p.id, p])).values()
      ).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Filtered clients for the enhanced table
  const filteredManagedClients = clientManagement
    ? clientManagement.clients.filter((c) => {
        if (projectFilter && !c.projects.some((p) => p.id === projectFilter)) return false;
        if (statusFilter === 'active' && !c.isActive) return false;
        if (statusFilter === 'inactive' && c.isActive) return false;
        return true;
      })
    : [];

  // Export credentials handler
  const handleCopyExport = () => {
    if (!exportProjectId || !clientManagement) return;
    const project = allManagedProjects.find((p) => p.id === exportProjectId);
    if (!project) return;
    const projectClients = clientManagement.clients.filter((c) =>
      c.projects.some((p) => p.id === exportProjectId)
    );
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const clientLines = projectClients
      .map(
        (c) =>
          `---\n${c.full_name || 'Client'}\nEmail: ${c.email || 'N/A'}\nPassword: [reset via admin panel]\nPortal: ${portalUrl}`
      )
      .join('\n\n');
    const exportBlock = `Portal Access — ${project.name}\nGenerated: ${date}\nLogin URL: ${portalUrl}\n\n${clientLines}`;
    navigator.clipboard.writeText(exportBlock);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  // Per-row reset handler
  const handleResetPassword = (clientId: string, email: string) => {
    setPendingReset(clientId);
    startTransition(async () => {
      const result = await resetClientPassword(email);
      setPendingReset(null);
      if (!result.success) {
        toast.error(result.error || 'Failed to reset password');
        return;
      }
      const data = result.data as { email: string; tempPassword: string; name: string | null };
      setResetResults((prev) => ({
        ...prev,
        [clientId]: { tempPassword: data.tempPassword, name: data.name },
      }));
      // Auto-dismiss after 30 seconds
      setTimeout(() => {
        setResetResults((prev) => {
          const next = { ...prev };
          delete next[clientId];
          return next;
        });
      }, 30000);
    });
  };

  // Bulk reset handler
  const handleBulkReset = async () => {
    if (!projectFilter || !clientManagement) return;
    const projectClients = clientManagement.clients.filter((c) =>
      c.projects.some((p) => p.id === projectFilter)
    );
    if (projectClients.length === 0) {
      toast.error('No clients in this project');
      return;
    }
    setIsBulkResetPending(true);
    setBulkResetResults(null);
    const results: Array<{
      email: string;
      name: string | null;
      tempPassword?: string;
      error?: string;
    }> = [];
    for (const client of projectClients) {
      if (!client.email) {
        results.push({ email: 'N/A', name: client.full_name, error: 'No email on file' });
        continue;
      }
      const result = await resetClientPassword(client.email);
      if (result.success) {
        const data = result.data as { email: string; tempPassword: string; name: string | null };
        results.push({
          email: client.email,
          name: client.full_name,
          tempPassword: data.tempPassword,
        });
      } else {
        results.push({ email: client.email, name: client.full_name, error: result.error });
      }
    }
    setBulkResetResults(results);
    setIsBulkResetPending(false);
    const succeeded = results.filter((r) => r.tempPassword).length;
    if (succeeded > 0) {
      toast.success(`Passwords reset for ${succeeded} client(s)`);
    } else {
      toast.error('All password resets failed');
    }
  };

  const handleCopyBulkResetCredentials = () => {
    if (!bulkResetResults) return;
    const lines = bulkResetResults
      .filter((r) => r.tempPassword)
      .map((r) => `${r.name || 'Client'} | ${r.email} | ${r.tempPassword}`)
      .join('\n');
    if (!lines) return;
    navigator.clipboard.writeText(lines);
    setBulkResetCopied(true);
    toast.success('Credentials copied!');
    setTimeout(() => setBulkResetCopied(false), 2000);
  };

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
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={isBulkMode ? 'default' : 'outline'}
                size="sm"
                onClick={toggleBulkMode}
                className={cn(
                  'h-7 gap-1.5 px-2.5 text-xs',
                  isBulkMode && 'bg-qualia-600 text-white hover:bg-qualia-700'
                )}
              >
                <Layers className="h-3 w-3" />
                Bulk
              </Button>
              {!isBulkMode && (
                <span className="text-xs font-normal text-muted-foreground/60">
                  Step {step} of 2
                </span>
              )}
            </div>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isBulkMode
              ? step === 1
                ? 'Select multiple CRM clients to onboard at once.'
                : `Assign projects to all ${selectedCrmClientIds.length} selected client(s).`
              : step === 1
                ? 'Pick a CRM client — their email is used for portal credentials.'
                : `Assign projects for ${selectedCrmClient?.name || 'client'}.`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── SINGLE MODE ── */}
          {!isBulkMode && step === 1 && (
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

          {!isBulkMode && step === 2 && selectedCrmClient && (
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

          {/* Credentials result (single mode) */}
          {!isBulkMode && credentials && (
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

          {/* ── BULK MODE ── */}
          {isBulkMode && step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Select CRM clients to onboard ({selectedCrmClientIds.length} selected)
              </p>
              {crmClients.length === 0 ? (
                <p className="text-sm text-muted-foreground/60">No CRM clients found</p>
              ) : (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {crmClients.map((c) => {
                    const email = c.contacts?.[0]?.email;
                    const checked = selectedCrmClientIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleBulkClient(c.id)}
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
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.name}</span>
                          {email && (
                            <span className="block truncate text-[10px] text-muted-foreground/70">
                              {email}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <Button
                onClick={handleBulkNextStep}
                disabled={selectedCrmClientIds.length === 0}
                className="gap-2 bg-qualia-600 text-white hover:bg-qualia-700"
              >
                Next — {selectedCrmClientIds.length} client
                {selectedCrmClientIds.length !== 1 ? 's' : ''}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isBulkMode && step === 2 && (
            <div className="space-y-4">
              {/* Selected clients summary pill */}
              <div className="flex flex-wrap gap-1.5">
                {selectedCrmClientIds.map((id) => {
                  const c = crmClients.find((cl) => cl.id === id);
                  return c ? (
                    <Badge key={id} variant="secondary" className="gap-1 text-xs">
                      {c.name}
                    </Badge>
                  ) : null;
                })}
              </div>

              {/* Project multi-select */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Assign projects to all clients
                </p>
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
                <Button variant="outline" onClick={handleBulkBack} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleBulkSetup}
                  disabled={isBulkPending || selectedProjectIds.length === 0}
                  className="gap-2 bg-qualia-600 text-white hover:bg-qualia-700"
                >
                  {isBulkPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Create Portal Access for {selectedCrmClientIds.length} Client
                  {selectedCrmClientIds.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}

          {/* Bulk results */}
          {isBulkMode && bulkResults && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Results</p>
              <div className="space-y-1.5">
                {bulkResults.map((r) => {
                  const clientName =
                    r.name || crmClients.find((c) => c.id === r.crmClientId)?.name || r.crmClientId;
                  return (
                    <div
                      key={r.crmClientId}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm',
                        r.success
                          ? 'border-green-500/20 bg-green-500/5'
                          : 'border-red-500/20 bg-red-500/5'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                          r.success ? 'bg-green-500/20' : 'bg-red-500/20'
                        )}
                      >
                        {r.success ? (
                          <Check className="h-2.5 w-2.5 text-green-600" />
                        ) : (
                          <X className="h-2.5 w-2.5 text-red-600" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-foreground">{clientName}</span>
                        {r.success ? (
                          <span className="text-muted-foreground">
                            {' '}
                            —{' '}
                            {r.alreadyExisted
                              ? `linked to ${r.projectsLinked} project(s)`
                              : `${r.email} / ${r.tempPassword} / ${r.projectsLinked} project(s)`}
                          </span>
                        ) : (
                          <span className="text-red-600"> — {r.error}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {bulkResults.some((r) => r.success && r.tempPassword) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAllCredentials}
                  className="mt-1 gap-2"
                >
                  {allCredsCopied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {allCredsCopied ? 'Copied!' : 'Copy All Credentials'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Management table — enhanced with last login + status + filters */}
      {clientManagement
        ? clientManagement.clients.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-qualia-500/10">
                    <Users className="h-3.5 w-3.5 text-qualia-600" />
                  </div>
                  Client Management
                  <div className="ml-auto flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-green-500/30 bg-green-500/10 text-[11px] text-green-700"
                    >
                      {clientManagement.totalActive} Active
                    </Badge>
                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                      {clientManagement.totalInactive} Inactive
                    </Badge>
                    <Button
                      variant={showExportSection ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowExportSection((v) => !v)}
                      className={cn(
                        'h-7 gap-1.5 px-2.5 text-xs',
                        showExportSection && 'bg-qualia-600 text-white hover:bg-qualia-700'
                      )}
                    >
                      <Download className="h-3 w-3" />
                      Export Credentials
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Export Credentials (collapsible) */}
                {showExportSection && (
                  <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Export Credentials
                    </p>
                    <div className="flex items-center gap-2">
                      <Select value={exportProjectId} onValueChange={setExportProjectId}>
                        <SelectTrigger className="h-8 flex-1 text-xs">
                          <SelectValue placeholder="Select a project to export credentials" />
                        </SelectTrigger>
                        <SelectContent>
                          {allManagedProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {exportProjectId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyExport}
                          className="h-8 shrink-0 gap-1.5 text-xs"
                        >
                          {exportCopied ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {exportCopied
                            ? 'Copied!'
                            : `Copy for ${allManagedProjects.find((p) => p.id === exportProjectId)?.name || 'Project'}`}
                        </Button>
                      ) : (
                        <p className="shrink-0 text-xs text-muted-foreground/60">
                          Select a project to export
                        </p>
                      )}
                    </div>
                    {exportProjectId && (
                      <p className="text-[11px] text-muted-foreground/70">
                        Copies a plain-text block with name, email, and portal URL for each client
                        in this project. Passwords show as &quot;reset via admin panel&quot; — use
                        Reset Password below to generate new ones.
                      </p>
                    )}
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={projectFilter}
                    onValueChange={(v) => {
                      setProjectFilter(v);
                      setBulkResetResults(null);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Projects</SelectItem>
                      {allManagedProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  {projectFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkReset}
                      disabled={isBulkResetPending}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {isBulkResetPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Reset All for{' '}
                      {allManagedProjects.find((p) => p.id === projectFilter)?.name || 'Project'}
                    </Button>
                  )}
                </div>

                {/* Bulk reset results */}
                {bulkResetResults && (
                  <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground">Bulk Reset Results</p>
                      {bulkResetResults.some((r) => r.tempPassword) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyBulkResetCredentials}
                          className="h-6 gap-1 px-2 text-[11px]"
                        >
                          {bulkResetCopied ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {bulkResetCopied ? 'Copied!' : 'Copy All'}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {bulkResetResults.map((r, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex items-start gap-2 rounded px-2 py-1.5 text-xs',
                            r.tempPassword
                              ? 'bg-green-500/5 text-foreground'
                              : 'bg-red-500/5 text-muted-foreground'
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
                              r.tempPassword ? 'bg-green-500/20' : 'bg-red-500/20'
                            )}
                          >
                            {r.tempPassword ? (
                              <Check className="h-2 w-2 text-green-600" />
                            ) : (
                              <X className="h-2 w-2 text-red-600" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">{r.name || r.email}</span>
                            {r.tempPassword ? (
                              <span className="ml-1 font-mono text-muted-foreground">
                                — {r.tempPassword}
                              </span>
                            ) : (
                              <span className="ml-1 text-red-600"> — {r.error}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wider">Client</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">Projects</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">
                          Last Login
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="w-[52px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredManagedClients.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-6 text-center text-sm text-muted-foreground/60"
                          >
                            No clients match the selected filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredManagedClients.map((client) => {
                          const visibleProjects = client.projects.slice(0, 3);
                          const overflowCount = client.projects.length - 3;
                          const resetResult = resetResults[client.id];
                          const isResetting = pendingReset === client.id;
                          return (
                            <>
                              <TableRow key={client.id}>
                                <TableCell className="font-medium">
                                  {client.full_name || 'No name'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {client.email}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {client.projects.length === 0 ? (
                                      <span className="text-sm text-muted-foreground/60">None</span>
                                    ) : (
                                      <>
                                        {visibleProjects.map((p) => (
                                          <Badge key={p.id} variant="outline" className="text-xs">
                                            {p.name}
                                          </Badge>
                                        ))}
                                        {overflowCount > 0 && (
                                          <Badge variant="secondary" className="text-xs">
                                            +{overflowCount} more
                                          </Badge>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground/80">
                                  {client.lastSignIn
                                    ? formatDistanceToNow(new Date(client.lastSignIn), {
                                        addSuffix: true,
                                      })
                                    : 'Never'}
                                </TableCell>
                                <TableCell>
                                  {client.isActive ? (
                                    <Badge
                                      variant="outline"
                                      className="border-green-500/30 bg-green-500/10 text-[11px] text-green-700"
                                    >
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[11px] text-muted-foreground"
                                    >
                                      Inactive
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        client.email && handleSendPasswordReset(client.email)
                                      }
                                      disabled={isPending || !client.email}
                                      title="Send password reset email"
                                      className="h-8 w-8 p-0"
                                    >
                                      <KeyRound className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        client.email && handleResetPassword(client.id, client.email)
                                      }
                                      disabled={isResetting || !client.email}
                                      title="Reset password — generates new temp password"
                                      className="h-8 w-8 p-0"
                                    >
                                      {isResetting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <RotateCcw className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {resetResult && (
                                <TableRow key={`${client.id}-reset`}>
                                  <TableCell colSpan={6} className="pb-2 pt-0">
                                    <div className="flex items-center justify-between rounded-lg border border-qualia-500/20 bg-qualia-500/5 px-3 py-2 font-mono text-xs">
                                      <span className="text-muted-foreground">
                                        New password for{' '}
                                        <span className="font-semibold text-foreground">
                                          {resetResult.name || client.full_name || client.email}
                                        </span>
                                        :{' '}
                                        <span className="text-foreground">
                                          {resetResult.tempPassword}
                                        </span>
                                        {'  '}
                                        <span className="font-sans text-muted-foreground/60">
                                          — Share with the client.
                                        </span>
                                      </span>
                                      <div className="ml-3 flex shrink-0 items-center gap-1.5">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 gap-1 px-2 text-[11px]"
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              `Email: ${client.email}\nPassword: ${resetResult.tempPassword}\nPortal: ${portalUrl}`
                                            );
                                            toast.success('Copied!');
                                          }}
                                        >
                                          <Copy className="h-3 w-3" />
                                          Copy
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-foreground"
                                          onClick={() =>
                                            setResetResults((prev) => {
                                              const next = { ...prev };
                                              delete next[client.id];
                                              return next;
                                            })
                                          }
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )
        : /* Fallback: clientManagement action failed — show simple table */
          clientAssignments.length > 0 && (
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
                          <TableCell className="font-medium">
                            {client.full_name || 'No name'}
                          </TableCell>
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
                                            (a) =>
                                              a.client_id === client.id && a.project_id === p.id
                                          );
                                          if (a)
                                            handleRemoveAccess(a.id, a.project_id, a.client_id);
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
