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
  Building2,
  Calendar,
  Settings,
  Radio,
  Trophy,
  LayoutDashboard,
  Share2,
  ListTodo,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  getProjectById,
  updateProject,
  deleteProject,
  toggleProjectLive,
  toggleProjectFinished,
} from '@/app/actions';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';
import { ProjectNotes } from '@/components/project-notes';
import { ProjectResources } from '@/components/project-resources';
import { LogoUpload } from '@/components/logo-upload';
import { EntityAvatar } from '@/components/entity-avatar';
import { ProjectMetricBar } from '@/components/project-metric-bar';
import { ProjectTimeline } from '@/components/project-timeline';
import type { ProjectType, ProjectGroup } from '@/types/database';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays } from 'date-fns';

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
  const [activeTab, setActiveTab] = useState('workflow'); // Default to workflow for trainees
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

  const metrics = useMemo(() => {
    const total = project.issue_stats.total || 0;
    const done = project.issue_stats.done || 0;
    const progress = total > 0 ? (done / total) * 100 : 0;

    let daysDiff: number | string = 'No deadline';
    if (project.target_date) {
      const diff = differenceInDays(new Date(project.target_date), new Date());
      daysDiff = diff > 0 ? `${diff} Days` : diff === 0 ? 'Today' : 'Overdue';
    }

    return {
      health: (project.status === 'Backlog'
        ? 'Behind'
        : progress < 20 && project.status === 'Active'
          ? 'At Risk'
          : 'On Track') as 'On Track' | 'At Risk' | 'Behind',
      progress,
      daysRemaining: daysDiff,
      totalTasks: total,
      completedTasks: done,
    };
  }, [project]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Dynamic Background Decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden transition-opacity duration-1000">
        <div className="absolute right-[-5%] top-[-10%] h-[40%] w-[40%] animate-float rounded-full bg-primary/5 blur-[120px]" />
        <div
          className="absolute bottom-[-10%] left-[-5%] h-[40%] w-[40%] animate-float rounded-full bg-blue-500/5 blur-[120px]"
          style={{ animationDelay: '-2s' }}
        />
      </div>

      {/* Header */}
      <header className="relative shrink-0 border-b border-white/5 bg-white/[0.01] px-6 py-8 backdrop-blur-md">
        <div className="mx-auto max-w-[1700px]">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex items-center gap-6">
              <Link
                href="/projects"
                className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              </Link>
              <div className="flex items-center gap-5">
                <div className="group relative">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary to-primary-foreground opacity-20 blur transition duration-500 group-hover:opacity-40" />
                  <EntityAvatar
                    src={project.logo_url}
                    fallbackIcon={<ProjectTypeIcon className="h-6 w-6" />}
                    fallbackBgColor={selectedProjectType?.color.split(' ')[1] || 'bg-muted'}
                    fallbackIconColor={
                      selectedProjectType?.color.split(' ')[0] || 'text-muted-foreground'
                    }
                    size="xl"
                    className="relative h-14 w-14 rounded-2xl border border-white/10"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                      {project.name}
                    </h1>
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
                        metrics.health === 'On Track'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : metrics.health === 'At Risk'
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                            : 'border-red-500/20 bg-red-500/10 text-red-500'
                      )}
                    >
                      {project.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm font-medium text-muted-foreground/80">
                    {selectedProjectType && (
                      <span className="flex items-center gap-2">
                        <selectedProjectType.icon
                          className={cn('h-4 w-4', selectedProjectType.color.split(' ')[0])}
                        />
                        {selectedProjectType.label}
                      </span>
                    )}
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {project.client?.name || 'Internal'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="rounded-xl border border-white/5 bg-white/5 p-1"
              >
                <TabsList className="h-10 border-0 bg-transparent">
                  <TabsTrigger
                    value="workflow"
                    className="h-full gap-2 rounded-lg font-bold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <ListTodo className="h-4 w-4" />
                    Workflow
                  </TabsTrigger>
                  <TabsTrigger
                    value="overview"
                    className="h-full gap-2 rounded-lg font-bold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="h-full gap-2 rounded-lg font-bold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="h-full gap-2 rounded-lg font-bold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Left Content Scroll Area */}
          <div className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto max-w-[1400px] px-8 py-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  {activeTab === 'workflow' && (
                    <div className="animate-fade-in">
                      <ProjectWorkflow
                        projectId={project.id}
                        projectType={project.project_type}
                        initialProgress={project.phase_progress || null}
                      />
                    </div>
                  )}

                  {activeTab === 'overview' && (
                    <div className="space-y-10">
                      <ProjectMetricBar metrics={metrics} />

                      <div className="grid gap-10 lg:grid-cols-2">
                        <section className="space-y-6">
                          <div className="flex items-center justify-between px-2">
                            <h3 className="text-xl font-bold tracking-tight">Activity Notes</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                              Latest Updates
                            </span>
                          </div>
                          <ProjectNotes
                            projectId={project.id}
                            workspaceId={project.workspace_id}
                            className="h-[450px] rounded-[1.5rem] border-white/5 bg-white/[0.02] shadow-xl"
                          />
                        </section>

                        <section className="space-y-6">
                          <div className="flex items-center justify-between px-2">
                            <h3 className="text-xl font-bold tracking-tight">Project Resources</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                              Links & Files
                            </span>
                          </div>
                          <ProjectResources
                            projectId={project.id}
                            initialResources={project.metadata?.resources || []}
                            className="h-[450px] rounded-[1.5rem] border-white/5 bg-white/[0.02] shadow-xl"
                          />
                        </section>
                      </div>
                    </div>
                  )}

                  {activeTab === 'timeline' && (
                    <div className="animate-fade-in rounded-[2rem] border border-white/5 bg-white/[0.02] p-10 shadow-2xl backdrop-blur-sm">
                      <div className="mb-8">
                        <h3 className="text-2xl font-bold tracking-tight">Project Roadmap</h3>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                          Visual timeline of phases and milestones
                        </p>
                      </div>
                      <ProjectTimeline
                        projects={[
                          project as unknown as Parameters<
                            typeof ProjectTimeline
                          >[0]['projects'][number],
                        ]}
                      />
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div className="mx-auto max-w-2xl animate-fade-in pb-10">
                      <div className="space-y-10 rounded-[2rem] border border-white/5 bg-white/[0.03] p-10 shadow-2xl backdrop-blur-xl">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight">
                            Project Configuration
                          </h2>
                          <p className="mt-1 text-sm font-medium text-muted-foreground">
                            Manage core project settings and visibility
                          </p>
                        </div>

                        <div className="flex justify-center py-4">
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

                        <div className="grid gap-4">
                          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/[0.07]">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  'flex h-11 w-11 items-center justify-center rounded-xl shadow-glow-sm transition-all',
                                  isLive
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-white/5 text-muted-foreground'
                                )}
                              >
                                <Radio className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold">Live Status</p>
                                <p className="text-xs font-medium text-muted-foreground">
                                  Show in live projects watch
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={isLive}
                              onCheckedChange={handleToggleLive}
                              disabled={togglingLive}
                            />
                          </div>

                          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/[0.07]">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  'flex h-11 w-11 items-center justify-center rounded-xl shadow-glow-sm transition-all',
                                  isFinished
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-white/5 text-muted-foreground'
                                )}
                              >
                                <Trophy className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold">Project Archivability</p>
                                <p className="text-xs font-medium text-muted-foreground">
                                  Mark as officially completed
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={isFinished}
                              onCheckedChange={handleToggleFinished}
                              disabled={togglingFinished}
                            />
                          </div>
                        </div>

                        <div className="space-y-6 pt-4">
                          <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                              Project Name
                            </label>
                            <Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="h-12 rounded-xl border-white/10 bg-white/5 focus:ring-primary/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                              Description / Goal
                            </label>
                            <Textarea
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              className="min-h-[140px] resize-none rounded-xl border-white/10 bg-white/5 focus:ring-primary/20"
                            />
                          </div>

                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                                Workstream Type
                              </label>
                              <Select
                                value={projectType || 'none'}
                                onValueChange={(v) =>
                                  setProjectType(v === 'none' ? null : (v as ProjectType))
                                }
                              >
                                <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5">
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
                            <div className="space-y-2">
                              <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                                Project Person:
                              </label>
                              <Select
                                value={leadId || 'none'}
                                onValueChange={(v) => setLeadId(v === 'none' ? null : v)}
                              >
                                <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No lead assigned</SelectItem>
                                  {profiles.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.full_name || p.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                              Target Launch Date
                            </label>
                            <Input
                              type="date"
                              value={targetDate}
                              onChange={(e) => setTargetDate(e.target.value)}
                              className="h-12 rounded-xl border-white/10 bg-white/5 focus:ring-primary/20"
                            />
                          </div>
                        </div>

                        {error && (
                          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">
                            {error}
                          </div>
                        )}

                        <div className="flex gap-4 pt-6">
                          <Button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className={cn(
                              'h-14 flex-1 rounded-2xl text-lg font-bold shadow-glow transition-all',
                              saved && 'bg-emerald-600'
                            )}
                          >
                            {saving
                              ? 'Syncing...'
                              : saved
                                ? 'Successfully Updated'
                                : 'Save Project Metadata'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDelete}
                            disabled={isPending}
                            className="h-14 w-14 rounded-2xl text-red-500 transition-all hover:bg-red-500/10 active:scale-95"
                          >
                            <Trash2 className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Premium Sticky Right Sidebar */}
          <aside className="scrollbar-none hidden w-80 space-y-12 overflow-y-auto border-l border-white/5 bg-white/[0.01] p-8 backdrop-blur-sm xl:block">
            <section>
              <h4 className="mb-8 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50">
                Personnel
              </h4>
              <div className="space-y-8">
                <div className="group flex items-center gap-5 transition-all">
                  <div className="relative">
                    <EntityAvatar
                      src={project.lead?.avatar_url}
                      fallbackIcon={<User className="h-4 w-4" />}
                      size="lg"
                      className="h-12 w-12 rounded-xl border border-white/10 transition-all group-hover:border-primary/40"
                    />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                      {project.lead?.full_name || 'Unassigned'}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Project Person:
                    </p>
                  </div>
                </div>

                {project.client && (
                  <div className="group flex items-center gap-5 transition-all">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/10 bg-blue-500/10 text-blue-400 transition-all group-hover:border-blue-400/40">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-blue-400">
                        {project.client.name}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                        Client Context:
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h4 className="mb-8 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50">
                Lifecycle Registry
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 transition-all hover:bg-white/[0.05]">
                  <span className="text-[11px] font-bold text-muted-foreground/70">Initiated</span>
                  <span className="text-xs font-bold text-foreground/90">
                    {formatDate(project.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 transition-all hover:bg-white/[0.05]">
                  <span className="text-[11px] font-bold text-muted-foreground/70">Heartbeat</span>
                  <span className="text-xs font-bold text-foreground/90">
                    {formatTimeAgo(project.updated_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 transition-all hover:bg-white/[0.05]">
                  <span className="text-[11px] font-bold text-muted-foreground/70">Milestone</span>
                  <span className="text-xs font-bold text-foreground/90">
                    {project.target_date ? formatDate(project.target_date) : 'Undated'}
                  </span>
                </div>
              </div>
            </section>

            <section className="pt-4">
              <h4 className="mb-8 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50">
                System Actions
              </h4>
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="group h-12 rounded-2xl border-white/5 bg-white/[0.03] transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
                >
                  <Share2 className="mr-3 h-4 w-4" />
                  <span className="text-xs font-bold">Public Overview</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="group h-12 rounded-2xl border-white/5 bg-white/[0.03] transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
                >
                  <LayoutDashboard className="mr-3 h-4 w-4" />
                  <span className="text-xs font-bold">Generate Report</span>
                </Button>
              </div>
            </section>

            <div className="pt-20">
              <div className="rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/20 to-primary-foreground/5 p-6">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                  Pro Feature
                </p>
                <p className="text-xs font-medium italic leading-relaxed text-foreground/80 opacity-80">
                  &quot;Track every millisecond of your project lifecycle with Qualia v2.&quot;
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
