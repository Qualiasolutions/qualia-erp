'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Globe, Phone, TrendingUp, Megaphone, Folder, Inbox, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntityAvatar } from '@/components/entity-avatar';
import { USER_COLORS } from '@/lib/color-constants';
import type { ProjectData } from '@/app/projects/page';
import type { ProjectType } from '@/types/database';

// Get user color key from email
function getUserColorKey(email: string | null): 'fawzi' | 'moayad' | null {
  if (!email) return null;
  const lowerEmail = email.toLowerCase();
  if (lowerEmail.includes('info@qualia') || lowerEmail.includes('fawzi')) return 'fawzi';
  if (lowerEmail.includes('moayad')) return 'moayad';
  return null;
}

// Project type configuration
const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  {
    icon: typeof Globe;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  ai_agent: {
    icon: Bot,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    label: 'AI',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    label: 'Voice',
  },
  web_design: {
    icon: Globe,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    label: 'Web',
  },
  seo: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'SEO',
  },
  ads: {
    icon: Megaphone,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Ads',
  },
};

// Project row component
const ProjectRow = React.memo(function ProjectRow({ project }: { project: ProjectData }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/projects/${project.id}`);
  };

  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;
  const userColorKey = getUserColorKey(project.lead?.email || null);
  const userColors = userColorKey ? USER_COLORS[userColorKey] : null;

  return (
    <div
      onClick={handleClick}
      className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
    >
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-3.5 w-3.5" />}
        fallbackBgColor={typeConfig?.bgColor || 'bg-muted'}
        fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground transition-colors group-hover:text-qualia-500">
          {project.name}
        </p>
        {project.lead && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <User className={cn('h-3 w-3', userColors?.text || 'text-muted-foreground')} />
            <span className={cn('truncate text-xs', userColors?.text || 'text-muted-foreground')}>
              {project.lead.full_name}
            </span>
          </div>
        )}
      </div>
      {userColors && <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', userColors.dot)} />}
    </div>
  );
});

interface ProjectColumnViewProps {
  title: string;
  icon: React.ReactNode;
  projects: ProjectData[];
  emptyMessage: string;
}

export function ProjectColumnView({ title, icon, projects, emptyMessage }: ProjectColumnViewProps) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {projects.length}
        </span>
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 rounded-xl bg-secondary/50 p-4">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
