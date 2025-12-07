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
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
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
import { KanbanColumn } from './kanban-column';
import { KanbanCard, type KanbanTask } from './kanban-card';
import { QuickTaskModal } from './quick-task-modal';
import { IssueDetailModal } from './issue-detail-modal';
import { getHubTasks, updateIssue } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';
import { STATUS_COLUMNS, PRIORITY_OPTIONS } from '@/lib/constants/task-config';

interface KanbanBoardProps {
  workspaceId: string;
}

export function KanbanBoard({ workspaceId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [overId, setOverId] = useState<string | null>(null);

  // Filter state
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load tasks
  const loadTasks = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const data = await getHubTasks(workspaceId, { limit: 100 });
        setTasks(data as KanbanTask[]);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [workspaceId]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Filter tasks based on active filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by "My Tasks" - tasks assigned to current user
    if (showMyTasks && currentUserId) {
      result = result.filter((task) => task.assignees?.some((a) => a.id === currentUserId));
    }

    // Filter by selected priorities
    if (selectedPriorities.length > 0) {
      result = result.filter((task) => selectedPriorities.includes(task.priority));
    }

    return result;
  }, [tasks, showMyTasks, currentUserId, selectedPriorities]);

  // Check if any filters are active
  const hasActiveFilters = showMyTasks || selectedPriorities.length > 0;

  // Clear all filters
  const clearFilters = useCallback(() => {
    setShowMyTasks(false);
    setSelectedPriorities([]);
  }, []);

  // Toggle priority filter
  const togglePriority = useCallback((priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  }, []);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {};
    STATUS_COLUMNS.forEach((col) => {
      grouped[col.id] = filteredTasks.filter((t) => t.status === col.id);
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
    const { over } = event;
    setOverId(over?.id as string | null);
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

      // Determine target status
      let targetStatus: string | null = null;

      // Check if dropped on a column
      if (STATUS_COLUMNS.some((col) => col.id === over.id)) {
        targetStatus = over.id as string;
      }
      // Check if dropped on a task - get its column
      else {
        const targetTask = tasks.find((t) => t.id === over.id);
        if (targetTask) {
          targetStatus = targetTask.status;
        }
      }

      // If no status change, return
      if (!targetStatus || targetStatus === task.status) return;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus as string } : t))
      );

      // Persist change
      const formData = new FormData();
      formData.append('id', taskId);
      formData.append('status', targetStatus);

      const result = await updateIssue(formData);
      if (!result.success) {
        // Revert on failure
        loadTasks();
        console.error('Failed to update task status:', result.error);
      }
    },
    [tasks, loadTasks]
  );

  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  }, []);

  const handleTaskCreated = useCallback(() => {
    setIsModalOpen(false);
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
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Board Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Task Board</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {filteredTasks.length}
            {hasActiveFilters ? ` of ${tasks.length}` : ''} tasks
          </span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              <X className="h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={() => loadTasks(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant={showMyTasks ? 'secondary' : 'ghost'}
            size="sm"
            className={cn('h-8 gap-1.5', showMyTasks ? 'text-qualia-500' : 'text-muted-foreground')}
            onClick={() => setShowMyTasks(!showMyTasks)}
          >
            <User className="h-3.5 w-3.5" />
            My Tasks
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={selectedPriorities.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 gap-1.5',
                  selectedPriorities.length > 0 ? 'text-qualia-500' : 'text-muted-foreground'
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Priority
                {selectedPriorities.length > 0 && (
                  <span className="ml-1 rounded-full bg-qualia-500/20 px-1.5 text-[10px] font-medium">
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
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-qualia-600 hover:bg-qualia-500"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-4">
          {STATUS_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              lightColor={column.lightColor}
              tasks={tasksByStatus[column.id] || []}
              onTaskClick={handleTaskClick}
              isOver={overId === column.id}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}
            >
              {activeTask ? <KanbanCard task={activeTask} onClick={() => {}} isOverlay /> : null}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      {/* Quick Task Modal */}
      <QuickTaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workspaceId={workspaceId}
        onCreated={handleTaskCreated}
      />

      {/* Issue Detail Modal */}
      <IssueDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        issueId={selectedTaskId}
        workspaceId={workspaceId}
        onUpdate={handleTaskUpdated}
      />
    </div>
  );
}
