'use client';

import { useState, useTransition, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MobileMenuButton } from '@/components/mobile-menu-button';
import {
  ArrowLeft,
  Folder,
  Trash2,
  User,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Settings,
  Building2,
  PanelRightOpen,
  Link as LinkIcon,
  MessageSquare,
  Users,
  UserPlus,
  X,
  Smartphone,
  LineChart,
} from 'lucide-react';
import { useProjectAssignments, invalidateProjectAssignments } from '@/lib/swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { ProjectWorkflow } from '@/components/project-workflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getProjectById, updateProject, deleteProject } from '@/app/actions';
import { assignEmployeeToProject, removeAssignment } from '@/app/actions/project-assignments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProjectNotes } from '@/components/project-notes';
import { ProjectReportsPanel } from '@/components/project-reports-panel';
import { ProjectResources } from '@/components/project-resources';
import { ProjectFilesPanel } from '@/components/project-files-panel';
import { LogoUpload } from '@/components/logo-upload';
import { EntityAvatar } from '@/components/entity-avatar';
import { ProjectIntegrationsDisplay } from '@/components/project-integrations-display';
import { IntegrationStatusBadge } from '@/components/portal/integration-status-badge';
import type { ProjectType, ProjectGroup } from '@/types/database';
import type { IntegrationStatus } from '@/lib/integration-utils';

const PROJECT_TYPES: {
  value: ProjectType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { value: 'web_design', label: 'Website', icon: Globe, color: 'text-sky-400 bg-sky-400/10' },
  { value: 'ai_agent', label: 'AI Agent', icon: Bot, color: 'text-violet-400 bg-violet-400/10' },
  {
    value: 'voice_agent',
    label: 'Voice Agent',
    icon: Phone,
    color: 'text-pink-400 bg-pink-400/10',
  },
  { value: 'seo', label: 'SEO', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-400/10' },
  { value: 'app', label: 'App', icon: Smartphone, color: 'text-teal-400 bg-teal-400/10' },
  { value: 'ads', label: 'Ads', icon: Megaphone, color: 'text-amber-400 bg-amber-400/10' },
];

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role?: string | null;
}

interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_group: ProjectGroup | null;
  project_type: ProjectType | null;
  workspace_id: string;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  logo_url: string | null;
  lead: Profile | null;
  team: { id: string; name: string; key: string } | null;
  client: { id: string; name: string } | null;
  issues: Issue[];
  issue_stats: {
    total: number;
    done: number;
  };
  metadata?: {
    resources?: Array<{
      id: string;
      type: string;
      label: string;
      url: string;
    }>;
  };
  phase_progress?: Record<string, number[]>;
}

interface ClientOption {
  id: string;
  display_name: string | null;
}

interface ProjectDetailViewProps {
  project: Project;
  profiles: Profile[];
  clients: ClientOption[];
  userRole?: 'admin' | 'employee' | 'client';
  integrationStatus?: IntegrationStatus;
}

