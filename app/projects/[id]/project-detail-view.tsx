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
  ChevronDown,
  FileText,
  Save,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getProjectById, updateProject, deleteProject } from '@/app/actions';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';
import { ProjectTaskKanban } from '@/components/project-task-kanban';
import { ProjectFiles } from '@/components/project-files';
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
  lead: Profile | null;
  team: { id: string; name: string; key: string } | null;
  client: { id: string; name: string } | null;
  issues: Issue[];
  issue_stats: {
    total: number;
    done: number;
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

  // Form state initialized from server-fetched data
  const [name, setName] = useState(initialProject.name);
  const [description, setDescription] = useState(initialProject.description || '');
  const [projectType, setProjectType] = useState<ProjectType | null>(
    initialProject.project_type || null
  );
  const [leadId, setLeadId] = useState<string | null>(initialProject.lead?.id || null);
  const [targetDate, setTargetDate] = useState(initialProject.target_date || '');

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

  const selectedProjectType = PROJECT_TYPES.find((t) => t.value === projectType);
  const ProjectTypeIcon = selectedProjectType?.icon || Folder;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Premium Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-b border-border/50 bg-gradient-to-b from-card to-background"
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

            {/* Quick stats */}
            <div className="hidden items-center gap-6 lg:flex">
              <div className="text-right">
                <p className="text-2xl font-light tracking-tight">
                  {project.issue_stats?.done || 0}
                </p>
                <p className="text-xs text-muted-foreground">completed</p>
              </div>
              <div className="h-10 w-px bg-border/50" />
              <div className="text-right">
                <p className="text-2xl font-light tracking-tight">
                  {(project.issue_stats?.total || 0) - (project.issue_stats?.done || 0)}
                </p>
                <p className="text-xs text-muted-foreground">remaining</p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-medium text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Settings Collapsible */}
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="overflow-hidden rounded-2xl border border-border/50 bg-card"
              >
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">Project Settings</h3>
                        <p className="text-sm text-muted-foreground">
                          {project.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-muted-foreground transition-transform',
                        settingsOpen && 'rotate-180'
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border/50 px-5 py-5">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Left: Main settings */}
                      <div className="space-y-4 lg:col-span-2">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Project Name */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                              Project Name
                            </label>
                            <Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="h-10 rounded-xl"
                              placeholder="Project name"
                            />
                          </div>

                          {/* Target Date */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                              Target Date
                            </label>
                            <Input
                              type="date"
                              value={targetDate}
                              onChange={(e) => setTargetDate(e.target.value)}
                              className="h-10 rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">
                            Description
                          </label>
                          <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[80px] resize-none rounded-xl"
                            placeholder="Add a description..."
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Project Type */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                              Type
                            </label>
                            <Select
                              value={projectType || 'none'}
                              onValueChange={(v) =>
                                setProjectType(v === 'none' ? null : (v as ProjectType))
                              }
                            >
                              <SelectTrigger className="h-10 rounded-xl">
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

                          {/* Lead */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                              Lead
                            </label>
                            <Select
                              value={leadId || 'none'}
                              onValueChange={(v) => setLeadId(v === 'none' ? null : v)}
                            >
                              <SelectTrigger className="h-10 rounded-xl">
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
                      </div>

                      {/* Right: Meta & Actions */}
                      <div className="space-y-4">
                        {/* Project Logo */}
                        <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Project Logo
                          </h4>
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

                        {/* Meta Info */}
                        <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
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

                        {/* Files */}
                        <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                          <ProjectFiles projectId={project.id} />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className={cn(
                              'flex-1 gap-2 rounded-xl',
                              saved && 'bg-emerald-600 hover:bg-emerald-600'
                            )}
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
                                Save
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
                            className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </motion.div>
            </Collapsible>

            {/* Tasks Kanban - Primary Focus */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ProjectTaskKanban projectId={project.id} projectType={project.project_type} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
