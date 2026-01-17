'use client';

import Link from 'next/link';
import { Folder, Bot, Globe, Phone, TrendingUp, Megaphone, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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
  // Show more projects since container is taller
  const visibleProjects = projects.slice(0, 8);

  return (
    <div className="widget">
      {/* Header */}
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon bg-emerald-500/10">
            <Folder className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Live Projects</h3>
            <p className="text-xs text-muted-foreground">{projects.length} live</p>
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
      <div className="widget-content min-h-0 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-lg bg-muted p-3">
              <Folder className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No live projects</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {visibleProjects.map((project, index) => {
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
                  <Link href={`/projects/${project.id}`} className="group list-item">
                    <EntityAvatar
                      src={project.logo_url}
                      fallbackIcon={<TypeIcon className="h-4 w-4" />}
                      fallbackBgColor={typeConfig?.bg || 'bg-muted'}
                      fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                        {project.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'status-dot shrink-0',
                        STATUS_COLORS[project.status] || 'bg-muted-foreground'
                      )}
                    />
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
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
