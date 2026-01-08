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
  Settings2,
  X,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Clock,
  Building2,
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
import { getProjectById, updateProject, deleteProject } from '@/app/actions';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';
import { ProjectTaskKanban } from '@/components/project-task-kanban';
import { ProjectFiles } from '@/components/project-files';
import type { ProjectType, ProjectGroup } from '@/types/database';

const PROJECT_TYPES: { value: ProjectType; label: string; icon: typeof Globe }[] = [
  { value: 'web_design', label: 'Website', icon: Globe },
  { value: 'ai_agent', label: 'AI Agent', icon: Bot },
  { value: 'voice_agent', label: 'Voice Agent', icon: Phone },
  { value: 'seo', label: 'SEO', icon: TrendingUp },
  { value: 'ads', label: 'Ads', icon: Megaphone },
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
  const [showPanel, setShowPanel] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <ProjectTypeIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold sm:text-xl">{project.name}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {selectedProjectType && (
                    <span className="rounded-md bg-secondary px-1.5 py-0.5">
                      {selectedProjectType.label}
                    </span>
                  )}
                  {project.lead && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {project.lead.full_name || project.lead.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPanel(!showPanel)}
              className={cn('gap-2', showPanel && 'bg-secondary')}
            >
              <Settings2 className="h-4 w-4" />
              {showPanel ? 'Close' : 'Settings'}
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-medium text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content - Tasks */}
        <div className="flex-1 overflow-y-auto p-6">
          <ProjectTaskKanban projectId={project.id} projectType={project.project_type} />
        </div>

        {/* Side Panel */}
        {showPanel && (
          <div className="w-[380px] flex-shrink-0 overflow-y-auto border-l border-border bg-card">
            {/* Panel Header */}
            <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">Project Settings</h2>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-4">
                {/* Project Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9"
                    placeholder="Project name"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Two Column Layout for Type and Lead */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Project Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <Select
                      value={projectType || 'none'}
                      onValueChange={(v) =>
                        setProjectType(v === 'none' ? null : (v as ProjectType))
                      }
                    >
                      <SelectTrigger className="h-9">
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Lead</label>
                    <Select
                      value={leadId || 'none'}
                      onValueChange={(v) => setLeadId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="h-9">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Target Date</label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className={cn('w-full gap-2', saved && 'bg-emerald-600 hover:bg-emerald-600')}
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
                        <Check className="h-4 w-4" />
                        Save Changes
                      </>
                    ) : (
                      'No Changes'
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="w-full gap-2 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Project
                  </Button>
                </div>

                {/* Metadata Section */}
                <div className="mt-2 space-y-3 rounded-lg border border-border bg-secondary/50 p-3">
                  <h3 className="text-xs font-medium text-muted-foreground">Project Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Created
                      </span>
                      <span>{formatDate(project.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Updated
                      </span>
                      <span>{formatTimeAgo(project.updated_at)}</span>
                    </div>
                    {project.client && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          Client
                        </span>
                        <span>{project.client.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Files Section */}
                <div className="mt-4 rounded-lg border border-border bg-secondary/50 p-3">
                  <ProjectFiles projectId={project.id} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
