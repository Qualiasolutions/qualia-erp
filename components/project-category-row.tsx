'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectData } from '@/app/projects/page';
import type { ProjectType } from '@/types/database';
import { useState, useEffect } from 'react';
import { getClients } from '@/app/actions';
import { ProjectWizard } from '@/components/project-wizard';
import { useWorkspace } from '@/components/workspace-provider';

interface ProjectCategoryRowProps {
  title: string;
  types: Array<{
    type: ProjectType;
    label: string;
    icon: typeof Bot;
    color: string;
    bgColor: string;
  }>;
  projects: ProjectData[];
  onProjectClick?: (project: ProjectData) => void;
}

interface Client {
  id: string;
  display_name: string | null;
  business_name?: string | null;
}

export function ProjectCategoryRow({
  title,
  types,
  projects,
  onProjectClick,
}: ProjectCategoryRowProps) {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDefaultType, setWizardDefaultType] = useState<ProjectType | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    if (wizardOpen && currentWorkspace) {
      getClients(currentWorkspace.id).then((result) => {
        if (Array.isArray(result)) {
          setClients(result);
        }
      });
    }
  }, [wizardOpen, currentWorkspace]);

  const handleOpenWizard = (type: ProjectType) => {
    setWizardDefaultType(type);
    setWizardOpen(true);
  };

  const handleProjectClick = (project: ProjectData) => {
    if (onProjectClick) {
      onProjectClick(project);
    } else {
      router.push(`/projects/${project.id}`);
    }
  };

  // Group projects by type
  const projectsByType = types.reduce(
    (acc, { type }) => {
      acc[type] = projects.filter((p) => p.project_type === type);
      return acc;
    },
    {} as Record<ProjectType, ProjectData[]>
  );

  const totalCount = projects.length;

  return (
    <>
      <div className="space-y-4">
        {/* Row Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
            {totalCount}
          </span>
        </div>

        {/* Type Badges Row */}
        <div className="flex flex-wrap gap-3">
          {types.map(({ type, label, icon: Icon, color, bgColor }) => {
            const count = projectsByType[type]?.length || 0;
            return (
              <button
                key={type}
                onClick={() => handleOpenWizard(type)}
                className={cn(
                  'group relative flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 transition-all duration-200',
                  'hover:scale-105 hover:shadow-lg',
                  bgColor,
                  count > 0 ? 'border-transparent' : 'border-dashed border-border'
                )}
              >
                <div className={cn('rounded-lg p-1.5', bgColor)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <span className="font-semibold text-foreground">{label}</span>
                <span
                  className={cn(
                    'ml-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                    bgColor,
                    color
                  )}
                >
                  {count}
                </span>
                <Plus
                  className={cn(
                    'ml-1 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100',
                    color
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Projects Grid */}
        {totalCount > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => {
              const typeConfig = types.find((t) => t.type === project.project_type);
              const Icon = typeConfig?.icon || Bot;

              return (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className={cn(
                    'group relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200',
                    'hover:scale-[1.02] hover:shadow-md',
                    typeConfig?.bgColor || 'bg-secondary/20',
                    'border-border hover:border-border'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                        typeConfig?.bgColor || 'bg-muted'
                      )}
                    >
                      <Icon
                        className={cn('h-5 w-5', typeConfig?.color || 'text-muted-foreground')}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
                        {project.name}
                      </h3>
                      {project.client_name && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {project.client_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 py-12">
            <p className="text-sm text-muted-foreground">
              No projects yet. Click a badge above to create one.
            </p>
          </div>
        )}
      </div>

      <ProjectWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        clients={clients}
        defaultType={wizardDefaultType}
      />
    </>
  );
}
