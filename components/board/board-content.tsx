'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { Plus, Loader2, Filter, RefreshCw, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BoardColumn } from './board-column';
import { BoardCard, type BoardTask } from './board-card';
import { CreateTaskModal } from './create-task-modal';
import { TaskDetailModal } from './task-detail-modal';
import { OnlineUsers } from './online-users';
import { getBoardTasks, updateIssue } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';

const PRIORITY_OPTIONS = ['Urgent', 'High', 'Medium', 'Low', 'No Priority'] as const;

const STATUS_COLUMNS = [
  { id: 'Yet to Start', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'Todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'In Progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'Done', title: 'Done', color: 'bg-emerald-500' },
] as const;

interface BoardContentProps {
  workspaceId: string;
  userId: string;
}

export function BoardContent({ workspaceId, userId }: BoardContentProps) {
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [overId, setOverId] = useState<string | null>(null);

  // Filters
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load tasks
  const loadTasks = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const data = await getBoardTasks(workspaceId);
        setTasks(data as BoardTask[]);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [workspaceId]
  );

  // Set up real-time subscription
  useEffect(() => {
    loadTasks();

    const supabase = createClient();
    const realtimeChannel = supabase
      .channel(`board:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadTasks(true);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [workspaceId, loadTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (showMyTasks) {
      result = result.filter(
        (task) => task.assignees?.some((a) => a.id === userId) || task.creator_id === userId
      );
    }

    if (selectedPriorities.length > 0) {
      result = result.filter((task) => selectedPriorities.includes(task.priority));
    }

    return result;
  }, [tasks, showMyTasks, userId, selectedPriorities]);

  const hasActiveFilters = showMyTasks || selectedPriorities.length > 0;

  const clearFilters = useCallback(() => {
    setShowMyTasks(false);
    setSelectedPriorities([]);
  }, []);

  const togglePriority = useCallback((priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  }, []);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, BoardTask[]> = {};
    STATUS_COLUMNS.forEach((col) => {
      grouped[col.id] = filteredTasks
        .filter((t) => t.status === col.id)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    });
    return grouped;
  }, [filteredTasks]);

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId((event.over?.id as string) || null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverId(null);

      if (!over) return;

      const taskId = active.id as string;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      let targetStatus: string | null = null;

      if (STATUS_COLUMNS.some((col) => col.id === over.id)) {
        targetStatus = over.id as string;
      } else {
        const targetTask = tasks.find((t) => t.id === over.id);
        if (targetTask) targetStatus = targetTask.status;
      }

      if (!targetStatus || targetStatus === task.status) return;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus as string } : t))
      );

      // Persist
      const formData = new FormData();
      formData.set('id', taskId);
      formData.set('status', targetStatus);

      const result = await updateIssue(formData);
      if (!result.success) {
        loadTasks();
        console.error('Failed to update task:', result.error);
      }
    },
    [tasks, loadTasks]
  );

  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  }, []);

  const handleTaskCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    loadTasks(true);
  }, [loadTasks]);

  const handleTaskUpdated = useCallback(() => {
    loadTasks(true);
  }, [loadTasks]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-qualia-500" />
          <p className="text-sm text-muted-foreground">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold">Board</h1>
            <p className="text-sm text-muted-foreground">
              {filteredTasks.length}
              {hasActiveFilters ? ` of ${tasks.length}` : ''} tasks
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Online Users */}
          <OnlineUsers workspaceId={workspaceId} currentUserId={userId} />

          <div className="h-6 w-px bg-border" />

          {/* Refresh */}
          <Button variant="ghost" size="sm" onClick={() => loadTasks(true)} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>

          {/* My Tasks Filter */}
          <Button
            variant={showMyTasks ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowMyTasks(!showMyTasks)}
            className={cn(showMyTasks && 'text-qualia-500')}
          >
            <User className="mr-1.5 h-4 w-4" />
            My Tasks
          </Button>

          {/* Priority Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={selectedPriorities.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(selectedPriorities.length > 0 && 'text-qualia-500')}
              >
                <Filter className="mr-1.5 h-4 w-4" />
                Priority
                {selectedPriorities.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-qualia-500/20 px-1.5 text-[10px] font-semibold">
                    {selectedPriorities.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PRIORITY_OPTIONS.map((priority) => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={selectedPriorities.includes(priority)}
                  onCheckedChange={() => togglePriority(priority)}
                >
                  {priority}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-border" />

          {/* Create Task */}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-qualia-600 hover:bg-qualia-500"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Task
          </Button>
        </div>
      </header>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {STATUS_COLUMNS.map((column) => (
            <BoardColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByStatus[column.id] || []}
              onTaskClick={handleTaskClick}
              isOver={overId === column.id}
            />
          ))}
        </div>

        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}
            >
              {activeTask && <BoardCard task={activeTask} onClick={() => {}} isOverlay />}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      {/* Modals */}
      <CreateTaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        workspaceId={workspaceId}
        onCreated={handleTaskCreated}
      />

      <TaskDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        taskId={selectedTaskId}
        workspaceId={workspaceId}
        onUpdate={handleTaskUpdated}
      />
    </div>
  );
}
