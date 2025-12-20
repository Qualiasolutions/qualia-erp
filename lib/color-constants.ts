/**
 * Centralized color constants for consistent theming across the application
 * Used for status indicators, priority badges, and semantic colors
 */

// Issue Status Colors
export const ISSUE_STATUS_COLORS = {
  'Yet to Start': {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
    ring: 'ring-slate-500/20',
  },
  Todo: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    ring: 'ring-blue-500/20',
  },
  'In Progress': {
    bg: 'bg-qualia-500/10',
    border: 'border-qualia-500/30',
    text: 'text-qualia-400',
    ring: 'ring-qualia-500/20',
  },
  Done: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/20',
  },
  Canceled: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    ring: 'ring-red-500/20',
  },
} as const;

// Issue Priority Colors
export const ISSUE_PRIORITY_COLORS = {
  Low: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
    icon: 'text-slate-500',
  },
  Medium: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: 'text-amber-500',
  },
  High: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    icon: 'text-orange-500',
  },
  Urgent: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: 'text-red-500',
  },
} as const;

// Project Status Colors
export const PROJECT_STATUS_COLORS = {
  Planning: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
  },
  Active: {
    bg: 'bg-qualia-500/10',
    border: 'border-qualia-500/30',
    text: 'text-qualia-400',
  },
  'On Hold': {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  Completed: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  Canceled: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
} as const;

// Phase Status Colors
export const PHASE_STATUS_COLORS = {
  not_started: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
    label: 'Not Started',
  },
  in_progress: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    label: 'In Progress',
  },
  completed: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    label: 'Completed',
  },
  skipped: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    label: 'Skipped',
  },
} as const;

// Lead Status Colors (CRM)
export const LEAD_STATUS_COLORS = {
  dropped: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
  cold: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
  },
  hot: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
  },
  active_client: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  inactive_client: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  dead_lead: {
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    text: 'text-zinc-400',
  },
} as const;

// Semantic Colors
export const SEMANTIC_COLORS = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    solid: 'bg-emerald-600',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    solid: 'bg-amber-600',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    solid: 'bg-red-600',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    solid: 'bg-blue-600',
  },
  brand: {
    bg: 'bg-qualia-500/10',
    border: 'border-qualia-500/30',
    text: 'text-qualia-400',
    solid: 'bg-qualia-600',
  },
} as const;

// Type exports for TypeScript
export type IssueStatusKey = keyof typeof ISSUE_STATUS_COLORS;
export type IssuePriorityKey = keyof typeof ISSUE_PRIORITY_COLORS;
export type ProjectStatusKey = keyof typeof PROJECT_STATUS_COLORS;
export type PhaseStatusKey = keyof typeof PHASE_STATUS_COLORS;
export type LeadStatusKey = keyof typeof LEAD_STATUS_COLORS;
export type SemanticColorKey = keyof typeof SEMANTIC_COLORS;
