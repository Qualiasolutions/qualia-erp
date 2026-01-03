'use client';

import { memo } from 'react';
import { Bot, ChevronRight, Globe, Megaphone, Mic, FolderKanban } from 'lucide-react';
import type { FocusProject } from '@/app/actions/daily-flow';
import type { Task } from '@/app/actions/inbox';
import type { DailyMeeting } from '@/app/actions/daily-flow';

// Project type icons
const PROJECT_TYPE_ICONS: Record<string, typeof Globe> = {
  web_design: Globe,
  ai_agent: Bot,
  voice_agent: Mic,
  seo: FolderKanban,
  ads: Megaphone,
};

interface ProjectFocusBarProps {
  project: FocusProject | null;
  tasks: Task[];
  meetings: DailyMeeting[];
  onSwitchProject?: () => void;
}

/**
 * Get task count for focus project
 */
function getProjectTaskCount(tasks: Task[], projectId: string | null): number {
  if (!projectId) return 0;
  return tasks.filter((t) => t.project_id === projectId).length;
}

/**
 * Get meeting count for focus project
 */
function getProjectMeetingCount(meetings: DailyMeeting[], projectId: string | null): number {
  if (!projectId) return 0;
  return meetings.filter((m) => m.project?.id === projectId).length;
}

/**
 * Project focus bar - minimal, clean design
 */
export const ProjectFocusBar = memo(function ProjectFocusBar({
  project,
  tasks,
  meetings,
  onSwitchProject,
}: ProjectFocusBarProps) {
  if (!project) {
    return (
      <button
        onClick={onSwitchProject}
        className="flex w-full items-center justify-between rounded border border-dashed border-border/60 p-4 text-left transition-colors hover:border-foreground/30 dark:border-border"
      >
        <div className="flex items-center gap-3">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Select a focus project</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  const Icon = PROJECT_TYPE_ICONS[project.project_type || ''] || FolderKanban;
  const taskCount = getProjectTaskCount(tasks, project.id);
  const meetingCount = getProjectMeetingCount(meetings, project.id);

  return (
    <div className="flex items-center gap-4 rounded border border-border/60 bg-card p-4 dark:border-border">
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
        <Icon className="h-4 w-4 text-foreground" />
      </div>

      {/* Project info */}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Focus Project
        </div>
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{project.name}</h3>
          {project.client && (
            <>
              <span className="text-border">·</span>
              <span className="truncate text-xs text-muted-foreground">
                {project.client.display_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="hidden w-28 shrink-0 sm:block">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Progress
          </span>
          <span className="text-xs font-medium text-foreground">{project.progress}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="hidden items-center gap-3 border-l border-border/60 pl-4 dark:border-border sm:flex">
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">{taskCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">{meetingCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Meetings</div>
        </div>
      </div>

      {/* Switch */}
      <button
        onClick={onSwitchProject}
        className="shrink-0 rounded px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Switch
      </button>
    </div>
  );
});

export default ProjectFocusBar;
