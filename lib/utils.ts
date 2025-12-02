import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { DATE_FORMAT, DATE_TIME_FORMAT } from './constants';

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatStr = DATE_FORMAT
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, DATE_TIME_FORMAT);
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string | null | undefined, maxLength = 2): string {
  if (!name) return '';
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, maxLength)
    .join('')
    .toUpperCase();
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? singular + 's');
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Check if running on server
 */
export const isServer = typeof window === 'undefined';

/**
 * Check if running on client
 */
export const isClient = !isServer;

/**
 * Sleep for a given duration (useful for testing)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random ID (not cryptographically secure)
 */
export function generateId(length = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

// Environment check
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
