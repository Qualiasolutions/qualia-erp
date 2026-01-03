import type { Task } from '@/app/actions/inbox';
import type { TeamMember } from '@/app/actions/daily-flow';

/**
 * Get tasks grouped by team member
 */
export function groupTasksByMember(tasks: Task[], teamMembers: TeamMember[]): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();

  // Initialize with empty arrays for each team member
  for (const member of teamMembers) {
    grouped.set(member.id, []);
  }

  // Also track unassigned tasks
  grouped.set('unassigned', []);

  // Group tasks
  for (const task of tasks) {
    if (task.assignee_id && grouped.has(task.assignee_id)) {
      grouped.get(task.assignee_id)!.push(task);
    } else {
      grouped.get('unassigned')!.push(task);
    }
  }

  return grouped;
}

/**
 * Get the current task (In Progress) for a team member
 */
export function getCurrentTask(tasks: Task[], memberId: string): Task | null {
  return tasks.find((t) => t.assignee_id === memberId && t.status === 'In Progress') || null;
}

/**
 * Get upcoming tasks (Todo) for a team member, sorted by priority
 */
export function getUpcomingTasks(tasks: Task[], memberId: string, limit = 3): Task[] {
  return tasks
    .filter((t) => t.assignee_id === memberId && t.status === 'Todo')
    .sort((a, b) => {
      // Sort by due date first, then by sort_order
      if (a.due_date && b.due_date) {
        return a.due_date.localeCompare(b.due_date);
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return a.sort_order - b.sort_order;
    })
    .slice(0, limit);
}
