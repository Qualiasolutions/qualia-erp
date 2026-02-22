'use client';

import Link from 'next/link';
import {
  Folder,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Sparkles,
  ChevronRight,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntityAvatar } from '@/components/entity-avatar';
import type { ProjectType } from '@/types/database';

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: ProjectType | null;
  target_date: string | null;
  logo_url: string | null;
  issue_stats: {
    total: number;
    done: number;
  };
}

interface ProjectPulseSidebarProps {
  activeProjects: Project[];
  finishedProjects: Project[];
}

const PROJECT_TYPE_CONFIG: Record<ProjectType, { icon: typeof Globe; color: string }> = {
  ai_agent: { icon: Bot, color: 'text-violet-500' },
  voice_agent: { icon: Phone, color: 'text-pink-500' },
  ai_platform: { icon: Sparkles, color: 'text-indigo-500' },
  web_design: { icon: Globe, color: 'text-sky-500' },
  seo: { icon: TrendingUp, color: 'text-emerald-500' },
  ads: { icon: Megaphone, color: 'text-amber-500' },
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-500',
  Demos: 'bg-violet-500',
  Launched: 'bg-sky-500',
  Delayed: 'bg-amber-500',
};

// AI project types go in the left column
const AI_PROJECT_TYPES: ProjectType[] = ['ai_agent', 'voice_agent', 'ai_platform'];

export function ProjectPulseSidebar({
  activeProjects,
  finishedProjects,
}: ProjectPulseSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Active Projects */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10">
                <Folder className="h-3 w-3 text-emerald-500" />
              </div>
              <h3 className="text-sm font-semibold text-white">Currently Building</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{activeProjects.length} in progress</p>
          </div>
          <Link
            href="/projects"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {activeProjects.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Folder className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-white">No active projects</p>
              <p className="mt-0.5 text-xs text-zinc-500">Start something new</p>
            </div>
          ) : (
            <ProjectColumns projects={activeProjects} />
          )}
        </div>
      </div>

      {/* Completed Projects */}
      {finishedProjects.length > 0 && (
        <div className="flex min-h-0 flex-col border-t border-white/[0.06]">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10">
                <Sparkles className="h-3 w-3 text-sky-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Recently Completed</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{finishedProjects.length} launched</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <div className="space-y-1">
              {finishedProjects.slice(0, 4).map((project) => (
                <ProjectCard key={project.id} project={project} compact />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;

  const progress =
    project.issue_stats.total > 0
      ? (project.issue_stats.done / project.issue_stats.total) * 100
      : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
        'hover:bg-white/[0.04]'
      )}
    >
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-4 w-4" />}
        fallbackBgColor="bg-zinc-800"
        fallbackIconColor={typeConfig?.color || 'text-zinc-400'}
        size="sm"
        className="rounded-xl ring-1 ring-white/10"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-zinc-100 transition-colors group-hover:text-white">
            {project.name}
          </span>
          {!compact && (
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full ring-2 ring-zinc-900',
                STATUS_COLORS[project.status] || 'bg-zinc-500'
              )}
            />
          )}
          {compact && <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-500" />}
        </div>

        {!compact && (
          <div className="mt-2 flex items-center gap-2">
            {/* Progress bar */}
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progress >= 80
                    ? 'bg-emerald-500'
                    : progress >= 50
                      ? 'bg-amber-500'
                      : 'bg-zinc-600'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-zinc-400">
              {Math.round(progress)}%
            </span>
          </div>
        )}

        {!compact && project.target_date && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            {new Date(project.target_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        )}
      </div>
    </Link>
  );
}

function ProjectColumns({ projects }: { projects: Project[] }) {
  const aiProjects = projects.filter(
    (p) => p.project_type && AI_PROJECT_TYPES.includes(p.project_type)
  );
  const otherProjects = projects.filter(
    (p) => !p.project_type || !AI_PROJECT_TYPES.includes(p.project_type)
  );

  // If all projects are one type, show single column
  if (aiProjects.length === 0 || otherProjects.length === 0) {
    return (
      <div className="space-y-1">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* AI Projects - Left Column */}
      <div className="space-y-1">
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <Bot className="h-3 w-3 text-violet-400" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">AI</span>
        </div>
        {aiProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {/* Other Projects - Right Column */}
      <div className="space-y-1">
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <Globe className="h-3 w-3 text-sky-400" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Web & Marketing
          </span>
        </div>
        {otherProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
