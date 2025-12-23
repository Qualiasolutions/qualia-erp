'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import {
  Plus,
  GripVertical,
  MoreVertical,
  Trash2,
  Inbox,
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Bug,
  StickyNote,
  Bookmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createTask, deleteTask, reorderTasks, toggleTaskInbox } from '@/app/actions/inbox';
import type { Task } from '@/app/actions/inbox';
import { useProjectTasks, invalidateProjectTasks, invalidateInboxTasks } from '@/lib/swr';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type ItemType = 'task' | 'issue' | 'note' | 'resource';
type TaskStatus = 'Todo' | 'In Progress' | 'Done';

// Item type configuration with premium colors
const ITEM_TYPE_CONFIG: Record<
  ItemType,
  {
    icon: typeof ListTodo;
    label: string;
    pluralLabel: string;
    color: string;
    bgColor: string;
    borderColor: string;
    gradientFrom: string;
    gradientTo: string;
    accentColor: string;
  }
> = {
  task: {
    icon: ListTodo,
    label: 'Task',
    pluralLabel: 'Tasks',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    gradientFrom: 'from-violet-500/20',
    gradientTo: 'to-violet-600/10',
    accentColor: 'bg-violet-500',
  },
  issue: {
    icon: Bug,
    label: 'Issue',
    pluralLabel: 'Issues',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    gradientFrom: 'from-rose-500/20',
    gradientTo: 'to-rose-600/10',
    accentColor: 'bg-rose-500',
  },
  note: {
    icon: StickyNote,
    label: 'Note',
    pluralLabel: 'Notes',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-amber-600/10',
    accentColor: 'bg-amber-500',
  },
  resource: {
    icon: Bookmark,
    label: 'Resource',
    pluralLabel: 'Resources',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    gradientFrom: 'from-sky-500/20',
    gradientTo: 'to-sky-600/10',
    accentColor: 'bg-sky-500',
  },
};

// Status icons and colors
const STATUS_CONFIG: Record<TaskStatus, { icon: typeof Circle; color: string; bgColor: string }> = {
  Todo: {
    icon: Circle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
  },
  'In Progress': {
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  Done: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
};

// Task already has item_type from the updated type definition

interface ItemCardProps {
  task: Task;
  onDelete: () => void;
  onToggleInbox: () => void;
  isDragging?: boolean;
}

// Premium Item Card with glass morphism effect
const ItemCard = memo(function ItemCard({
  task,
  onDelete,
  onToggleInbox,
  isDragging,
}: ItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: task.id });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition]
  );

  const dragging = isDragging || sortableDragging;
  const itemType = (task.item_type as ItemType) || 'task';
  const typeConfig = ITEM_TYPE_CONFIG[itemType];
  const statusConfig = STATUS_CONFIG[task.status as TaskStatus] || STATUS_CONFIG.Todo;
  const StatusIcon = statusConfig.icon;
  const isDone = task.status === 'Done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 bg-card/80 backdrop-blur-sm transition-all duration-300',
        'shadow-sm hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30',
        'hover:-translate-y-0.5 hover:border-primary/40',
        typeConfig.borderColor,
        dragging && 'z-50 rotate-2 scale-[0.98] opacity-70 shadow-2xl ring-2 ring-primary/50',
        isDone && 'opacity-60'
      )}
    >
      {/* Gradient accent line */}
      <div
        className={cn('absolute left-0 top-0 h-full w-1', typeConfig.accentColor, 'rounded-l-xl')}
      />

      {/* Content */}
      <div className="p-4 pl-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className={cn(
              'mt-0.5 cursor-grab rounded-lg p-1.5 text-muted-foreground/40 active:cursor-grabbing',
              'opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100'
            )}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Title and badges */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-sm font-semibold leading-tight',
                  isDone && 'text-muted-foreground line-through'
                )}
              >
                {task.title}
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <p
                className={cn(
                  'mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80',
                  isDone && 'line-through'
                )}
              >
                {task.description}
              </p>
            )}

            {/* Footer badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Status badge */}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                  statusConfig.bgColor,
                  statusConfig.color
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {task.status}
              </span>

              {/* Due date */}
              {task.due_date && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}

              {/* Inbox indicator */}
              {task.show_in_inbox && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                  <Inbox className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex-shrink-0 rounded-lg p-1.5 text-muted-foreground/50',
                  'opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100'
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onToggleInbox}>
                <Inbox className="mr-2 h-4 w-4" />
                {task.show_in_inbox ? 'Remove from Inbox' : 'Add to Inbox'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});

