'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Folder,
  Calendar,
  Trash2,
  Save,
  User,
  PanelRightClose,
  PanelRightOpen,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
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
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { ProjectRoadmap } from '@/components/project-roadmap';
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
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  // Form state initialized from server-fetched data
  const [name, setName] = useState(initialProject.name);
  const [description, setDescription] = useState(initialProject.description || '');
  const [projectType, setProjectType] = useState<ProjectType | null>(
    initialProject.project_type || null
  );
  const [leadId, setLeadId] = useState<string | null>(initialProject.lead?.id || null);
  const [targetDate, setTargetDate] = useState(initialProject.target_date || '');

  const handleSave = async () => {
    setSaving(true);
    setError(null);

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
    } else {
      setError(result.error || 'Failed to update project');
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this project? This will also delete all issues in this project.'
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-violet-500/10 text-violet-500">
              <Folder className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold">{project.name}</h1>
              <div className="flex items-center gap-2">
                {project.lead && (
                  <span className="text-xs text-muted-foreground">
                    Lead: {project.lead.full_name || project.lead.email}
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
            className="gap-2"
          >
            {showPanel ? (
              <>
                <PanelRightClose className="h-4 w-4" />
                Hide Details
              </>
            ) : (
              <>
                <PanelRightOpen className="h-4 w-4" />
                Show Details
              </>
            )}
          </Button>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content - Roadmap */}
        <div className="flex-1 overflow-y-auto p-6">
          <ProjectRoadmap projectId={project.id} workspaceId={project.workspace_id} />
        </div>

        {/* Side Panel - Project Details */}
        {showPanel && (
          <div className="w-[380px] flex-shrink-0 overflow-y-auto border-l border-border bg-card p-6">
            <div className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">Project Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-border bg-background"
                  placeholder="Project name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] border-border bg-background"
                  placeholder="Add a description..."
                />
              </div>

              {/* Project Type */}
              <div>
                <label className="mb-2 block flex items-center gap-1 text-xs text-muted-foreground">
                  <Folder className="h-3 w-3" />
                  Project Type
                </label>
                <Select
                  value={projectType || 'none'}
                  onValueChange={(v) => setProjectType(v === 'none' ? null : (v as ProjectType))}
                >
                  <SelectTrigger className="border-border bg-background">
                    <SelectValue placeholder="No type" />
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
              <div>
                <label className="mb-2 block flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  Lead
                </label>
                <Select
                  value={leadId || 'none'}
                  onValueChange={(v) => setLeadId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="border-border bg-background">
                    <SelectValue placeholder="No lead" />
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

              {/* Target Date */}
              <div>
                <label className="mb-2 block flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Target Date
                </label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="border-border bg-background"
                />
              </div>

              {/* Save/Delete Buttons */}
              <div className="flex gap-2 border-t border-border pt-4">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-qualia-600 hover:bg-qualia-500"
                >
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Metadata */}
              <div className="space-y-3 border-t border-border pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(project.created_at)}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Updated {formatTimeAgo(project.updated_at)}
                </div>
                {project.client && (
                  <div className="flex items-center gap-2">
                    <Folder className="h-3 w-3" />
                    Client: {project.client.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
