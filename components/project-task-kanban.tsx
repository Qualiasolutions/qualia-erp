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
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
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
import { renderTextWithLinks, extractFirstUrl } from '@/lib/render-links';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type ItemType = 'task' | 'issue' | 'note' | 'resource';
type TaskStatus = 'Todo' | 'In Progress' | 'Done';

// Item type configuration - unified theme colors (qualia teal + neutrals)
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
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    gradientFrom: 'from-primary/10',
    gradientTo: 'to-primary/5',
    accentColor: 'bg-primary',
  },
  issue: {
    icon: Bug,
    label: 'Issue',
    pluralLabel: 'Issues',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    gradientFrom: 'from-primary/10',
    gradientTo: 'to-primary/5',
    accentColor: 'bg-primary',
  },
  note: {
    icon: StickyNote,
    label: 'Note',
    pluralLabel: 'Notes',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    gradientFrom: 'from-primary/10',
    gradientTo: 'to-primary/5',
    accentColor: 'bg-primary',
  },
  resource: {
    icon: Bookmark,
    label: 'Resource',
    pluralLabel: 'Resources',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    gradientFrom: 'from-primary/10',
    gradientTo: 'to-primary/5',
    accentColor: 'bg-primary',
  },
};

// Status icons and colors - semantic colors only
const STATUS_CONFIG: Record<TaskStatus, { icon: typeof Circle; color: string; bgColor: string }> = {
  Todo: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  'In Progress': {
    icon: Clock,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  Done: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
};

interface SortableItemCardProps {
  task: Task;
  onDelete: () => void;
  onToggleInbox: () => void;
}

// Sortable Item Card
const SortableItemCard = memo(function SortableItemCard({
  task,
  onDelete,
  onToggleInbox,
}: SortableItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition]
  );

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
        'group relative overflow-hidden rounded-xl border bg-card/90 backdrop-blur-sm transition-all duration-200',
        'shadow-sm hover:border-primary/30 hover:shadow-md',
        typeConfig.borderColor,
        isDragging && 'z-50 scale-[1.02] opacity-80 shadow-xl ring-2 ring-primary/50',
        isDone && 'opacity-60'
      )}
    >
      {/* Accent line */}
      <div className={cn('absolute left-0 top-0 h-full w-1', typeConfig.accentColor)} />

      <div className="p-3 pl-4">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-secondary hover:text-foreground active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'text-sm font-medium leading-tight',
                isDone && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </span>

            {task.description && (
              <p
                className={cn(
                  'mt-1 line-clamp-2 text-xs text-muted-foreground/80',
                  isDone && 'line-through'
                )}
              >
                {renderTextWithLinks(task.description)}
              </p>
            )}

            {/* Badges */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  statusConfig.bgColor,
                  statusConfig.color
                )}
              >
                <StatusIcon className="h-2.5 w-2.5" />
                {task.status}
              </span>

              {task.due_date && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(task.due_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}

              {task.show_in_inbox && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  <Inbox className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
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

// Overlay card for drag preview
const DragOverlayCard = memo(function DragOverlayCard({ task }: { task: Task }) {
  const itemType = (task.item_type as ItemType) || 'task';
  const typeConfig = ITEM_TYPE_CONFIG[itemType];

  return (
    <div
      className={cn(
        'rounded-xl border bg-card/95 p-3 shadow-2xl backdrop-blur-sm',
        typeConfig.borderColor
      )}
    >
      <div
        className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', typeConfig.accentColor)}
      />
      <div className="pl-3">
        <span className="text-sm font-medium">{task.title}</span>
      </div>
    </div>
  );
});

// Resource Card - Compact horizontal layout
const ResourceCard = memo(function ResourceCard({
  task,
  onDelete,
  onToggleInbox,
}: {
  task: Task;
  onDelete: () => void;
  onToggleInbox: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition]
  );

  const config = ITEM_TYPE_CONFIG.resource;

  // Check if description contains a URL
  const linkUrl = extractFirstUrl(task.description);
  const hasLink = !!linkUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border bg-card/90 px-4 py-3 backdrop-blur-sm transition-all',
        'hover:border-primary/40 hover:shadow-md',
        config.borderColor,
        isDragging && 'z-50 scale-[1.02] opacity-80 shadow-xl ring-2 ring-primary/50'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-secondary active:cursor-grabbing group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Icon */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          config.bgColor
        )}
      >
        {hasLink ? (
          <LinkIcon className={cn('h-4 w-4', config.color)} />
        ) : (
          <Bookmark className={cn('h-4 w-4', config.color)} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{task.title}</span>
          {hasLink && linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {task.description && !hasLink && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>
        )}
        {hasLink && linkUrl && <p className="mt-0.5 truncate text-xs text-primary/70">{linkUrl}</p>}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-secondary group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
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
  );
});

