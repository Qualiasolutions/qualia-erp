/**
 * All status options
 */
export const STATUS_OPTIONS = ['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'] as const;

export type Status = (typeof STATUS_OPTIONS)[number];

/**
 * All priority options
 */
export const PRIORITY_OPTIONS = ['Urgent', 'High', 'Medium', 'Low', 'No Priority'] as const;

export type Priority = (typeof PRIORITY_OPTIONS)[number];
