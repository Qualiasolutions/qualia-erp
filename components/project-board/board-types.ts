/**
 * Shared types and constants for the project board components.
 */

export type BoardView = 'board' | 'table' | 'list';

export type BoardTaskAssignee = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  due_date: string | null;
  assignee: BoardTaskAssignee | null;
  project_id: string | null;
  item_type: 'task' | 'issue' | 'note' | 'resource';
  sort_order: number;
};

export type StatusColumnId = 'Todo' | 'In Progress' | 'Done';

export type StatusColumn = {
  id: StatusColumnId;
  label: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
};

/**
 * Status columns for the kanban board.
 * Colors follow DESIGN.md badge patterns:
 *   Todo = amber, In Progress = primary/teal, Done = emerald
 */
export const STATUS_COLUMNS: StatusColumn[] = [
  {
    id: 'Todo',
    label: 'Todo',
    badgeBg: 'bg-amber-50 dark:bg-amber-500/10',
    badgeText: 'text-amber-700 dark:text-amber-400',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'In Progress',
    label: 'In Progress',
    badgeBg: 'bg-primary/10',
    badgeText: 'text-primary',
    dotColor: 'bg-primary',
  },
  {
    id: 'Done',
    label: 'Done',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
];

/**
 * Priority dot colors for task cards.
 * Urgent=red, High=orange, Medium=amber, Low=blue, No Priority=gray
 */
export const PRIORITY_DOT_COLORS: Record<BoardTask['priority'], string> = {
  Urgent: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-blue-500',
  'No Priority': 'bg-gray-400 dark:bg-gray-500',
};
