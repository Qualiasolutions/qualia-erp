'use client';

import { useState, useTransition, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Radio,
  Trophy,
  Building2,
  PanelRightOpen,
  Link as LinkIcon,
  MessageSquare,
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  getProjectById,
  updateProject,
  deleteProject,
  toggleProjectLive,
  toggleProjectFinished,
} from '@/app/actions';
import { cn } from '@/lib/utils';
import { ProjectNotes } from '@/components/project-notes';
import { ProjectResources } from '@/components/project-resources';
import { LogoUpload } from '@/components/logo-upload';
import { EntityAvatar } from '@/components/entity-avatar';
import type { ProjectType, ProjectGroup } from '@/types/database';

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
  { value: 'ads', label: 'Ads', icon: Megaphone, color: 'text-amber-400 bg-amber-400/10' },
];

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
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
  is_live: boolean;
  is_finished: boolean;
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

interface ProjectDetailViewProps {
  project: Project;
  profiles: Profile[];
}

export function ProjectDetailView({ project: initialProject, profiles }: ProjectDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [project, setProject] = useState<Project>(initialProject);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelSheetOpen, setPanelSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [name, setName] = useState(initialProject.name);
  const [description, setDescription] = useState(initialProject.description || '');
  const [projectType, setProjectType] = useState<ProjectType | null>(
    initialProject.project_type || null
  );
  const [leadId, setLeadId] = useState<string | null>(initialProject.lead?.id || null);
  const [targetDate, setTargetDate] = useState(initialProject.target_date || '');
  const [isLive, setIsLive] = useState(initialProject.is_live || false);
  const [togglingLive, setTogglingLive] = useState(false);
  const [isFinished, setIsFinished] = useState(initialProject.is_finished || false);
  const [togglingFinished, setTogglingFinished] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      name !== initialProject.name ||
      description !== (initialProject.description || '') ||
      projectType !== initialProject.project_type ||
      leadId !== (initialProject.lead?.id || null) ||
      targetDate !== (initialProject.target_date || '');
    setHasChanges(changed);
  }, [name, description, projectType, leadId, targetDate, initialProject]);

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
  }, [hasChanges, project.id, name, description, projectType, leadId, targetDate]);

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this project? This will also delete all items in this project.'
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.success) {
        router.push('/projects');
      } else {
        setError(result.error || 'Failed to delete project');
      }
    });
  };

  const handleToggleLive = async (checked: boolean) => {
    setTogglingLive(true);
    const result = await toggleProjectLive(project.id, checked);
    if (result.success) {
      setIsLive(checked);
      setProject((prev) => ({ ...prev, is_live: checked }));
    } else {
      setError(result.error || 'Failed to update live status');
    }
    setTogglingLive(false);
  };

  const handleToggleFinished = async (checked: boolean) => {
    setTogglingFinished(true);
    const result = await toggleProjectFinished(project.id, checked);
    if (result.success) {
      setIsFinished(checked);
      setProject((prev) => ({ ...prev, is_finished: checked }));
    } else {
      setError(result.error || 'Failed to update finished status');
    }
    setTogglingFinished(false);
  };

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
      <header className="relative shrink-0 border-b border-border/50 bg-card/50 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href="/projects"
              className="group flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border/50 bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
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
              className="flex-shrink-0 rounded-xl border border-border/50"
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
            {/* Panel toggle (below xl only) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPanelSheetOpen(true)}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground xl:hidden"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>

            {/* Settings gear */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Workflow (always visible, scrollable) */}
          <div className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8">
              <ProjectWorkflow
                projectId={project.id}
                projectType={project.project_type}
                workspaceId={project.workspace_id}
              />
            </div>
          </div>

          {/* Right Panel (xl+ only) */}
          <aside className="hidden w-80 flex-col border-l border-border/50 bg-card/30 xl:flex">
            {/* Personnel */}
            <div className="shrink-0 space-y-3 border-b border-border/50 p-4">
              <div className="flex items-center gap-3">
                <EntityAvatar
                  src={project.lead?.avatar_url}
                  fallbackIcon={<User className="h-3.5 w-3.5" />}
                  size="sm"
                  className="rounded-lg border border-border/50"
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
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-border/50 bg-blue-500/10">
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

            {/* Resources */}
            <div className="min-h-0 flex-1 border-b border-border/50">
              <ProjectResources
                projectId={project.id}
                initialResources={project.metadata?.resources || []}
                className="h-full rounded-none border-0"
              />
            </div>

            {/* Notes */}
            <div className="min-h-0 flex-1">
              <ProjectNotes
                projectId={project.id}
                workspaceId={project.workspace_id}
                className="h-full rounded-none border-0"
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>Configure project metadata and visibility</DialogDescription>
          </DialogHeader>

          {/* Logo */}
          <div className="flex justify-center py-2">
            <LogoUpload
              entityType="project"
              entityId={project.id}
              currentLogoUrl={project.logo_url}
              fallbackIcon={<ProjectTypeIcon className="h-8 w-8" />}
              fallbackBgColor={selectedProjectType?.color.split(' ')[1] || 'bg-muted'}
              fallbackIconColor={
                selectedProjectType?.color.split(' ')[0] || 'text-muted-foreground'
              }
              size="lg"
              onLogoChange={(newUrl) => {
                setProject((prev) => ({ ...prev, logo_url: newUrl }));
              }}
            />
          </div>

          {/* Toggles */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-all',
                    isLive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Live Status</p>
                  <p className="text-xs text-muted-foreground">Show in live projects watch</p>
                </div>
              </div>
              <Switch checked={isLive} onCheckedChange={handleToggleLive} disabled={togglingLive} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-all',
                    isFinished ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-xs text-muted-foreground">Mark as officially completed</p>
                </div>
              </div>
              <Switch
                checked={isFinished}
                onCheckedChange={handleToggleFinished}
                disabled={togglingFinished}
              />
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Project Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description / Goal
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-none rounded-lg"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select
                  value={projectType || 'none'}
                  onValueChange={(v) => setProjectType(v === 'none' ? null : (v as ProjectType))}
                >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <label className="text-xs font-medium text-muted-foreground">Lead</label>
                <Select
                  value={leadId || 'none'}
                  onValueChange={(v) => setLeadId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Target Launch Date
              </label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-500">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isPending}
              className="h-10 w-10 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={cn('h-10 min-w-[140px] rounded-lg', saved && 'bg-emerald-600')}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Panel Sheet (below xl) */}
      <Sheet open={panelSheetOpen} onOpenChange={setPanelSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border/50 px-4 py-3">
            <SheetTitle>Project Info</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="resources" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2">
              <TabsTrigger value="resources" className="gap-1.5 text-xs">
                <LinkIcon className="h-3.5 w-3.5" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                Notes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="resources" className="mt-0 min-h-0 flex-1">
              <ProjectResources
                projectId={project.id}
                initialResources={project.metadata?.resources || []}
                className="h-full rounded-none border-0"
              />
            </TabsContent>
            <TabsContent value="notes" className="mt-0 min-h-0 flex-1">
              <ProjectNotes
                projectId={project.id}
                workspaceId={project.workspace_id}
                className="h-full rounded-none border-0"
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
