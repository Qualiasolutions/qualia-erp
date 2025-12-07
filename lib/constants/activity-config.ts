import {
  CheckCircle2,
  MessageSquare,
  FolderPlus,
  UserPlus,
  CalendarPlus,
  FileEdit,
  Users,
  Activity,
  type LucideIcon,
} from 'lucide-react';

export type ActivityConfigItem = {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
};

/**
 * Configuration for activity feed items
 */
export const ACTIVITY_CONFIG: Record<string, ActivityConfigItem> = {
  project_created: {
    icon: FolderPlus,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    label: 'created project',
  },
  project_updated: {
    icon: FileEdit,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'updated project',
  },
  issue_created: {
    icon: FolderPlus,
    color: 'text-qualia-500',
    bgColor: 'bg-qualia-500/10',
    label: 'created task',
  },
  issue_updated: {
    icon: FileEdit,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'updated task',
  },
  issue_completed: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    label: 'completed task',
  },
  issue_assigned: {
    icon: UserPlus,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    label: 'assigned task',
  },
  comment_added: {
    icon: MessageSquare,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: 'commented on',
  },
  team_created: {
    icon: Users,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    label: 'created team',
  },
  member_added: {
    icon: UserPlus,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    label: 'added member',
  },
  meeting_created: {
    icon: CalendarPlus,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    label: 'scheduled meeting',
  },
};

/**
 * Default activity config for unknown activity types
 */
export const DEFAULT_ACTIVITY_CONFIG: ActivityConfigItem = {
  icon: Activity,
  color: 'text-muted-foreground',
  bgColor: 'bg-muted',
  label: 'performed action',
};

/**
 * Get activity config for a given activity type
 */
export function getActivityConfig(type: string): ActivityConfigItem {
  return ACTIVITY_CONFIG[type] || DEFAULT_ACTIVITY_CONFIG;
}
