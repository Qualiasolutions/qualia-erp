/**
 * Centralized color constants for consistent theming across the application
 * Uses dark: prefix for proper light/dark mode support
 */

// Issue Status Colors
export const ISSUE_STATUS_COLORS = {
  'Yet to Start': {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    ring: 'ring-slate-200 dark:ring-slate-500/20',
  },
  Todo: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-200 dark:ring-blue-500/20',
  },
  'In Progress': {
    bg: 'bg-qualia-50 dark:bg-qualia-500/10',
    border: 'border-qualia-200 dark:border-qualia-500/30',
    text: 'text-qualia-700 dark:text-qualia-400',
    ring: 'ring-qualia-200 dark:ring-qualia-500/20',
  },
  Done: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-500/20',
  },
  Canceled: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-500/20',
  },
} as const;

// Issue Priority Colors
export const ISSUE_PRIORITY_COLORS = {
  Low: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    icon: 'text-slate-500',
  },
  Medium: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
    icon: 'text-amber-500',
  },
  High: {
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/30',
    text: 'text-orange-700 dark:text-orange-400',
    icon: 'text-orange-500',
  },
  Urgent: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    icon: 'text-red-500',
  },
} as const;

// Project Status Colors
export const PROJECT_STATUS_COLORS = {
  Planning: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
  },
  Active: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  'On Hold': {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
  Completed: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  Canceled: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
  },
  Demos: {
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400',
  },
  Launched: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  Delayed: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
  },
  Archived: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
  },
} as const;

// Phase Status Colors
export const PHASE_STATUS_COLORS = {
  not_started: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    label: 'Not Started',
  },
  in_progress: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'In Progress',
  },
  completed: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Completed',
  },
  skipped: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Skipped',
  },
} as const;

// Lead Status Colors (CRM)
export const LEAD_STATUS_COLORS = {
  dropped: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
  },
  cold: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
  },
  hot: {
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/30',
    text: 'text-orange-700 dark:text-orange-400',
  },
  active_client: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  inactive_client: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
  dead_lead: {
    bg: 'bg-zinc-100 dark:bg-zinc-500/10',
    border: 'border-zinc-200 dark:border-zinc-500/30',
    text: 'text-zinc-600 dark:text-zinc-400',
  },
} as const;

// Semantic Colors
export const SEMANTIC_COLORS = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    solid: 'bg-emerald-600',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
    solid: 'bg-amber-600',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    solid: 'bg-red-600',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    solid: 'bg-blue-600',
  },
  brand: {
    bg: 'bg-qualia-50 dark:bg-qualia-500/10',
    border: 'border-qualia-200 dark:border-qualia-500/30',
    text: 'text-qualia-700 dark:text-qualia-400',
    solid: 'bg-qualia-600',
  },
} as const;

// Task Status Colors (Inbox/Project Tasks)
export const TASK_STATUS_COLORS = {
  Todo: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    label: 'Todo',
  },
  'In Progress': {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'In Progress',
  },
  Done: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Done',
  },
} as const;

// Task Priority Colors
export const TASK_PRIORITY_COLORS = {
  'No Priority': {
    bg: 'bg-muted',
    border: 'border-muted',
    text: 'text-muted-foreground',
    label: 'None',
  },
  Low: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Low',
  },
  Medium: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Medium',
  },
  High: {
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/30',
    text: 'text-orange-700 dark:text-orange-400',
    label: 'High',
  },
  Urgent: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    label: 'Urgent',
  },
} as const;

// Type exports for TypeScript
export type TaskStatusKey = keyof typeof TASK_STATUS_COLORS;
export type TaskPriorityKey = keyof typeof TASK_PRIORITY_COLORS;
export type IssueStatusKey = keyof typeof ISSUE_STATUS_COLORS;
export type IssuePriorityKey = keyof typeof ISSUE_PRIORITY_COLORS;
export type ProjectStatusKey = keyof typeof PROJECT_STATUS_COLORS;
export type PhaseStatusKey = keyof typeof PHASE_STATUS_COLORS;
export type LeadStatusKey = keyof typeof LEAD_STATUS_COLORS;
export type SemanticColorKey = keyof typeof SEMANTIC_COLORS;

