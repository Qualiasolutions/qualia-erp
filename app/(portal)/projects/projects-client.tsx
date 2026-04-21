'use client';

import {
  QualiaProjectsGallery,
  type GalleryProject,
} from '@/components/portal/qualia-projects-gallery';
import type { ProjectData } from './page';

interface ProjectsClientProps {
  demos: ProjectData[];
  building: ProjectData[];
  preProduction: ProjectData[];
  live: ProjectData[];
  done: ProjectData[];
  archived: ProjectData[];
  isAdmin?: boolean;
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
}: ProjectsClientProps) {
  const all: GalleryProject[] = [
    ...demos,
    ...building,
    ...preProduction,
    ...live,
    ...done,
    ...archived,
  ].map(toGalleryProject);

  return <QualiaProjectsGallery projects={all} isAdmin={isAdmin} />;
}
