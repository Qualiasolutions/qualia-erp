'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Beaker, Archive, ChevronDown, CheckCircle2, Trophy, Bot, Phone, Sparkles, TrendingUp, Globe, Megaphone } from 'lucide-react';
import { ProjectColumnView } from '@/components/project-column-view';
import { ProjectCategoryRow } from '@/components/project-category-row';
import { DemoSheet } from '@/components/demo-sheet';
import { EntityAvatar } from '@/components/entity-avatar';
import { useProjectStats, type ProjectStatsData } from '@/lib/swr';
import { cn } from '@/lib/utils';
import type { ProjectData } from './page';

interface ProjectsClientProps {
  projects: ProjectData[];
  demos: ProjectData[];
  finishedProjects: ProjectData[];
  archivedDemos: ProjectData[];
  archivedProjects: ProjectData[];
}

export function ProjectsClient({
  projects: initialProjects,
  demos: initialDemos,
  finishedProjects: initialFinishedProjects,
  archivedDemos: initialArchivedDemos,
  archivedProjects: initialArchivedProjects,
}: ProjectsClientProps) {
  const router = useRouter();

  // Use SWR for real-time updates, with server data as initial/fallback
  const { projects, demos } = useProjectStats({
    projects: initialProjects as ProjectStatsData[],
    demos: initialDemos as ProjectStatsData[],
  });

  const [selectedDemo, setSelectedDemo] = useState<ProjectData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showFinishedProjects, setShowFinishedProjects] = useState(true);
  const [showArchivedDemos, setShowArchivedDemos] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);

  const handleDemoClick = (demo: ProjectStatsData) => {
    setSelectedDemo(demo as ProjectData);
    setSheetOpen(true);
  };

  // Use initial data for finished/archived items (no SWR for these)
  const finishedProjects = initialFinishedProjects;
  const archivedDemos = initialArchivedDemos;
  const archivedProjects = initialArchivedProjects;

  const hasFinishedProjects = finishedProjects.length > 0;
  const hasArchivedDemos = archivedDemos.length > 0;
  const hasArchivedProjects = archivedProjects.length > 0;

  return (
    <div className="space-y-6">
      {/* Main columns - Currently Building and Demos side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {/* AI Technologies Row - AI Agents, Voice Agents, AI Platforms */}
          <ProjectCategoryRow
            title="AI Technologies"
            types={[
              {
                type: 'ai_agent' as const,
                label: 'AI Agents',
                icon: Bot,
                color: 'text-violet-400',
                bgColor: 'bg-violet-500/10',
              },
              {
                type: 'voice_agent' as const,
                label: 'Voice Agents',
                icon: Phone,
                color: 'text-pink-400',
                bgColor: 'bg-pink-500/10',
              },
              {
                type: 'ai_platform' as const,
                label: 'AI Platforms',
                icon: Sparkles,
                color: 'text-indigo-400',
                bgColor: 'bg-indigo-500/10',
              },
            ]}
            projects={projects.filter((p) =>
              ['ai_agent', 'voice_agent', 'ai_platform'].includes(p.project_type || '')
            ) as ProjectData[]}
          />

          {/* SEO Row */}
          <ProjectCategoryRow
            title="SEO & Search Optimization"
            types={[
              {
                type: 'seo' as const,
                label: 'SEO',
                icon: TrendingUp,
                color: 'text-emerald-400',
                bgColor: 'bg-emerald-500/10',
              },
            ]}
            projects={projects.filter((p) => p.project_type === 'seo') as ProjectData[]}
          />

          {/* Web Design Row */}
          <ProjectCategoryRow
            title="Web Design & Development"
            types={[
              {
                type: 'web_design' as const,
                label: 'Websites',
                icon: Globe,
                color: 'text-sky-400',
                bgColor: 'bg-sky-500/10',
              },
            ]}
            projects={projects.filter((p) => p.project_type === 'web_design') as ProjectData[]}
          />

          {/* Marketing Row */}
          <ProjectCategoryRow
            title="Marketing & Advertising"
            types={[
              {
                type: 'ads' as const,
                label: 'Campaigns',
                icon: Megaphone,
                color: 'text-amber-400',
                bgColor: 'bg-amber-500/10',
              },
            ]}
            projects={projects.filter((p) => p.project_type === 'ads') as ProjectData[]}
          />
        </div>

        {/* Demos column on the right */}
        <ProjectColumnView
          title="Demos"
          icon={<Beaker className="h-4 w-4" />}
          projects={demos as ProjectData[]}
          emptyMessage="No demos yet"
          onProjectClick={handleDemoClick}
        />
      </div>

      {/* Finished Projects Section - horizontal showcase row */}
      {hasFinishedProjects && (
        <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <button
            onClick={() => setShowFinishedProjects(!showFinishedProjects)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-emerald-500/5"
          >
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-500" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                Finished Projects
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {finishedProjects.length}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-emerald-500 transition-transform',
                showFinishedProjects && 'rotate-180'
              )}
            />
          </button>
          {showFinishedProjects && (
            <div className="border-t border-emerald-500/10 px-4 pb-4">
              <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-emerald-500/20 flex gap-3 overflow-x-auto py-3">
                {finishedProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="group flex min-w-[200px] max-w-[240px] cursor-pointer items-center gap-3 rounded-lg border border-emerald-500/20 bg-card p-3 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5"
                  >
                    <EntityAvatar
                      src={project.logo_url}
                      fallbackIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      fallbackBgColor="bg-emerald-500/10"
                      fallbackIconColor="text-emerald-500"
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {project.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {project.client_name || 'Internal'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archived Sections */}
      {(hasArchivedDemos || hasArchivedProjects) && (
        <div className="space-y-4">
          {/* Archived Demos */}
          {hasArchivedDemos && (
            <div className="rounded-lg border border-border bg-card">
              <button
                onClick={() => setShowArchivedDemos(!showArchivedDemos)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Archived Demos</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {archivedDemos.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    showArchivedDemos && 'rotate-180'
                  )}
                />
              </button>
              {showArchivedDemos && (
                <div className="border-t border-border p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {archivedDemos.map((demo) => (
                      <div
                        key={demo.id}
                        onClick={() => handleDemoClick(demo as ProjectStatsData)}
                        className="cursor-pointer rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                      >
                        <p className="truncate font-medium text-muted-foreground">{demo.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {demo.status} • {demo.client_name || 'No client'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Archived Projects */}
          {hasArchivedProjects && (
            <div className="rounded-lg border border-border bg-card">
              <button
                onClick={() => setShowArchivedProjects(!showArchivedProjects)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Archived Projects</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {archivedProjects.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    showArchivedProjects && 'rotate-180'
                  )}
                />
              </button>
              {showArchivedProjects && (
                <div className="border-t border-border p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {archivedProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="cursor-pointer rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                      >
                        <p className="truncate font-medium text-muted-foreground">{project.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {project.status} • {project.client_name || 'No client'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <DemoSheet demo={selectedDemo} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