// Schedule Block Colors (Team Daily Schedule)
export const SCHEDULE_BLOCK_COLORS = {
  standup: {
    bg: 'bg-neutral-50 dark:bg-neutral-900/50',
    border: 'border-neutral-200 dark:border-neutral-800',
    text: 'text-neutral-700 dark:text-neutral-300',
    icon: 'text-neutral-500',
    accent: 'bg-neutral-400',
    headerBg: 'bg-neutral-100/50 dark:bg-neutral-800/50',
  },
  focus: {
    bg: 'bg-slate-50 dark:bg-slate-900/50',
    border: 'border-slate-200 dark:border-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    icon: 'text-slate-500',
    accent: 'bg-slate-500',
    headerBg: 'bg-slate-100/50 dark:bg-slate-800/50',
  },
  break: {
    bg: 'bg-stone-50 dark:bg-stone-900/50',
    border: 'border-stone-200 dark:border-stone-800',
    text: 'text-stone-600 dark:text-stone-400',
    icon: 'text-stone-400',
    accent: 'bg-stone-400',
    headerBg: 'bg-stone-100/50 dark:bg-stone-800/50',
  },
  wrapup: {
    bg: 'bg-zinc-50 dark:bg-zinc-900/50',
    border: 'border-zinc-200 dark:border-zinc-800',
    text: 'text-zinc-700 dark:text-zinc-300',
    icon: 'text-zinc-500',
    accent: 'bg-zinc-500',
    headerBg: 'bg-zinc-100/50 dark:bg-zinc-800/50',
  },
} as const;

// Team Member Colors
export const USER_COLORS = {
  fawzi: {
    bg: 'bg-qualia-50 dark:bg-qualia-500/10',
    border: 'border-qualia-200 dark:border-qualia-500/30',
    text: 'text-qualia-700 dark:text-qualia-500',
    dot: 'bg-qualia-500',
    ring: 'ring-qualia-200 dark:ring-qualia-500/30',
  },
  moayad: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    text: 'text-indigo-600 dark:text-indigo-500',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-200 dark:ring-indigo-500/30',
  },
  hasan: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-500',
    dot: 'bg-amber-500',
    ring: 'ring-amber-200 dark:ring-amber-500/30',
  },
} as const;

export type ScheduleBlockType = keyof typeof SCHEDULE_BLOCK_COLORS;
export type UserColorKey = keyof typeof USER_COLORS;

// Phase Badge Colors (for timeline dashboard)
export const PHASE_BADGE_COLORS = {
  Research: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-500',
  },
  Design: {
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-500',
  },
  Build: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-500',
  },
  Test: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-500',
  },
  Deploy: {
    bg: 'bg-qualia-50 dark:bg-qualia-500/10',
    border: 'border-qualia-200 dark:border-qualia-500/30',
    text: 'text-qualia-700 dark:text-qualia-500',
  },
  Script: {
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-500/30',
    text: 'text-violet-600 dark:text-violet-500',
  },
  'Voice Setup': {
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    border: 'border-pink-200 dark:border-pink-500/30',
    text: 'text-pink-600 dark:text-pink-500',
  },
  Integration: {
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/30',
    text: 'text-cyan-700 dark:text-cyan-500',
  },
  Testing: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-500',
  },
  Launch: {
    bg: 'bg-qualia-50 dark:bg-qualia-500/10',
    border: 'border-qualia-200 dark:border-qualia-500/30',
    text: 'text-qualia-700 dark:text-qualia-500',
  },
  Discovery: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-500',
  },
  Wireframes: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    text: 'text-indigo-600 dark:text-indigo-500',
  },
  Development: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-500',
  },
  Audit: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-500',
  },
  Strategy: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-500',
  },
  Implementation: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-500',
  },
  Monitoring: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-500',
  },
  Creative: {
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    border: 'border-pink-200 dark:border-pink-500/30',
    text: 'text-pink-600 dark:text-pink-500',
  },
  Optimize: {
    bg: 'bg-qualia-50 dark:bg-qualia-500/10',
    border: 'border-qualia-200 dark:border-qualia-500/30',
    text: 'text-qualia-700 dark:text-qualia-500',
  },
} as const;

export type PhaseBadgeKey = keyof typeof PHASE_BADGE_COLORS;
