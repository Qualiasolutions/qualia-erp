'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  KeyRound,
  UserPlus,
  X,
  Layers,
  RotateCcw,
  Download,
} from 'lucide-react';
import {
  setupPortalForClient,
  sendClientPasswordReset,
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

  const portalUrl = 'https://qualia-erp.vercel.app/portal';

  // ── Onboard tab state ──────────────────────────────────────────────────────
  const [onboardMode, setOnboardMode] = useState<'single' | 'bulk'>('single');

  // Single mode
  const [selectedCrmClientId, setSelectedCrmClientId] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password?: string;
    name: string;
    alreadyExisted: boolean;
    projectsLinked: number;
  } | null>(null);
  const [credsCopied, setCredsCopied] = useState(false);

  // Bulk mode
  const [selectedCrmClientIds, setSelectedCrmClientIds] = useState<string[]>([]);
  const [bulkSelectedProjectIds, setBulkSelectedProjectIds] = useState<string[]>([]);
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

  // ── Clients tab state ──────────────────────────────────────────────────────
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showExportSection, setShowExportSection] = useState(false);
  const [exportProjectId, setExportProjectId] = useState('');
  const [exportCopied, setExportCopied] = useState(false);
  const [resetResults, setResetResults] = useState<
    Record<string, { tempPassword: string; name: string | null }>
  >({});
  const [pendingReset, setPendingReset] = useState<string | null>(null);
  const [bulkResetResults, setBulkResetResults] = useState<Array<{
    email: string;
    name: string | null;
    tempPassword?: string;
    error?: string;
  }> | null>(null);
  const [isBulkResetPending, setIsBulkResetPending] = useState(false);
  const [bulkResetCopied, setBulkResetCopied] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────────────
  const selectedCrmClient = crmClients.find((c) => c.id === selectedCrmClientId) || null;

  const allManagedProjects = clientManagement
    ? Array.from(
        new Map(clientManagement.clients.flatMap((c) => c.projects).map((p) => [p.id, p])).values()
      ).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const filteredManagedClients = clientManagement
    ? clientManagement.clients.filter((c) => {
        if (projectFilter !== 'all' && !c.projects.some((p) => p.id === projectFilter))
          return false;
        if (statusFilter === 'active' && !c.isActive) return false;
        if (statusFilter === 'inactive' && c.isActive) return false;
        return true;
      })
    : [];

  // Fallback: group assignments by client when clientManagement unavailable
  const clientAssignments = clients.map((client) => ({
    ...client,
    projects: assignments
      .filter((a) => a.client_id === client.id)
      .map((a) => a.project)
      .filter(Boolean),
  }));

  // ── Handlers: Single onboarding ────────────────────────────────────────────
  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSetup = async () => {
    if (!selectedCrmClientId) {
      toast.error('Select a client');
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

      // Optimistic state update
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

      setSelectedCrmClientId('');
      setSelectedProjectIds([]);
      router.refresh();
    } finally {
      setIsSettingUp(false);
    }
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

  // ── Handlers: Bulk onboarding ──────────────────────────────────────────────
  const toggleBulkClient = (clientId: string) => {
    setSelectedCrmClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const toggleBulkProject = (projectId: string) => {
    setBulkSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleBulkSetup = async () => {
    if (selectedCrmClientIds.length === 0) {
      toast.error('Select at least one client');
      return;
    }
    if (bulkSelectedProjectIds.length === 0) {
      toast.error('Select at least one project');
      return;
    }

    setIsBulkPending(true);
    setBulkResults(null);

    try {
      const result = await bulkSetupPortalForClients(selectedCrmClientIds, bulkSelectedProjectIds);

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

      setSelectedCrmClientIds([]);
      setBulkSelectedProjectIds([]);
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

  // ── Handlers: Client table ─────────────────────────────────────────────────
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
      setTimeout(() => {
        setResetResults((prev) => {
          const next = { ...prev };
          delete next[clientId];
          return next;
        });
      }, 30000);
    });
  };

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

  const handleBulkReset = async () => {
    if (projectFilter === 'all' || !clientManagement) return;
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

  // ── Reusable: project checkbox list ───────────────────────────────────────
  const ProjectCheckboxList = ({
    selected,
    onToggle,
  }: {
    selected: string[];
    onToggle: (id: string) => void;
  }) => (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {projects.map((p) => {
        const checked = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
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
                checked ? 'border-qualia-600 bg-qualia-600' : 'border-border bg-background'
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
  );

  return (
    <Tabs defaultValue="clients" className="space-y-0">
      <div className="flex items-center justify-between gap-4 pb-4">
        <TabsList className="h-9 rounded-lg border border-border/50 bg-muted/40 p-1">
          <TabsTrigger
            value="clients"
            className="h-7 rounded-md px-4 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Clients
            {clientManagement && (
              <Badge
                variant="secondary"
                className="ml-2 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
              >
                {clientManagement.clients.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="onboard"
            className="h-7 rounded-md px-4 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Onboard
          </TabsTrigger>
        </TabsList>

        {/* Export credentials button — only shown on Clients tab, but kept accessible */}
        <Button
          variant={showExportSection ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowExportSection((v) => !v)}
          className={cn(
            'h-8 gap-1.5 text-xs',
            showExportSection && 'bg-qualia-600 text-white hover:bg-qualia-700'
          )}
        >
          <Download className="h-3.5 w-3.5" />
          Export Credentials
        </Button>
      </div>

      {/* ── TAB: CLIENTS ────────────────────────────────────────────────────── */}
      <TabsContent value="clients" className="mt-0 space-y-3">
        <Card>
          <CardHeader className="pb-3 pt-4">
            {/* Export Credentials (collapsible inline section) */}
            {showExportSection && (
              <div className="mb-3 space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
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
                    <p className="shrink-0 text-xs text-muted-foreground">
                      Select a project to export
                    </p>
                  )}
                </div>
                {exportProjectId && (
                  <p className="text-[11px] text-muted-foreground/70">
                    Copies a plain-text block with name, email, and portal URL for each client in
                    this project. Passwords show as &quot;reset via admin panel&quot; — use Reset
                    Password to generate new ones.
                  </p>
                )}
              </div>
            )}

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-2">
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
                  <SelectItem value="all">All Projects</SelectItem>
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

              <div className="ml-auto flex items-center gap-2">
                {clientManagement && (
                  <>
                    <Badge
                      variant="outline"
                      className="border-green-500/30 bg-green-500/10 text-[11px] text-green-700"
                    >
                      {clientManagement.totalActive} Active
                    </Badge>
                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                      {clientManagement.totalInactive} Inactive
                    </Badge>
                  </>
                )}
                {projectFilter !== 'all' && (
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
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
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

            {/* Client table */}
            {clientManagement ? (
              clientManagement.clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No portal clients yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Switch to the Onboard tab to set up client access.
                  </p>
                </div>
              ) : (
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
                        <TableHead className="w-[44px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredManagedClients.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-6 text-center text-sm text-muted-foreground"
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
                                      <span className="text-sm text-muted-foreground">None</span>
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      client.email && handleResetPassword(client.id, client.email)
                                    }
                                    disabled={isResetting || !client.email}
                                    title="Reset password — generates a new temporary password shown inline"
                                    className="h-8 w-8 p-0"
                                  >
                                    {isResetting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <KeyRound className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {resetResult && (
                                <TableRow key={`${client.id}-reset`}>
                                  <TableCell colSpan={6} className="pb-2 pt-0">
                                    <div className="flex items-center justify-between rounded-lg border border-qualia-500/20 bg-qualia-500/5 px-3 py-2 font-mono text-xs">
                                      <div className="space-y-0.5">
                                        <p>
                                          <span className="text-muted-foreground">Email:</span>{' '}
                                          {client.email}
                                        </p>
                                        <p>
                                          <span className="text-muted-foreground">Password:</span>{' '}
                                          {resetResult.tempPassword}
                                        </p>
                                        <p>
                                          <span className="text-muted-foreground">Portal:</span>{' '}
                                          {portalUrl}
                                        </p>
                                      </div>
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
                                          className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground"
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
              )
            ) : (
              /* Fallback: clientManagement action failed — show simple table */
              clientAssignments.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wider">Client</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">Projects</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider">Joined</TableHead>
                        <TableHead className="w-[44px]"></TableHead>
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
                                <span className="text-sm text-muted-foreground">None</span>
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
                              title="Send password reset email"
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
              )
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── TAB: ONBOARD ────────────────────────────────────────────────────── */}
      <TabsContent value="onboard" className="mt-0">
        <Card>
          <CardHeader className="pb-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {onboardMode === 'single'
                    ? 'Set up portal access for a single client'
                    : 'Set up portal access for multiple clients at once'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  Creates a portal account using the client&apos;s CRM email address.
                </p>
              </div>
              {/* Single / Bulk pill toggle */}
              <div className="flex items-center rounded-lg border border-border/50 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setOnboardMode('single');
                    setSelectedCrmClientIds([]);
                    setBulkSelectedProjectIds([]);
                    setBulkResults(null);
                  }}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                    onboardMode === 'single'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOnboardMode('bulk');
                    setSelectedCrmClientId('');
                    setSelectedProjectIds([]);
                    setCredentials(null);
                  }}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                    onboardMode === 'bulk'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Bulk
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* ── SINGLE MODE ────────────────────────────────────────────── */}
            {onboardMode === 'single' && (
              <div className="space-y-5">
                {/* Step 1: Pick client */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    1. Select client
                  </p>
                  <Select value={selectedCrmClientId} onValueChange={setSelectedCrmClientId}>
                    <SelectTrigger className="w-full">
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
                  {selectedCrmClient && (
                    <p className="text-xs text-muted-foreground/70">
                      Portal account will use:{' '}
                      <span className="font-mono text-foreground">
                        {selectedCrmClient.contacts?.[0]?.email?.trim().toLowerCase() ?? (
                          <span className="text-amber-500">No email on file</span>
                        )}
                      </span>
                    </p>
                  )}
                </div>

                {/* Step 2: Pick projects */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    2. Assign projects
                  </p>
                  {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active projects</p>
                  ) : (
                    <ProjectCheckboxList selected={selectedProjectIds} onToggle={toggleProject} />
                  )}
                </div>

                {/* Action */}
                <Button
                  onClick={handleSetup}
                  disabled={isSettingUp || !selectedCrmClientId || selectedProjectIds.length === 0}
                  className="gap-2 bg-qualia-600 text-white hover:bg-qualia-700"
                >
                  {isSettingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Create Access
                </Button>

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
                            Access created — {credentials.projectsLinked} project(s) linked
                          </span>
                        </div>
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                          Credentials for {credentials.name} — share with the client:
                        </p>
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs">
                          <div className="space-y-0.5">
                            <p>
                              <span className="text-muted-foreground">Email:</span>{' '}
                              {credentials.email}
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
              </div>
            )}

            {/* ── BULK MODE ──────────────────────────────────────────────── */}
            {onboardMode === 'bulk' && (
              <div className="space-y-5">
                {/* Step 1: Select clients */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    1. Select clients ({selectedCrmClientIds.length} selected)
                  </p>
                  {crmClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No CRM clients found</p>
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
                </div>

                {/* Step 2: Assign projects */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    2. Assign projects to all selected clients
                  </p>
                  {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active projects</p>
                  ) : (
                    <ProjectCheckboxList
                      selected={bulkSelectedProjectIds}
                      onToggle={toggleBulkProject}
                    />
                  )}
                </div>

                {/* Action */}
                <Button
                  onClick={handleBulkSetup}
                  disabled={
                    isBulkPending ||
                    selectedCrmClientIds.length === 0 ||
                    bulkSelectedProjectIds.length === 0
                  }
                  className="gap-2 bg-qualia-600 text-white hover:bg-qualia-700"
                >
                  {isBulkPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Create Access for {selectedCrmClientIds.length} Client
                  {selectedCrmClientIds.length !== 1 ? 's' : ''}
                </Button>

                {/* Bulk results */}
                {bulkResults && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Results</p>
                    <div className="space-y-1.5">
                      {bulkResults.map((r) => {
                        const clientName =
                          r.name ||
                          crmClients.find((c) => c.id === r.crmClientId)?.name ||
                          r.crmClientId;
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
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
