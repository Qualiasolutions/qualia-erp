'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, Trash2, Search, Filter, Menu, ListTodo } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getTasks, adminMarkTaskDone, deleteTask, type Task } from '@/app/actions/inbox';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Todo: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  'In Progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Done: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'No Priority': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export function AdminTasksClient() {
  const { toggleMobile } = useSidebar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const fetchTasks = useCallback(async () => {
    const allTasks = await getTasks(null, {});
    setTasks(allTasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Get unique assignees for filter
  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => {
      if (t.assignee) {
        map.set(t.assignee.id, t.assignee.full_name || t.assignee.email || 'Unknown');
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  // Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      // Status filter
      if (statusFilter === 'active' && t.status === 'Done') return false;
      if (statusFilter !== 'active' && statusFilter !== 'all' && t.status !== statusFilter)
        return false;

      // Assignee filter
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned' && t.assignee_id) return false;
        if (assigneeFilter !== 'unassigned' && t.assignee_id !== assigneeFilter) return false;
      }

      // Search
      if (search) {
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.assignee?.full_name?.toLowerCase().includes(q) ||
          t.project?.name?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tasks, statusFilter, assigneeFilter, search]);

  const handleMarkDone = async (taskId: string) => {
    setActionLoading(taskId);
    const result = await adminMarkTaskDone(taskId);
    if (result.success) {
      toast.success('Task marked as done');
      fetchTasks();
    } else {
      toast.error(result.error || 'Failed to mark task done');
    }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setActionLoading(pendingDelete.id);
    const result = await deleteTask(pendingDelete.id);
    if (result.success) {
      toast.success('Task deleted');
      fetchTasks();
    } else {
      toast.error(result.error || 'Failed to delete task');
    }
    setActionLoading(null);
    setPendingDelete(null);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status !== 'Done').length;
  const doneTasks = tasks.filter((t) => t.status === 'Done').length;

  return (
    <div className="flex h-full flex-col">
      {/* Mobile top bar */}
      <header className="flex items-center gap-2 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={toggleMobile}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <ListTodo className="h-3.5 w-3.5 text-primary" />
        </div>
        <h1 className="text-sm font-semibold text-foreground">Task Management</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Task Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTasks} active / {doneTasks} completed / {tasks.length} total
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks, assignees, projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Todo">Todo</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assignees.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task table */}
        <div className="rounded-xl border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ListTodo className="mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">No tasks match your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%]">Task</TableHead>
                  <TableHead className="hidden sm:table-cell">Assignee</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Priority</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => (
                  <TableRow key={task.id} className={task.status === 'Done' ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        {/* Mobile-only: show assignee inline */}
                        <p className="truncate text-xs text-muted-foreground sm:hidden">
                          {task.assignee?.full_name || 'Unassigned'}
                          {task.project ? ` / ${task.project.name}` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {task.assignee?.full_name || (
                          <span className="italic opacity-50">Unassigned</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="block max-w-[150px] truncate text-sm text-muted-foreground">
                        {task.project?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[task.status] || ''}`}
                      >
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant="outline"
                        className={`text-xs ${PRIORITY_COLORS[task.priority] || ''}`}
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {task.status !== 'Done' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-muted-foreground hover:text-emerald-500"
                            onClick={() => handleMarkDone(task.id)}
                            disabled={actionLoading === task.id}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Done</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDelete({ id: task.id, title: task.title })}
                          disabled={actionLoading === task.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {tasks.length} tasks
        </p>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete task permanently?"
        description={`"${pendingDelete?.title ?? ''}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
