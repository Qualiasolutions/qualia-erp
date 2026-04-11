'use client';

import Link from 'next/link';
import {
  Globe,
  Bot,
  Mic2,
  Search,
  Megaphone,
  BarChart3,
  Smartphone,
  ArrowRight,
  FolderKanban,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChannelDetailsProps {
  project: {
    id: string;
    name: string;
    project_type: string;
    status?: string | null;
    description?: string | null;
  };
  isVisible: boolean;
}

const projectTypeIcons: Record<string, typeof Globe> = {
  web_design: Globe,
  ai_agent: Bot,
  voice_agent: Mic2,
  seo: Search,
  ads: Megaphone,
  ai_platform: BarChart3,
  app: Smartphone,
};

function getStatusVariant(status: string | null | undefined): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
    case 'Launched':
    case 'Done':
      return 'bg-primary/10 text-primary';
    case 'Delayed':
      return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';
    case 'Demos':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function ChannelDetails({ project, isVisible }: ChannelDetailsProps) {
  if (!isVisible) return null;

  const TypeIcon = projectTypeIcons[project.project_type] || FolderKanban;

  return (
    <aside className="hidden w-[280px] shrink-0 border-l border-border bg-card lg:block">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Details
        </h3>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {/* Project icon + name */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08]">
              <TypeIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground">{project.name}</h4>
              <p className="text-xs capitalize text-muted-foreground">
                {project.project_type?.replace(/_/g, ' ') || 'Project'}
              </p>
            </div>
          </div>

          {/* Status badge */}
          {project.status && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <Badge
                variant="secondary"
                className={cn('text-xs font-medium', getStatusVariant(project.status))}
              >
                {project.status}
              </Badge>
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
            </div>
          )}

          {/* Link to project */}
          <Link
            href={`/portal/${project.id}`}
            className="group flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-150 hover:border-primary/20 hover:bg-primary/[0.04]"
          >
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            View project
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