export function ProjectDetailView({
  project: initialProject,
  profiles,
  clients,
  userRole = 'employee',
  integrationStatus,
}: ProjectDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Clients get a read-only view: no settings dialog, no integration admin UI,
  // no internal team panels (assigned employees, private notes).
  const isClient = userRole === 'client';

  // Narrowed role for downstream components that don't model 'client'.
  // Clients are already gated out of this view.
  const staffRole: 'admin' | 'employee' = userRole === 'admin' ? 'admin' : 'employee';

  const [project, setProject] = useState<Project>(initialProject);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelSheetOpen, setPanelSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ action: () => void } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  // Form state
  const [name, setName] = useState(initialProject.name);
  const [description, setDescription] = useState(initialProject.description || '');
  const [projectType, setProjectType] = useState<ProjectType | null>(
    initialProject.project_type || null
  );
  const [leadId, setLeadId] = useState<string | null>(initialProject.lead?.id || null);
  const [clientId, setClientId] = useState<string | null>(initialProject.client?.id || null);
  const [targetDate, setTargetDate] = useState(initialProject.target_date || '');

  // Track changes
  useEffect(() => {
    const changed =
      name !== initialProject.name ||
      description !== (initialProject.description || '') ||
      projectType !== initialProject.project_type ||
      leadId !== (initialProject.lead?.id || null) ||
      clientId !== (initialProject.client?.id || null) ||
      targetDate !== (initialProject.target_date || '');
    setHasChanges(changed);
  }, [name, description, projectType, leadId, clientId, targetDate, initialProject]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set('id', project.id);
    formData.set('name', name);
    formData.set('description', description);
    if (projectType) formData.set('project_type', projectType);
    if (leadId) formData.set('lead_id', leadId);
    // Send empty string to signal "clear client" when clientId is null
    formData.set('client_id', clientId || '');
    if (targetDate) formData.set('target_date', targetDate);

    const result = await updateProject(formData);
    if (result.success) {
      const updatedProject = await getProjectById(project.id);
      if (updatedProject) setProject(updatedProject as Project);
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(result.error || 'Failed to update project');
    }

    setSaving(false);
  }, [hasChanges, project.id, name, description, projectType, leadId, clientId, targetDate]);

  const handleDelete = useCallback(() => {
    setConfirmState({
      action: () => {
        startTransition(async () => {
          const result = await deleteProject(project.id);
          if (result.success) {
            router.push('/projects');
          } else {
            setError(result.error || 'Failed to delete project');
          }
        });
      },
    });
  }, [project.id, router]);

  const selectedProjectType = PROJECT_TYPES.find((t) => t.value === projectType);
  const ProjectTypeIcon = selectedProjectType?.icon || Folder;

  const statusColor = useMemo(() => {
    const total = project.issue_stats.total || 0;
    const done = project.issue_stats.done || 0;
    const progress = total > 0 ? (done / total) * 100 : 0;
    const health =
      project.status === 'Backlog'
        ? 'Behind'
        : progress < 20 && project.status === 'Active'
          ? 'At Risk'
          : 'On Track';

    if (health === 'On Track') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500';
    if (health === 'At Risk') return 'border-amber-500/20 bg-amber-500/10 text-amber-500';
    return 'border-red-500/20 bg-red-500/10 text-red-500';
  }, [project]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Compact Header */}
      <header className="relative shrink-0 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <MobileMenuButton />
            <Link
              href="/projects"
              className="group flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <EntityAvatar
              src={project.logo_url}
              fallbackIcon={<ProjectTypeIcon className="h-5 w-5" />}
              fallbackBgColor={selectedProjectType?.color.split(' ')[1] || 'bg-muted'}
              fallbackIconColor={
                selectedProjectType?.color.split(' ')[0] || 'text-muted-foreground'
              }
              size="lg"
              className="flex-shrink-0 rounded-xl border border-border"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {project.name}
                </h1>
                <span
                  className={cn(
                    'flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    statusColor
                  )}
                >
                  {project.status}
                </span>
                {!isClient && integrationStatus && (
                  <IntegrationStatusBadge
                    hasPortalAccess={integrationStatus.hasPortalAccess}
                    hasERPClient={integrationStatus.hasERPClient}
                    variant="detailed"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {selectedProjectType && (
                  <span className="flex items-center gap-1">
                    <selectedProjectType.icon
                      className={cn('h-3 w-3', selectedProjectType.color.split(' ')[0])}
                    />
                    {selectedProjectType.label}
                  </span>
                )}
                {selectedProjectType && project.client && (
                  <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/40" />
                )}
                {project.client && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {project.client.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Integration links — admin tooling, hidden from clients */}
            {!isClient && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <ProjectIntegrationsDisplay projectId={project.id} userRole={staffRole} />
              </div>
            )}

            {/* Panel toggle (below xl only) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPanelSheetOpen(true)}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground xl:hidden"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>

            {/* Settings gear — admin-only */}
            {!isClient && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Workflow — fills available height, manages own scrolling */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ProjectWorkflow
              projectId={project.id}
              projectName={project.name}
              projectType={project.project_type}
              workspaceId={project.workspace_id}
              userRole={userRole}
              className="h-full"
            />
          </div>

          {/* Right Panel (xl+ only) */}
          <aside className="hidden w-80 flex-col border-l border-border bg-card/30 xl:flex">
            {/* Personnel */}
            <div className="shrink-0 space-y-3 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <EntityAvatar
                  src={project.lead?.avatar_url}
                  fallbackIcon={<User className="h-3.5 w-3.5" />}
                  size="sm"
                  className="rounded-lg border border-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {project.lead?.full_name || 'Unassigned'}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Lead</p>
                </div>
              </div>
              {project.client && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-blue-500/10">
                    <Building2 className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {project.client.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Client
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Employees — internal panel, hidden from clients */}
            {!isClient && (
              <div className="shrink-0 space-y-3 border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-purple-500/10">
                    <Users className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Assigned Team
                  </p>
                </div>
                <AssignedEmployeesList
                  projectId={project.id}
                  userRole={staffRole}
                  profiles={profiles}
                />
              </div>
            )}

            {/* Resources — links to live docs/deploys; visible to clients */}
            <div className="min-h-0 flex-1 border-b border-border">
              <ProjectResources
                projectId={project.id}
                initialResources={project.metadata?.resources || []}
                className="h-full rounded-none border-0"
              />
            </div>

            {/* Files — project documents, column list */}
            <div className="min-h-0 flex-1 border-b border-border">
              <ProjectFilesPanel
                projectId={project.id}
                isClient={isClient}
                className="h-full rounded-none border-0"
              />
            </div>

            {/* Notes — internal team notes, hidden from clients */}
            {!isClient && (
              <div className="min-h-0 flex-1">
                <ProjectNotes
                  projectId={project.id}
                  workspaceId={project.workspace_id}
                  className="h-full rounded-none border-0"
                />
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl tracking-tight">Project Settings</DialogTitle>
            <DialogDescription>
              Configure project metadata, branding, and visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Branding section */}
            <section className="rounded-xl border border-border bg-muted/30 p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Branding
              </h3>
              <div className="flex items-center gap-5">
                <LogoUpload
                  entityType="project"
                  entityId={project.id}
                  currentLogoUrl={project.logo_url}
                  fallbackIcon={<ProjectTypeIcon className="h-7 w-7" />}
                  fallbackBgColor={selectedProjectType?.color.split(' ')[1] || 'bg-muted'}
                  fallbackIconColor={
                    selectedProjectType?.color.split(' ')[0] || 'text-muted-foreground'
                  }
                  size="lg"
                  onLogoChange={(newUrl) => {
                    setProject((prev) => ({ ...prev, logo_url: newUrl }));
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Project logo</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    PNG, JPG, WebP, or GIF up to 5 MB. Square images work best.
                  </p>
                </div>
              </div>
            </section>

            {/* Details section */}
            <section className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Details
              </h3>

              <div className="space-y-1.5">
                <label htmlFor="project-name" className="text-xs font-medium text-muted-foreground">
                  Project Name
                </label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-lg"
                  placeholder="e.g. The Pantry — Demo"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="project-description"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Description / Goal
                </label>
                <Textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none rounded-lg"
                  placeholder="What is this project about? What's the goal?"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="project-type"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Type
                  </label>
                  <Select
                    value={projectType || 'none'}
                    onValueChange={(v) => setProjectType(v === 'none' ? null : (v as ProjectType))}
                  >
                    <SelectTrigger id="project-type" className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">No type</SelectItem>
                      {PROJECT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="h-4 w-4" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="project-lead"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Lead
                  </label>
                  <Select
                    value={leadId || 'none'}
                    onValueChange={(v) => setLeadId(v === 'none' ? null : v)}
                  >
                    <SelectTrigger id="project-lead" className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">Unassigned</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="project-client"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Client
                  </label>
                  <Select
                    value={clientId || 'none'}
                    onValueChange={(v) => setClientId(v === 'none' ? null : v)}
                  >
                    <SelectTrigger id="project-client" className="h-10 rounded-lg">
                      <SelectValue placeholder="No client" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.display_name || c.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="project-target-date"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Target Launch Date
                  </label>
                  <Input
                    id="project-target-date"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="h-10 rounded-lg"
                  />
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-500">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2 gap-2 border-t border-border pt-5 sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="h-10 cursor-pointer gap-2 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
              Delete project
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={cn(
                'h-10 min-w-[140px] cursor-pointer rounded-lg',
                saved && 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Panel Sheet (below xl) */}
      <Sheet open={panelSheetOpen} onOpenChange={setPanelSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>Project Info</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="resources" className="flex min-h-0 flex-1 flex-col">
            <TabsList
              className={cn('mx-4 mt-3 grid w-auto', isClient ? 'grid-cols-1' : 'grid-cols-3')}
            >
              <TabsTrigger value="resources" className="gap-1.5 text-xs">
                <LinkIcon className="h-3.5 w-3.5" />
                Resources
              </TabsTrigger>
              {!isClient && (
                <TabsTrigger value="reports" className="gap-1.5 text-xs">
                  <LineChart className="h-3.5 w-3.5" />
                  Reports
                </TabsTrigger>
              )}
              {!isClient && (
                <TabsTrigger value="notes" className="gap-1.5 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Notes
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="resources" className="mt-0 min-h-0 flex-1">
              <ProjectResources
                projectId={project.id}
                initialResources={project.metadata?.resources || []}
                className="h-full rounded-none border-0"
              />
            </TabsContent>
            {!isClient && (
              <TabsContent value="reports" className="mt-0 min-h-0 flex-1">
                <ProjectReportsPanel projectName={project.name} className="h-full" />
              </TabsContent>
            )}
            {!isClient && (
              <TabsContent value="notes" className="mt-0 min-h-0 flex-1">
                <ProjectNotes
                  projectId={project.id}
                  workspaceId={project.workspace_id}
                  className="h-full rounded-none border-0"
                />
              </TabsContent>
            )}
          </Tabs>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Delete Project"
        description="Are you sure you want to delete this project? This will also delete all items in this project."
        confirmLabel="Delete"
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
      />
    </div>
  );
}

// Inline client component for assigned employees list
function AssignedEmployeesList({
  projectId,
  userRole = 'employee',
  profiles = [],
}: {
  projectId: string;
  userRole?: 'admin' | 'employee';
  profiles?: Profile[];
}) {
  const { data: assignments, isLoading } = useProjectAssignments(projectId);
  const [showAssignSelect, setShowAssignSelect] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const canManage = userRole === 'admin';

  const activeAssignments = Array.isArray(assignments)
    ? assignments.filter((a) => !a.removed_at)
    : [];

  const assignedIds = new Set(activeAssignments.map((a) => a.employee?.id).filter(Boolean));
  const availableEmployees = profiles.filter(
    (p) => p.id && !assignedIds.has(p.id) && p.role !== 'client'
  );

  async function handleAssign(employeeId: string) {
    setAssigning(true);
    const formData = new FormData();
    formData.set('project_id', projectId);
    formData.set('employee_id', employeeId);
    const result = await assignEmployeeToProject(formData);
    if (result.success) {
      toast.success('Employee assigned');
      invalidateProjectAssignments(projectId, true);
    } else {
      toast.error(result.error || 'Failed to assign');
    }
    setAssigning(false);
    setShowAssignSelect(false);
  }

  async function handleRemove(assignmentId: string) {
    const result = await removeAssignment(assignmentId);
    if (result.success) {
      toast.success('Employee removed');
      invalidateProjectAssignments(projectId, true);
    } else {
      toast.error(result.error || 'Failed to remove');
    }
  }

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-2">
      {activeAssignments.length === 0 && !canManage && (
        <p className="text-xs text-muted-foreground">No employees assigned yet.</p>
      )}
      {activeAssignments.map((assignment) => (
        <div key={assignment.id} className="group flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={assignment.employee?.avatar_url || ''} />
            <AvatarFallback className="text-[10px]">
              {assignment.employee?.full_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {assignment.employee?.full_name || assignment.employee?.email}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Since {formatDate(assignment.assigned_at, 'MMM d')}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => handleRemove(assignment.id)}
              className="hidden rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:block"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {canManage && (
        <>
          {showAssignSelect ? (
            <div className="space-y-1.5">
              <Select onValueChange={handleAssign} disabled={assigning}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder={assigning ? 'Assigning...' : 'Select employee'} />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      No available employees
                    </p>
                  ) : (
                    availableEmployees.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <button
                onClick={() => setShowAssignSelect(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAssignSelect(true)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <UserPlus className="h-3 w-3" />
              Assign employee
            </button>
          )}
        </>
      )}
    </div>
  );
}
