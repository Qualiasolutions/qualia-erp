import {
  Circle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Minus,
  type LucideIcon,
} from 'lucide-react';

/**
 * Status column configuration for Kanban board
 */
export const STATUS_COLUMNS = [
  {
    id: 'Yet to Start',
    title: 'Backlog',
    color: 'bg-slate-500',
    lightColor: 'bg-slate-500/10',
  },
  {
    id: 'Todo',
    title: 'To Do',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-500/10',
  },
  {
    id: 'In Progress',
    title: 'In Progress',
    color: 'bg-amber-500',
    lightColor: 'bg-amber-500/10',
  },
  {
    id: 'Done',
    title: 'Done',
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-500/10',
  },
] as const;

export type StatusColumnId = (typeof STATUS_COLUMNS)[number]['id'];

/**
 * Status icon and color configuration
 */
export const STATUS_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  'Yet to Start': { icon: Circle, color: 'text-slate-500' },
  Todo: { icon: Circle, color: 'text-blue-500' },
  'In Progress': { icon: Clock, color: 'text-amber-500' },
  Done: { icon: CheckCircle2, color: 'text-emerald-500' },
  Canceled: { icon: XCircle, color: 'text-red-500' },
};

/**
 * Priority configuration with colors, icons, and labels
 */
export const PRIORITY_CONFIG: Record<
  string,
  { color: string; bgColor: string; borderColor: string; icon: LucideIcon; label: string }
> = {
  Urgent: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: AlertTriangle,
    label: 'Urgent',
  },
  High: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    icon: AlertCircle,
    label: 'High',
  },
  Medium: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    icon: Minus,
    label: 'Medium',
  },
  Low: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    icon: Circle,
    label: 'Low',
  },
  'No Priority': {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    icon: Minus,
    label: 'None',
  },
};

/**
 * Get priority config with fallback
 */
export function getPriorityConfig(priority: string) {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['No Priority'];
}

/**
 * All priority options
 */
export const PRIORITY_OPTIONS = ['Urgent', 'High', 'Medium', 'Low', 'No Priority'] as const;

export type Priority = (typeof PRIORITY_OPTIONS)[number];

/**
 * All status options
 */
export const STATUS_OPTIONS = ['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'] as const;

export type Status = (typeof STATUS_OPTIONS)[number];
