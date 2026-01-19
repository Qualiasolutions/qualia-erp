'use client';

import Link from 'next/link';
import {
  Folder,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  ChevronRight,
  Trophy,
  Activity,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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

const PROJECT_TYPE_CONFIG: Record<ProjectType, { icon: typeof Globe; color: string; bg: string }> =
  {
    ai_agent: { icon: Bot, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    voice_agent: { icon: Phone, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    web_design: { icon: Globe, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    seo: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ads: { icon: Megaphone, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  };

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-500',
  Demos: 'bg-violet-500',
  Launched: 'bg-sky-500',
  Delayed: 'bg-amber-500',
};

export function ProjectPulseSidebar({
  activeProjects,
  finishedProjects,
}: ProjectPulseSidebarProps) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden pr-1">
      {/* Active Pulse Section */}
      <div className="flex min-h-0 min-h-[50%] flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Active Pulse</h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Live & Active
              </p>
            </div>
          </div>
          <Link
            href="/projects"
            className="rounded-full bg-muted/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="scrollbar-none flex-1 space-y-2 overflow-y-auto py-1">
          {activeProjects.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 px-4 text-center">
              <Activity className="mb-2 h-6 w-6 text-muted-foreground/30" />
              <p className="text-xs font-medium text-muted-foreground">No active pulse</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {activeProjects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Recent Completions Section */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Completions</h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recently Launched
              </p>
            </div>
          </div>
        </div>

        <div className="scrollbar-none flex-1 space-y-2 overflow-y-auto py-1">
          {finishedProjects.length === 0 ? (
            <div className="flex h-24 flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/30 text-center">
              <p className="text-xs text-muted-foreground">None lately</p>
            </div>
          ) : (
            finishedProjects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} variant="compact" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  index,
  variant = 'default',
}: {
  project: Project;
  index: number;
  variant?: 'default' | 'compact';
}) {
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;

  const progress =
    project.issue_stats.total > 0
      ? (project.issue_stats.done / project.issue_stats.total) * 100
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          'group relative block overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-3 transition-all duration-300',
          'hover:border-border/80 hover:bg-card hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5',
          variant === 'compact' && 'p-2.5'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <EntityAvatar
              src={project.logo_url}
              fallbackIcon={<TypeIcon className="h-4 w-4" />}
              fallbackBgColor={typeConfig?.bg || 'bg-muted'}
              fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
              size={variant === 'compact' ? 'sm' : 'md'}
              className="rounded-xl"
            />
            {variant !== 'compact' && (
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
                  STATUS_COLORS[project.status] || 'bg-muted-foreground'
                )}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                {project.name}
              </h4>
              {variant === 'default' && project.target_date && (
                <span className="flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.target_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-4">
              {/* Progress bar */}
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={cn(
                    'absolute inset-0 rounded-full',
                    variant === 'compact' ? 'bg-amber-500/60' : 'bg-emerald-500/60'
                  )}
                />
              </div>
              <span className="whitespace-nowrap text-[10px] font-bold text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Hover accent */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </motion.div>
  );
}
