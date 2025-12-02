/**
 * Application-wide constants
 */

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Date formats
export const DATE_FORMAT = 'MMM d, yyyy';
export const DATE_TIME_FORMAT = 'MMM d, yyyy h:mm a';
export const TIME_FORMAT = 'h:mm a';
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';

// UI constants
export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const HEADER_HEIGHT = 56;
export const MOBILE_BREAKPOINT = 768;

// API routes
export const API_ROUTES = {
  CHAT: '/api/chat',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'qualia-sidebar-collapsed',
  THEME: 'qualia-theme',
  LAST_WORKSPACE: 'qualia-last-workspace',
} as const;

// Status colors for consistent theming
export const STATUS_COLORS = {
  // Issue statuses
  'Yet to Start': 'bg-slate-500',
  Todo: 'bg-blue-500',
  'In Progress': 'bg-yellow-500',
  Done: 'bg-green-500',
  Canceled: 'bg-red-500',
  // Phase statuses
  not_started: 'bg-slate-500',
  in_progress: 'bg-yellow-500',
  completed: 'bg-green-500',
  skipped: 'bg-gray-500',
  // Lead statuses
  dropped: 'bg-red-500',
  cold: 'bg-blue-500',
  hot: 'bg-orange-500',
  active_client: 'bg-green-500',
  inactive_client: 'bg-slate-500',
} as const;

// Priority colors
export const PRIORITY_COLORS = {
  Urgent: 'text-red-500',
  High: 'text-orange-500',
  Medium: 'text-yellow-500',
  Low: 'text-blue-500',
  'No Priority': 'text-slate-500',
} as const;

// Toast durations (ms)
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
} as const;

// Debounce delays (ms)
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  AUTOSAVE: 1000,
  RESIZE: 150,
} as const;
