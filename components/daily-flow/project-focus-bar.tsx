'use client';

import { memo } from 'react';
import {
  Bot,
  ChevronDown,
  Globe,
  Megaphone,
  Mic,
  FolderKanban,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
 * Get task count for today related to focus project
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
 * Project focus bar showing current active project
 */
export const ProjectFocusBar = memo(function ProjectFocusBar({
  project,
  tasks,
  meetings,
  onSwitchProject,
}: ProjectFocusBarProps) {
  if (!project) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-border/50 bg-muted/20 p-4">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No active project selected</span>
        </div>
        <button
          onClick={onSwitchProject}
          className="text-xs font-medium text-qualia-500 transition-colors hover:text-qualia-400"
        >
          Select Project
        </button>
      </div>
    );
  }

  const Icon = PROJECT_TYPE_ICONS[project.project_type || ''] || FolderKanban;
  const taskCount = getProjectTaskCount(tasks, project.id);
  const meetingCount = getProjectMeetingCount(meetings, project.id);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-gradient-to-r from-qualia-500/5 via-transparent to-transparent p-4">
      {/* Project icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-qualia-500/10">
        <Icon className="h-5 w-5 text-qualia-500" />
      </div>

      {/* Project info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Focus
          </span>
        </div>
        <h3 className="truncate font-semibold text-foreground">{project.name}</h3>
        {project.client && (
          <span className="text-xs text-muted-foreground">{project.client.display_name}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-32 flex-shrink-0">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Progress</span>
          <span className="text-xs font-semibold text-qualia-500">{project.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-qualia-400 to-qualia-500 transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 border-l border-border/50 pl-4">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{taskCount}</span>
          <span className="text-xs text-muted-foreground">tasks</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{meetingCount}</span>
          <span className="text-xs text-muted-foreground">meetings</span>
        </div>
      </div>

      {/* Switch project dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
            Switch
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onSwitchProject}>View all projects</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export default ProjectFocusBar;
