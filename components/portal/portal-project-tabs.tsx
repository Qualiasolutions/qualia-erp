'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getProjectStatusColor } from '@/lib/portal-styles';
import { PortalRoadmap } from '@/components/portal/portal-roadmap';
import { PortalFileList } from '@/components/portal/portal-file-list';
import { PortalClientUpload } from '@/components/portal/portal-client-upload';
import { PortalActivityFeed } from '@/components/portal/portal-activity-feed';
import { getProjectFiles } from '@/app/actions/project-files';
import { getProjectActivityFeed } from '@/app/actions/activity-feed';
import type { ProjectFileWithUploader } from '@/app/actions/project-files';
import type { ActivityLogEntry } from '@/lib/activity-utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  Circle,
  Loader2,
  LayoutDashboard,
  Map,
  LayoutGrid,
  FileText,
  Bell,
} from 'lucide-react';
import { ProjectBoard } from '@/components/project-board/project-board';

type TabId = 'overview' | 'roadmap' | 'board' | 'files' | 'updates';

interface Phase {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
  description: string | null;
  order_index: number;
  items?: Array<{
    id: string;
    title: string;
    description: string | null;
    display_order: number | null;
    is_completed: boolean;
    completed_at: string | null;
    status: string | null;
  }>;
}

interface Project {
  id: string;
  name: string;
  project_status: string;
  description: string | null;
}

interface PortalProjectTabsProps {
  project: Project;
  phases: Phase[];
  userRole: string;
  currentUserId: string;
  isLoading: boolean;
  isValidating: boolean;
  projectId: string;
}

const tabs: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'updates', label: 'Updates', icon: Bell },
];

function getPhaseStatusIndicator(status: string) {
  if (status === 'completed' || status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (status === 'in_progress' || status === 'active') {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground/30" />;
}

export function PortalProjectTabs({
  project,
  phases,
  userRole,
  currentUserId,
  isLoading,
  isValidating,
  projectId,
}: PortalProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Files state — fetch lazily when tab is activated
  const [files, setFiles] = useState<ProjectFileWithUploader[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);

  // Updates state — fetch lazily when tab is activated
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Fetch files when Files tab is first selected
  useEffect(() => {
    if (activeTab === 'files' && !filesLoaded && !filesLoading) {
      setFilesLoading(true);
      getProjectFiles(projectId, true)
        .then((data) => {
          setFiles(data);
          setFilesLoaded(true);
        })
        .catch((err) => {
          console.error('[PortalProjectTabs] Failed to fetch files:', err);
          setFilesLoaded(true);
        })
        .finally(() => setFilesLoading(false));
    }
  }, [activeTab, projectId, filesLoaded, filesLoading]);

  // Fetch activities when Updates tab is first selected
  useEffect(() => {
    if (activeTab === 'updates' && !activitiesLoaded && !activitiesLoading) {
      setActivitiesLoading(true);
      getProjectActivityFeed(projectId, true, 20)
        .then((result) => {
          if (result.success && result.data) {
            const responseData = result.data as {
              items: ActivityLogEntry[];
              hasMore: boolean;
              nextCursor: string | null;
            };
            // Normalize actor FK
            const normalized = responseData.items.map((entry) => ({
              ...entry,
              actor: Array.isArray(entry.actor) ? entry.actor[0] || null : entry.actor,
            }));
            setActivities(normalized);
          }
          setActivitiesLoaded(true);
        })
        .catch((err) => {
          console.error('[PortalProjectTabs] Failed to fetch activities:', err);
          setActivitiesLoaded(true);
        })
        .finally(() => setActivitiesLoading(false));
    }
  }, [activeTab, projectId, activitiesLoaded, activitiesLoading]);

  // Callback for file upload
  const handleFileUploadComplete = () => {
    setFilesLoaded(false); // Force re-fetch
  };

  // Compute phase progress
  const totalPhases = phases.length;
  const completedPhases = phases.filter(
    (p) => p.status === 'completed' || p.status === 'done'
  ).length;
  const overallProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  return (
    <div>
      {/* Tab bar */}
      <nav className="border-b border-border" aria-label="Project tabs">
        <div className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex cursor-pointer items-center gap-2 pb-3 text-sm transition-colors duration-150',
                  isActive
                    ? 'font-medium text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab
            project={project}
            phases={phases}
            totalPhases={totalPhases}
            completedPhases={completedPhases}
            overallProgress={overallProgress}
          />
        )}

        {activeTab === 'roadmap' && (
          <PortalRoadmap
            project={project}
            phases={phases}
            userRole={userRole as 'client' | 'admin'}
            currentUserId={currentUserId}
            isLoading={isLoading}
            isValidating={isValidating}
          />
        )}

        {activeTab === 'board' && <ProjectBoard projectId={projectId} userRole={userRole} />}

        {activeTab === 'files' && (
          <FilesTab
            projectId={projectId}
            files={files}
            isLoading={filesLoading}
            onUploadComplete={handleFileUploadComplete}
          />
        )}

        {activeTab === 'updates' && (
          <UpdatesTab projectId={projectId} activities={activities} isLoading={activitiesLoading} />
        )}
      </div>
    </div>
  );
}

/* ─── Overview Tab ─────────────────────────────────────────────────────────── */

function OverviewTab({
  project,
  phases,
  totalPhases,
  completedPhases,
  overallProgress,
}: {
  project: Project;
  phases: Phase[];
  totalPhases: number;
  completedPhases: number;
  overallProgress: number;
}) {
  return (
    <div className="space-y-4">
      {/* Project info card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{project.name}</h2>
            {project.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <Badge
            className={cn(
              'shrink-0 border px-2 py-0.5 text-xs',
              getProjectStatusColor(project.project_status)
            )}
          >
            {project.project_status}
          </Badge>
        </div>
      </div>

      {/* Phase progress card */}
      {totalPhases > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold text-foreground">Progress</h3>

          {/* Overall progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/30">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums text-primary">
              {overallProgress}%
            </span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {completedPhases} of {totalPhases} phases completed
          </p>

          {/* Phase list */}
          <ul className="mt-4 space-y-2.5" role="list">
            {phases.map((phase) => (
              <li key={phase.id} className="flex items-center gap-3">
                {getPhaseStatusIndicator(phase.status)}
                <span
                  className={cn(
                    'text-sm',
                    phase.status === 'completed' || phase.status === 'done'
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  )}
                >
                  {phase.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Files Tab ────────────────────────────────────────────────────────────── */

function FilesTab({
  projectId,
  files,
  isLoading,
  onUploadComplete,
}: {
  projectId: string;
  files: ProjectFileWithUploader[];
  isLoading: boolean;
  onUploadComplete: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Share a file with your team</h3>
        <PortalClientUpload projectId={projectId} onUploadComplete={onUploadComplete} />
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4">
        <p className="text-sm text-qualia-800 dark:text-primary/80">
          Files shared by your team appear below.
        </p>
      </div>

      {/* File list */}
      <PortalFileList files={files} />
    </div>
  );
}

/* ─── Updates Tab ──────────────────────────────────────────────────────────── */

function UpdatesTab({
  projectId,
  activities,
  isLoading,
}: {
  projectId: string;
  activities: ActivityLogEntry[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48 rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4">
        <p className="text-sm text-qualia-800 dark:text-primary/80">
          Track the latest updates, milestones, and activities on your project.
        </p>
      </div>

      <PortalActivityFeed activities={activities} projectId={projectId} />
    </div>
  );
}
