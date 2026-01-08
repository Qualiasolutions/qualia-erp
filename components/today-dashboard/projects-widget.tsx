'use client';

import Link from 'next/link';
import { Folder, Bot, Globe, Phone, TrendingUp, Megaphone, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ProjectType } from '@/types/database';

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: ProjectType | null;
  target_date: string | null;
  issue_stats: {
    total: number;
    done: number;
  };
}

interface ProjectsWidgetProps {
  projects: Project[];
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

export function ProjectsWidget({ projects }: ProjectsWidgetProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <Folder className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold">Projects</h3>
            <p className="text-xs text-muted-foreground">{projects.length} active</p>
          </div>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {projects.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-2xl bg-muted/50 p-4">
              <Folder className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="mt-4 font-medium text-foreground">No active projects</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a new project to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((project, index) => {
              const typeConfig = project.project_type
                ? PROJECT_TYPE_CONFIG[project.project_type]
                : null;
              const TypeIcon = typeConfig?.icon || Folder;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    href={`/projects/${project.id}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-muted/50"
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        typeConfig?.bg || 'bg-muted'
                      )}
                    >
                      <TypeIcon
                        className={cn('h-4 w-4', typeConfig?.color || 'text-muted-foreground')}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                        {project.name}
                      </span>
                    </div>

                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        STATUS_COLORS[project.status] || 'bg-muted-foreground'
                      )}
                    />
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