interface ItemColumnProps {
  itemType: ItemType;
  tasks: Task[];
  projectId: string;
  onDeleteTask: (taskId: string) => void;
  onToggleInbox: (taskId: string, currentValue: boolean) => void;
  isAddingItem: boolean;
  newItemTitle: string;
  onNewItemTitleChange: (value: string) => void;
  onCreateItem: () => void;
  onCancelAddItem: () => void;
  onStartAddItem: () => void;
  isOver?: boolean;
}

// Premium Item Column with glass effect
const ItemColumn = memo(function ItemColumn({
  itemType,
  tasks,
  onDeleteTask,
  onToggleInbox,
  isAddingItem,
  newItemTitle,
  onNewItemTitleChange,
  onCreateItem,
  onCancelAddItem,
  onStartAddItem,
  isOver,
}: ItemColumnProps) {
  const { setNodeRef } = useSortable({ id: itemType });
  const config = ITEM_TYPE_CONFIG[itemType];
  const TypeIcon = config.icon;
  const count = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-w-[340px] flex-col rounded-2xl border-2 transition-all duration-300',
        'bg-gradient-to-b from-card/90 to-card/70 backdrop-blur-md',
        'shadow-lg shadow-black/5 dark:shadow-black/20',
        config.borderColor,
        isOver && 'scale-[1.02] shadow-xl ring-2 ring-primary/60'
      )}
    >
      {/* Column Header - Premium */}
      <div
        className={cn(
          'relative overflow-hidden rounded-t-2xl border-b-2 px-5 py-4',
          config.borderColor,
          `bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}`
        )}
      >
        {/* Background decoration */}
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
        <div className="bg-white/3 absolute -bottom-2 -left-2 h-16 w-16 rounded-full blur-xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl',
                'shadow-lg shadow-black/10 ring-2 ring-white/10',
                config.bgColor
              )}
            >
              <TypeIcon className={cn('h-5 w-5', config.color)} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                {config.pluralLabel}
              </h3>
              <p className="text-xs text-muted-foreground/70">
                {doneCount}/{count} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg font-black',
                config.bgColor,
                config.color
              )}
            >
              {count}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartAddItem}
              className={cn(
                'h-9 w-9 rounded-xl p-0 transition-all hover:scale-110',
                config.bgColor,
                config.color
              )}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <ItemCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onToggleInbox={() => onToggleInbox(task.id, task.show_in_inbox)}
            />
          ))}
        </SortableContext>

        {/* Add Item Form */}
        {isAddingItem && (
          <div
            className={cn(
              'overflow-hidden rounded-xl border-2 p-4',
              'bg-gradient-to-br from-primary/5 to-primary/10',
              'border-primary/30 shadow-lg',
              'duration-300 animate-in fade-in slide-in-from-top-2'
            )}
          >
            <Input
              placeholder={`New ${config.label.toLowerCase()} title...`}
              value={newItemTitle}
              onChange={(e) => onNewItemTitleChange(e.target.value)}
              className="mb-3 h-10 border-primary/20 bg-background/80 text-sm font-medium focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onCreateItem();
                }
                if (e.key === 'Escape') {
                  onCancelAddItem();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onCreateItem}
                disabled={!newItemTitle.trim()}
                className="h-9 flex-1 bg-primary font-semibold shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add {config.label}
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelAddItem} className="h-9 px-4">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && !isAddingItem && (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-secondary/20">
            <div className={cn('mb-3 rounded-xl p-3', config.bgColor)}>
              <TypeIcon className={cn('h-6 w-6', config.color)} />
            </div>
            <p className="text-sm font-medium text-muted-foreground/70">
              No {config.pluralLabel.toLowerCase()}
            </p>
            <button
              onClick={onStartAddItem}
              className={cn(
                'mt-2 text-xs font-semibold transition-colors hover:underline',
                config.color
              )}
            >
              + Add first {config.label.toLowerCase()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

interface ProjectTaskKanbanProps {
  projectId: string;
}

export function ProjectTaskKanban({ projectId }: ProjectTaskKanbanProps) {
  const { tasks: rawTasks, isLoading, revalidate } = useProjectTasks(projectId);
  const tasks = rawTasks;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [addingToType, setAddingToType] = useState<ItemType | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by item type
  const tasksByType = useMemo(() => {
    const grouped: Record<ItemType, Task[]> = {
      task: [],
      issue: [],
      note: [],
      resource: [],
    };
    tasks.forEach((task) => {
      const type = (task.item_type as ItemType) || 'task';
      if (grouped[type]) {
        grouped[type].push(task);
      }
    });
    // Sort by sort_order within each type
    Object.keys(grouped).forEach((type) => {
      grouped[type as ItemType].sort((a, b) => a.sort_order - b.sort_order);
    });
    return grouped;
  }, [tasks]);

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId), [tasks, activeId]);

  // Progress calculation
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'Done').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragEndEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const activeTaskId = active.id as string;
      const overId = over.id as string;

      const activeTask = tasks.find((t) => t.id === activeTaskId);
      if (!activeTask) return;

      // Check if over a column or a task
      const isOverColumn = ['task', 'issue', 'note', 'resource'].includes(overId);
      const activeType = (activeTask.item_type as ItemType) || 'task';

      if (isOverColumn) {
        // Dropped on empty column - just reorder within same type for now
        // (changing type would require database update)
        const targetColumnTasks = [...tasksByType[activeType]];
        const oldIndex = targetColumnTasks.findIndex((t) => t.id === activeTaskId);
        const newIndex = targetColumnTasks.length - 1;

        if (oldIndex !== newIndex && newIndex !== -1) {
          const reordered = arrayMove(targetColumnTasks, oldIndex, newIndex);
          const updates = reordered.map((task, index) => ({
            id: task.id,
            sort_order: index,
          }));
          await reorderTasks(updates);
          revalidate();
          invalidateInboxTasks();
        }
      } else {
        // Dropped on a task
        const overTask = tasks.find((t) => t.id === overId);
        if (!overTask) return;

        const overType = (overTask.item_type as ItemType) || 'task';

        // Only reorder within same type
        if (activeType === overType) {
          const columnTasks = [...tasksByType[activeType]];
          const oldIndex = columnTasks.findIndex((t) => t.id === activeTaskId);
          const newIndex = columnTasks.findIndex((t) => t.id === overId);

          if (oldIndex !== newIndex && newIndex !== -1) {
            const reordered = arrayMove(columnTasks, oldIndex, newIndex);
            const updates = reordered.map((task, index) => ({
              id: task.id,
              sort_order: index,
            }));
            await reorderTasks(updates);
            revalidate();
            invalidateInboxTasks();
          }
        }
      }
    },
    [tasks, tasksByType, revalidate]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await deleteTask(taskId);
      revalidate();
      invalidateInboxTasks();
    },
    [revalidate]
  );

  const handleToggleInbox = useCallback(
    async (taskId: string, currentValue: boolean) => {
      await toggleTaskInbox(taskId, !currentValue);
      revalidate();
      invalidateInboxTasks();
    },
    [revalidate]
  );

  const handleCreateItem = useCallback(
    async (itemType: ItemType) => {
      if (!newItemTitle.trim()) return;

      const formData = new FormData();
      formData.set('title', newItemTitle.trim());
      formData.set('status', 'Todo');
      formData.set('project_id', projectId);
      formData.set('show_in_inbox', 'false');
      formData.set('item_type', itemType);

      await createTask(formData);
      setNewItemTitle('');
      setAddingToType(null);
      revalidate();
      invalidateProjectTasks(projectId);
    },
    [newItemTitle, projectId, revalidate]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-medium">Loading items...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar - Premium */}
      <div className="overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-r from-card to-card/80 p-5 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold tracking-tight text-foreground">
                Project Progress
              </span>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{doneTasks}</span> of{' '}
                <span className="font-semibold text-foreground">{totalTasks}</span> items completed
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary/50 shadow-inner">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  progress === 100
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400'
                    : progress >= 50
                      ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400'
                      : 'bg-gradient-to-r from-violet-600 via-violet-500 to-violet-400'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black',
              'shadow-lg ring-2 ring-white/10',
              progress === 100
                ? 'bg-emerald-500/20 text-emerald-400'
                : progress >= 50
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-violet-500/20 text-violet-400'
            )}
          >
            {progress}%
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 overflow-x-auto pb-4">
          <SortableContext items={['task', 'issue', 'note', 'resource']}>
            {(['task', 'issue', 'note', 'resource'] as ItemType[]).map((itemType) => (
              <ItemColumn
                key={itemType}
                itemType={itemType}
                tasks={tasksByType[itemType]}
                projectId={projectId}
                onDeleteTask={handleDeleteTask}
                onToggleInbox={handleToggleInbox}
                isAddingItem={addingToType === itemType}
                newItemTitle={addingToType === itemType ? newItemTitle : ''}
                onNewItemTitleChange={setNewItemTitle}
                onCreateItem={() => handleCreateItem(itemType)}
                onCancelAddItem={() => {
                  setAddingToType(null);
                  setNewItemTitle('');
                }}
                onStartAddItem={() => setAddingToType(itemType)}
                isOver={overId === itemType}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask && (
            <ItemCard task={activeTask} onDelete={() => {}} onToggleInbox={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