// Droppable Column Component
interface DroppableColumnProps {
  id: ItemType;
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onToggleInbox: (taskId: string, currentValue: boolean) => void;
  isAddingItem: boolean;
  newItemTitle: string;
  onNewItemTitleChange: (value: string) => void;
  onCreateItem: () => void;
  onCancelAddItem: () => void;
  onStartAddItem: () => void;
}

const DroppableColumn = memo(function DroppableColumn({
  id,
  tasks,
  onDeleteTask,
  onToggleInbox,
  isAddingItem,
  newItemTitle,
  onNewItemTitleChange,
  onCreateItem,
  onCancelAddItem,
  onStartAddItem,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const config = ITEM_TYPE_CONFIG[id];
  const TypeIcon = config.icon;
  const count = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-w-[320px] flex-1 flex-col rounded-2xl border bg-card/50 backdrop-blur-sm transition-all',
        config.borderColor,
        isOver && 'border-primary/50 bg-primary/5 ring-2 ring-primary/30'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between rounded-t-2xl border-b px-4 py-3',
          config.borderColor,
          `bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn('flex h-9 w-9 items-center justify-center rounded-lg', config.bgColor)}
          >
            <TypeIcon className={cn('h-4 w-4', config.color)} />
          </div>
          <div>
            <h3 className="text-sm font-bold">{config.pluralLabel}</h3>
            <p className="text-xs text-muted-foreground">
              {doneCount}/{count} done
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onStartAddItem}
          className={cn('h-8 w-8 rounded-lg p-0', config.bgColor, config.color, 'hover:scale-105')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Items */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableItemCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onToggleInbox={() => onToggleInbox(task.id, task.show_in_inbox)}
            />
          ))}
        </SortableContext>

        {/* Add Form */}
        {isAddingItem && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <Input
              placeholder={`New ${config.label.toLowerCase()}...`}
              value={newItemTitle}
              onChange={(e) => onNewItemTitleChange(e.target.value)}
              className="mb-2 h-9 border-primary/20 bg-background/80 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreateItem();
                if (e.key === 'Escape') onCancelAddItem();
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onCreateItem}
                disabled={!newItemTitle.trim()}
                className="h-8 flex-1"
              >
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelAddItem} className="h-8">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && !isAddingItem && (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-secondary/10">
            <TypeIcon className={cn('mb-2 h-6 w-6', config.color, 'opacity-50')} />
            <p className="text-xs text-muted-foreground">No {config.pluralLabel.toLowerCase()}</p>
            <button
              onClick={onStartAddItem}
              className={cn('mt-1 text-xs font-medium', config.color)}
            >
              + Add {config.label.toLowerCase()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// Resources Section (Top Row)
interface ResourcesSectionProps {
  resources: Task[];
  onDeleteTask: (taskId: string) => void;
  onToggleInbox: (taskId: string, currentValue: boolean) => void;
  isAddingItem: boolean;
  newItemTitle: string;
  onNewItemTitleChange: (value: string) => void;
  onCreateItem: () => void;
  onCancelAddItem: () => void;
  onStartAddItem: () => void;
}

const ResourcesSection = memo(function ResourcesSection({
  resources,
  onDeleteTask,
  onToggleInbox,
  isAddingItem,
  newItemTitle,
  onNewItemTitleChange,
  onCreateItem,
  onCancelAddItem,
  onStartAddItem,
}: ResourcesSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'resource' });
  const config = ITEM_TYPE_CONFIG.resource;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-2xl border bg-gradient-to-r from-primary/5 via-card/50 to-primary/5 backdrop-blur-sm transition-all',
        config.borderColor,
        isOver && 'border-primary/50 ring-2 ring-primary/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-primary/20 px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn('flex h-10 w-10 items-center justify-center rounded-xl', config.bgColor)}
          >
            <Bookmark className={cn('h-5 w-5', config.color)} />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Resources & Links</h3>
            <p className="text-xs text-muted-foreground">
              Quick access to important references ({resources.length})
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onStartAddItem}
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </div>

      {/* Resources Grid */}
      <div className="p-4">
        {resources.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <SortableContext
              items={resources.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {resources.map((task) => (
                <ResourceCard
                  key={task.id}
                  task={task}
                  onDelete={() => onDeleteTask(task.id)}
                  onToggleInbox={() => onToggleInbox(task.id, task.show_in_inbox)}
                />
              ))}
            </SortableContext>
          </div>
        ) : !isAddingItem ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className={cn('mb-3 rounded-xl p-3', config.bgColor)}>
              <Bookmark className={cn('h-6 w-6', config.color)} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No resources yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add links, documentation, or references for quick access
            </p>
          </div>
        ) : null}

        {/* Add Form */}
        {isAddingItem && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex gap-3">
              <Input
                placeholder="Resource title..."
                value={newItemTitle}
                onChange={(e) => onNewItemTitleChange(e.target.value)}
                className="h-10 flex-1 border-primary/20 bg-background/80"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCreateItem();
                  if (e.key === 'Escape') onCancelAddItem();
                }}
                autoFocus
              />
              <Button onClick={onCreateItem} disabled={!newItemTitle.trim()} className="h-10">
                Add
              </Button>
              <Button variant="ghost" onClick={onCancelAddItem} className="h-10">
                Cancel
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: Add a URL in the description to make it a clickable link
            </p>
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
  const { tasks, isLoading, revalidate } = useProjectTasks(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingToType, setAddingToType] = useState<ItemType | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
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
    // Sort by sort_order
    Object.keys(grouped).forEach((type) => {
      grouped[type as ItemType].sort((a, b) => a.sort_order - b.sort_order);
    });
    return grouped;
  }, [tasks]);

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId), [tasks, activeId]);

  // Progress
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'Done').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const activeTaskId = active.id as string;
      const overId = over.id as string;

      const draggedTask = tasks.find((t) => t.id === activeTaskId);
      if (!draggedTask) return;

      const activeType = (draggedTask.item_type as ItemType) || 'task';

      // Check if dropped on another task in same column
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        const overType = (overTask.item_type as ItemType) || 'task';

        // Only reorder within same type
        if (activeType === overType) {
          const columnTasks = [...tasksByType[activeType]];
          const oldIndex = columnTasks.findIndex((t) => t.id === activeTaskId);
          const newIndex = columnTasks.findIndex((t) => t.id === overId);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
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
          <span className="font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">
                {doneTasks}/{totalTasks} completed
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary/50">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold',
              progress === 100 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-primary/20 text-primary'
            )}
          >
            {progress}%
          </div>
        </div>

        {/* Resources Section - Top Row */}
        <ResourcesSection
          resources={tasksByType.resource}
          onDeleteTask={handleDeleteTask}
          onToggleInbox={handleToggleInbox}
          isAddingItem={addingToType === 'resource'}
          newItemTitle={addingToType === 'resource' ? newItemTitle : ''}
          onNewItemTitleChange={setNewItemTitle}
          onCreateItem={() => handleCreateItem('resource')}
          onCancelAddItem={() => {
            setAddingToType(null);
            setNewItemTitle('');
          }}
          onStartAddItem={() => setAddingToType('resource')}
        />

        {/* Main Columns - Tasks, Issues, Notes */}
        <div className="grid gap-5 lg:grid-cols-3">
          {(['task', 'issue', 'note'] as ItemType[]).map((itemType) => (
            <DroppableColumn
              key={itemType}
              id={itemType}
              tasks={tasksByType[itemType]}
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
            />
          ))}
        </div>
      </div>

      <DragOverlay>{activeTask && <DragOverlayCard task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}
