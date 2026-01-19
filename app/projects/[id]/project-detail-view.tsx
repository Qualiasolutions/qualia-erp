'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Folder,
  Trash2,
  Check,
  User,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Clock,
  Building2,
  Calendar,
  Settings,
  Save,
  Radio,
  Trophy,
} from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  getProjectById,
  updateProject,
  deleteProject,
  toggleProjectLive,
  toggleProjectFinished,
} from '@/app/actions';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';
import { ProjectPipeline } from '@/components/project-pipeline';
import { ProjectNotes } from '@/components/project-notes';
import { ProjectResources } from '@/components/project-resources';
import { LogoUpload } from '@/components/logo-upload';
import { EntityAvatar } from '@/components/entity-avatar';
import type { ProjectType, ProjectGroup } from '@/types/database';
import { motion } from 'framer-motion';

const PROJECT_TYPES: { value: ProjectType; label: string; icon: typeof Globe; color: string }[] = [
  { value: 'web_design', label: 'Website', icon: Globe, color: 'text-sky-500 bg-sky-500/10' },
  { value: 'ai_agent', label: 'AI Agent', icon: Bot, color: 'text-violet-500 bg-violet-500/10' },
  {
    value: 'voice_agent',
    label: 'Voice Agent',
    icon: Phone,
    color: 'text-pink-500 bg-pink-500/10',
  },
  { value: 'seo', label: 'SEO', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10' },
  { value: 'ads', label: 'Ads', icon: Megaphone, color: 'text-amber-500 bg-amber-500/10' },
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
}

interface ProjectDetailViewProps {
  project: Project;
  profiles: Profile[];
}

export function ProjectDetailView({ project: initialProject, profiles }: ProjectDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [project, setProject] = useState<Project>(initialProject);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="shrink-0 border-b border-border/50 bg-gradient-to-b from-card to-background"
      >
        <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/projects"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="flex items-center gap-3">
                <EntityAvatar
                  src={project.logo_url}
                  fallbackIcon={<ProjectTypeIcon className="h-5 w-5" />}
                  fallbackBgColor={selectedProjectType?.color.split(' ')[1] || 'bg-muted'}
                  fallbackIconColor={
                    selectedProjectType?.color.split(' ')[0] || 'text-muted-foreground'
                  }
                  size="lg"
                  className="h-11 w-11"
                />
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {selectedProjectType && (
                      <span className="flex items-center gap-1">
                        <span
                          className={cn('h-1.5 w-1.5 rounded-full', selectedProjectType.color)}
                        />
                        {selectedProjectType.label}
                      </span>
                    )}
                    {project.lead && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {project.lead.full_name || project.lead.email}
                      </span>
                    )}
                    {project.target_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.target_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Settings button */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] overflow-y-auto sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Project Settings</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Logo */}
                  <div className="flex justify-center">
                    <LogoUpload
                      entityType="project"
                      entityId={project.id}
                      currentLogoUrl={project.logo_url}
                      fallbackIcon={<ProjectTypeIcon className="h-10 w-10" />}
                      fallbackBgColor={selectedProjectType?.color.split(' ')[1] || 'bg-muted'}
                      fallbackIconColor={
                        selectedProjectType?.color.split(' ')[0] || 'text-muted-foreground'
                      }
                      size="xl"
                      onLogoChange={(newUrl) => {
                        setProject((prev) => ({ ...prev, logo_url: newUrl }));
                      }}
                    />
                  </div>

                  {/* Status Toggles */}
                  <div className="space-y-3">
                    {/* Live Status Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'rounded-lg p-2',
                            isLive
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Radio className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Live Project</p>
                          <p className="text-sm text-muted-foreground">Show in Live Projects widget</p>
                        </div>
                      </div>
                      <Switch
                        checked={isLive}
                        onCheckedChange={handleToggleLive}
                        disabled={togglingLive}
                      />
                    </div>

                    {/* Finished Status Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'rounded-lg p-2',
                            isFinished
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Finished Project</p>
                          <p className="text-sm text-muted-foreground">Show in Finished Projects widget</p>
                        </div>
                      </div>
                      <Switch
                        checked={isFinished}
                        onCheckedChange={handleToggleFinished}
                        disabled={togglingFinished}
                      />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Project name"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a description..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  {/* Type & Lead */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={projectType || 'none'}
                        onValueChange={(v) =>
                          setProjectType(v === 'none' ? null : (v as ProjectType))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lead</label>
                      <Select
                        value={leadId || 'none'}
                        onValueChange={(v) => setLeadId(v === 'none' ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No lead</SelectItem>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.full_name || p.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Target Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Date</label>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                  </div>

                  {/* Meta Info */}
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                    <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Project Info
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Created
                        </span>
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Updated
                        </span>
                        <span>{formatTimeAgo(project.updated_at)}</span>
                      </div>
                      {project.client && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            Client
                          </span>
                          <span>{project.client.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      className={cn('flex-1 gap-2', saved && 'bg-emerald-600 hover:bg-emerald-600')}
                    >
                      {saving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving...
                        </>
                      ) : saved ? (
                        <>
                          <Check className="h-4 w-4" />
                          Saved!
                        </>
                      ) : hasChanges ? (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      ) : (
                        'No Changes'
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDelete}
                      disabled={isPending}
                      className="h-10 w-10 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Pipeline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ProjectPipeline projectId={project.id} workspaceId={project.workspace_id} />
            </motion.div>

            {/* Supporting Sections - Notes & Resources */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid gap-4 lg:grid-cols-2"
            >
              {/* Notes */}
              <ProjectNotes
                projectId={project.id}
                workspaceId={project.workspace_id}
                className="h-[300px]"
              />

              {/* Resources */}
              <ProjectResources
                projectId={project.id}
                initialResources={project.metadata?.resources || []}
                className="h-[300px]"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
