'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import {
  QualiaProjectsGallery,
  type GalleryProject,
} from '@/components/portal/qualia-projects-gallery';
import type { ProjectData } from './page';

type MissingProjectFilter = 'target_date' | 'phase_dates';

interface ProjectsClientProps {
  demos: ProjectData[];
  building: ProjectData[];
  preProduction: ProjectData[];
  live: ProjectData[];
  done: ProjectData[];
  archived: ProjectData[];
  isAdmin?: boolean;
  expandTerminalGroups?: boolean;
  missingFilter?: MissingProjectFilter;
}

function toGalleryProject(p: ProjectData): GalleryProject {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    start_date: p.start_date,
    target_date: p.target_date,
    project_type: p.project_type,
    client_id: p.client_id,
    client_name: p.client_name,
    logo_url: p.logo_url,
    issue_stats: p.issue_stats,
    roadmap_progress: p.roadmap_progress,
    is_pre_production: p.is_pre_production,
    team: p.team,
  };
}

export function ProjectsClient({
  demos,
  building,
  preProduction,
  live,
  done,
  archived,
  isAdmin,
  expandTerminalGroups,
  missingFilter,
}: ProjectsClientProps) {
  const all: GalleryProject[] = [
    ...demos,
    ...building,
    ...preProduction,
    ...live,
    ...done,
    ...archived,
  ].map(toGalleryProject);

  const missingLabel =
    missingFilter === 'target_date'
      ? 'Active projects without target dates'
      : missingFilter === 'phase_dates'
        ? 'Projects with phases missing dates'
        : null;

  const missingDescription =
    missingFilter === 'target_date'
      ? 'Set a target date on each active project so delivery commitments are visible.'
      : missingFilter === 'phase_dates'
        ? 'Open each project roadmap and add start/target dates to active phases.'
        : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {missingFilter && missingLabel && missingDescription ? (
        <div className="flex shrink-0 items-start gap-3 border-b border-amber-500/20 bg-amber-500/[0.05] px-5 py-3 lg:px-6">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">{missingLabel}</div>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{missingDescription}</p>
          </div>
          <Link
            href="/projects"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-background"
          >
            Clear
          </Link>
        </div>
      ) : null}
      <QualiaProjectsGallery
        projects={all}
        isAdmin={isAdmin}
        expandTerminalGroups={expandTerminalGroups}
      />
    </div>
  );
}
