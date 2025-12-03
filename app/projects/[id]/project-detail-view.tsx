'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Folder,
  Users,
  Calendar,
  Trash2,
  Save,
  User,
  Circle,
  CheckCircle2,
  SignalHigh,
  SignalMedium,
  SignalLow,
  MoreHorizontal,
  Map,
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
import { PROJECT_GROUP_LABELS, type ProjectGroup } from '@/components/project-group-tabs';
import { formatDate, formatTimeAgo } from '@/lib/utils';

const PROJECT_GROUPS: ProjectGroup[] = [
  'salman_kuwait',
  'tasos_kyriakides',
  'other',
  'active',
  'demos',
  'inactive',
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

interface Team {
  id: string;
  name: string;
  key: string;
}

interface ProjectDetailViewProps {
  project: Project;
  teams: Team[];
  profiles: Profile[];
}

const ProjectGroupBadge = ({ group }: { group: ProjectGroup | null }) => {
  const colors: Record<ProjectGroup, string> = {
    salman_kuwait: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    tasos_kyriakides: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    other: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
    demos: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  if (!group) return null;

  return (
    <span className={`rounded border px-2 py-0.5 text-xs ${colors[group]}`}>
      {PROJECT_GROUP_LABELS[group]}
    </span>
  );
};

const PriorityIcon = ({ priority }: { priority: string }) => {
  switch (priority) {
    case 'Urgent':
      return <SignalHigh className="h-4 w-4 text-red-500" />;
    case 'High':
      return <SignalHigh className="h-4 w-4 text-orange-500" />;
    case 'Medium':
      return <SignalMedium className="h-4 w-4 text-yellow-500" />;
    case 'Low':
      return <SignalLow className="h-4 w-4 text-gray-500" />;
    default:
      return <MoreHorizontal className="h-4 w-4 text-gray-600" />;
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'Done':
      return <CheckCircle2 className="h-4 w-4 text-qualia-500" />;
    case 'In Progress':
      return <Circle className="h-4 w-4 fill-yellow-500/20 text-yellow-500" />;
    default:
      return <Circle className="h-4 w-4 text-gray-500" />;
  }
};

export function ProjectDetailView({
  project: initialProject,
  teams,
  profiles,
}: ProjectDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [project, setProject] = useState<Project>(initialProject);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state initialized from server-fetched data
  const [name, setName] = useState(initialProject.name);
  const [description, setDescription] = useState(initialProject.description || '');
  const [projectGroup, setProjectGroup] = useState<ProjectGroup | null>(
    initialProject.project_group || null
  );
  const [leadId, setLeadId] = useState<string | null>(initialProject.lead?.id || null);
  const [teamId, setTeamId] = useState<string | null>(initialProject.team?.id || null);
  const [targetDate, setTargetDate] = useState(initialProject.target_date || '');

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set('id', project.id);
    formData.set('name', name);
    formData.set('description', description);
    if (projectGroup) formData.set('project_group', projectGroup);
    if (leadId) formData.set('lead_id', leadId);
    if (teamId) formData.set('team_id', teamId);
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

  const progress = project.issue_stats.total
    ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-muted-foreground">
              <Folder className="h-4 w-4" />
            </div>
            <ProjectGroupBadge group={projectGroup} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-qualia-600 hover:bg-qualia-500"
          >
            <Save className="mr-1 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Name */}
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-0 bg-transparent px-0 text-xl font-semibold text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                placeholder="Project name"
              />

              {/* Progress */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm text-foreground">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-qualia-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{project.issue_stats.done} done</span>
                  <span>{project.issue_stats.total} total issues</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] border-border bg-card text-foreground"
                  placeholder="Add a description..."
                />
              </div>

              {/* Roadmap Link */}
              <div className="border-t border-border pt-6">
                <Link
                  href={`/projects/${project.id}/roadmap`}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-qualia-500/10">
                    <Map className="h-5 w-5 text-qualia-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Project Roadmap</h3>
                    <p className="text-sm text-muted-foreground">Track project phases and tasks</p>
                  </div>
                  <ArrowLeft className="h-5 w-5 rotate-180 text-muted-foreground" />
                </Link>
              </div>

              {/* Issues List */}
              <div className="border-t border-border pt-6">
                <h3 className="mb-4 text-sm font-medium text-foreground">
                  Issues ({project.issues.length})
                </h3>

                {project.issues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No issues in this project</p>
                ) : (
                  <div className="space-y-1">
                    {project.issues.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/issues/${issue.id}`}
                        className="group flex items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-card"
                      >
                        <StatusIcon status={issue.status} />
                        <PriorityIcon priority={issue.priority} />
                        <span className="flex-1 truncate text-sm text-foreground">
                          {issue.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(issue.created_at)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                {/* Project Group */}
                <div>
                  <label className="mb-2 block text-xs text-muted-foreground">Category</label>
                  <Select
                    value={projectGroup || 'none'}
                    onValueChange={(v) =>
                      setProjectGroup(v === 'none' ? null : (v as ProjectGroup))
                    }
                  >
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {PROJECT_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {PROJECT_GROUP_LABELS[g]}
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

                {/* Team */}
                <div>
                  <label className="mb-2 block flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Team
                  </label>
                  <Select
                    value={teamId || 'none'}
                    onValueChange={(v) => setTeamId(v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue placeholder="No team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.key})
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
              </div>

              {/* Metadata */}
              <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
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
        </div>
      </div>
    </div>
  );
}
