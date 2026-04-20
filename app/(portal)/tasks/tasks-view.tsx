'use client';

import { QualiaTasksList } from '@/components/portal/qualia-tasks-list';
import type { Task } from '@/app/actions/inbox';

export type TasksMode = 'inbox' | 'all-tasks' | 'client';

interface TasksViewProps {
  mode: TasksMode;
  initialTasks: Task[];
  assignableMembers?: Array<{ id: string; full_name: string | null; email: string | null }>;
  userRole?: 'admin' | 'employee' | 'client';
  isAdmin?: boolean;
}

export function TasksView({
  mode,
  initialTasks,
  assignableMembers = [],
  userRole = 'employee',
  isAdmin = false,
}: TasksViewProps) {
  return (
    <QualiaTasksList
      mode={mode}
      initialTasks={initialTasks}
      userRole={userRole}
      isAdmin={isAdmin}
      assignableMembers={assignableMembers}
    />
  );
}
