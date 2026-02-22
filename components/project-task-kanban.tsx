'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import {
  Plus,
  GripVertical,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Bug,
  StickyNote,
  Bookmark,
  ExternalLink,
  Link as LinkIcon,
  LayoutGrid,
  Layers,
  ChevronDown,
  ChevronRight,
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
import {
  createTask,
  deleteTask,
  reorderTasks,
  quickUpdateTask,
  type Task,
} from '@/app/actions/inbox';
import { createProjectPhase, deleteProjectPhase, updateProjectPhase } from '@/app/actions/phases';
import {
  useProjectTasks,
  invalidateProjectTasks,
  invalidateInboxTasks,
  useProjectPhases,
  invalidateProjectPhases,
} from '@/lib/swr';
import { cn } from '@/lib/utils';
import { renderTextWithLinks, extractFirstUrl } from '@/lib/render-links';
import { getPhasesForType, type Phase } from '@/lib/project-phases';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
}

// Sortable Item Card - Minimal design
const SortableItemCard = memo(function SortableItemCard({ task, onDelete }: SortableItemCardProps) {
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

  const statusConfig = STATUS_CONFIG[task.status as TaskStatus] || STATUS_CONFIG.Todo;
  const StatusIcon = statusConfig.icon;
  const isDone = task.status === 'Done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-md border border-border bg-card p-2.5 transition-colors duration-150',
        'hover:border-border/80',
        isDragging && 'z-50 scale-[1.01] opacity-90 ring-1 ring-primary/30',
        isDone && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab rounded p-0.5 text-muted-foreground/30 opacity-0 transition-opacity hover:text-muted-foreground active:cursor-grabbing group-hover:opacity-100"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Status Toggle / Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const isDone = task.status === 'Done';
            const newStatus = isDone ? 'Todo' : 'Done';
            quickUpdateTask(task.id, { status: newStatus as 'Todo' | 'Done' }).then(() => {
              invalidateProjectTasks(task.project_id || '');
              invalidateInboxTasks();
            });
          }}
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all duration-200',
            isDone
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-muted-foreground/30 hover:border-primary/50'
          )}
          title={
            task.item_type === 'issue'
              ? isDone
                ? 'Mark as Open'
                : 'Mark as Fixed'
              : isDone
                ? 'Mark as Todo'
                : 'Mark as Done'
          }
        >
          {isDone && <CheckCircle2 className="h-3 w-3" />}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'text-[13px] font-medium leading-tight',
              isDone && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </span>

          {task.description && (
            <p
              className={cn(
                'mt-1 line-clamp-1 text-xs text-muted-foreground',
                isDone && 'line-through'
              )}
            >
              {renderTextWithLinks(task.description)}
            </p>
          )}

          {/* Inline metadata - single line */}
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
            <span>{task.status}</span>

            {task.due_date && (
              <>
                <span className="text-border">·</span>
                <span>
                  {new Date(task.due_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground/30 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

// Overlay card for drag preview - Minimal
const DragOverlayCard = memo(function DragOverlayCard({ task }: { task: Task }) {
  return (
    <div className="rounded-md border border-border bg-card p-2.5 shadow-lg">
      <span className="text-[13px] font-medium">{task.title}</span>
    </div>
  );
});

// Resource Card - Compact horizontal layout
const ResourceCard = memo(function ResourceCard({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: () => void;
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

  // Handle container click to open link
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't navigate if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-drag-handle]')) {
        return;
      }
      if (hasLink && linkUrl) {
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [hasLink, linkUrl]
  );

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={handleContainerClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border bg-card/90 px-4 py-3 backdrop-blur-sm transition-all',
        'hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:scale-[0.98]',
        config.borderColor,
        isDragging && 'z-50 scale-[1.02] opacity-80 shadow-xl ring-2 ring-primary/50'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        data-drag-handle
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
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{task.title}</span>
          {hasLink && linkUrl && (
            <div className="shrink-0 rounded-full bg-primary/10 p-1.5 text-primary transition-colors group-hover:bg-primary/20">
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        {task.description && !hasLink && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>
        )}
        {hasLink && linkUrl && <p className="mt-0.5 truncate text-xs text-primary/70">{linkUrl}</p>}
      </div>

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-secondary group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </button>
  );
});

// Droppable Column Component
interface DroppableColumnProps {
  id: ItemType;
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-w-[280px] flex-1 flex-col rounded-lg border border-border bg-card/50 transition-colors duration-150',
        isOver && 'border-primary/40 bg-primary/5'
      )}
    >
      {/* Header - Minimal */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[13px] font-medium">{config.pluralLabel}</h3>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onStartAddItem}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Items */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableItemCard key={task.id} task={task} onDelete={() => onDeleteTask(task.id)} />
          ))}
        </SortableContext>

        {/* Add Form - Minimal */}
        {isAddingItem && (
          <div className="rounded-md border border-border bg-muted/30 p-2.5">
            <Input
              placeholder={`New ${config.label.toLowerCase()}...`}
              value={newItemTitle}
              onChange={(e) => onNewItemTitleChange(e.target.value)}
              className="mb-2 h-8 text-[13px]"
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
                className="h-7 flex-1 text-xs"
              >
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelAddItem} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Empty State - Minimal */}
        {tasks.length === 0 && !isAddingItem && (
          <div className="flex h-24 flex-col items-center justify-center rounded-md border border-dashed border-border/50">
            <p className="text-xs text-muted-foreground">No {config.pluralLabel.toLowerCase()}</p>
            <button
              onClick={onStartAddItem}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground"
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
                <ResourceCard key={task.id} task={task} onDelete={() => onDeleteTask(task.id)} />
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

// Phase Group Component for phase view
interface PhaseGroupProps {
  phase: Phase;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
  isAddingTask?: boolean;
  newTaskTitle?: string;
  onNewTaskTitleChange?: (value: string) => void;
  onCreateTask?: () => void;
  onCancelAddTask?: () => void;
  onDeletePhase?: () => void;
  onUpdatePhase?: (name: string) => void;
}

const PhaseGroup = memo(function PhaseGroup({
  phase,
  tasks,
  isExpanded,
  onToggle,
  onDeleteTask,
  onAddTask,
  isAddingTask,
  newTaskTitle,
  onNewTaskTitleChange,
  onCreateTask,
  onCancelAddTask,
  onDeletePhase,
  onUpdatePhase,
}: PhaseGroupProps) {
  const doneCount = tasks.filter((t) => t.status === 'Done').length;
  const totalCount = tasks.length;
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(phase.name);

  // Determine phase status
  const status =
    totalCount === 0
      ? 'empty'
      : doneCount === totalCount
        ? 'completed'
        : doneCount > 0
          ? 'in_progress'
          : 'not_started';

  const statusColors = {
    empty: 'border-border/50 bg-secondary/20',
    not_started: 'border-border/50 bg-card/50',
    in_progress: 'border-primary/30 bg-primary/5',
    completed: 'border-emerald-500/30 bg-emerald-500/5',
  };

  const handleUpdate = () => {
    if (editedName.trim() && editedName !== phase.name && onUpdatePhase) {
      onUpdatePhase(editedName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={cn('rounded-xl border transition-all', statusColors[status])}>
      {/* Phase Header */}
      <div className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex flex-1 cursor-pointer items-center gap-3" onClick={onToggle}>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate();
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                    className="h-7 py-0 text-sm font-semibold"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdate}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-semibold">{phase.name}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : status === 'in_progress'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {doneCount}/{totalCount}
                  </span>
                </>
              )}
            </div>
            {phase.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{phase.description}</p>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask();
                if (!isExpanded) onToggle();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Rename Phase
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onDeletePhase && (
                  <DropdownMenuItem
                    className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm('Are you sure you want to delete this phase?')) {
                        onDeletePhase();
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Phase
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {isExpanded && (
        <div className="space-y-2 border-t border-border/50 p-4">
          {tasks.map((task) => (
            <PhaseTaskCard key={task.id} task={task} onDelete={() => onDeleteTask(task.id)} />
          ))}

          {/* Add Task Form */}
          {isAddingTask && onNewTaskTitleChange && onCreateTask && onCancelAddTask ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Input
                placeholder="Task title..."
                value={newTaskTitle || ''}
                onChange={(e) => onNewTaskTitleChange(e.target.value)}
                className="mb-2 h-9 border-primary/20 bg-background/80"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCreateTask();
                  if (e.key === 'Escape') onCancelAddTask();
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onCreateTask}
                  disabled={!newTaskTitle?.trim()}
                  className="h-8 flex-1"
                >
                  Add Task
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelAddTask} className="h-8">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// Simplified task card for phase view
const PhaseTaskCard = memo(function PhaseTaskCard({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: () => void;
}) {
  const statusConfig = STATUS_CONFIG[task.status as TaskStatus] || STATUS_CONFIG.Todo;
  const StatusIcon = statusConfig.icon;
  const isDone = task.status === 'Done';
  const itemType = (task.item_type as ItemType) || 'task';
  const typeConfig = ITEM_TYPE_CONFIG[itemType];
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-border/50 bg-card/80 p-3 transition-all hover:border-primary/30 hover:shadow-sm',
        isDone && 'opacity-60'
      )}
    >
      {/* Status Icon / Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const newStatus = isDone ? 'Todo' : 'Done';
          quickUpdateTask(task.id, { status: newStatus as 'Todo' | 'Done' }).then(() => {
            invalidateProjectTasks(task.project_id || '');
            invalidateInboxTasks();
          });
        }}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200',
          statusConfig.bgColor,
          'hover:scale-110 active:scale-95'
        )}
        title={
          itemType === 'issue'
            ? isDone
              ? 'Mark as Open'
              : 'Mark as Fixed'
            : isDone
              ? 'Mark as Todo'
              : 'Mark as Done'
        }
      >
        <StatusIcon className={cn('h-3.5 w-3.5', statusConfig.color)} />
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <TypeIcon className={cn('h-3 w-3 shrink-0', typeConfig.color)} />
          <span
            className={cn(
              'truncate text-sm font-medium',
              isDone && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2">
        {task.due_date && (
          <span className="flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
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
          <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

type ViewMode = 'type' | 'phase';

interface ProjectTaskKanbanProps {
  projectId: string;
  projectType?: string | null;
}

export function ProjectTaskKanban({
  projectId,
  projectType: initialProjectType,
}: ProjectTaskKanbanProps) {
  const { tasks, isLoading, revalidate } = useProjectTasks(projectId);
  const { phases: customPhases } = useProjectPhases(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingToType, setAddingToType] = useState<ItemType | null>(null);
  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');

  // Get project type from first task's project relation if not passed
  const projectType = useMemo(() => {
    if (initialProjectType) return initialProjectType;
    const firstTaskWithProject = tasks.find((t) => t.project?.project_type);
    return firstTaskWithProject?.project?.project_type || null;
  }, [tasks, initialProjectType]);

  // Combined phases (custom first, then default if no custom)
  const availablePhases = useMemo(() => {
    if (customPhases && customPhases.length > 0) {
      return customPhases;
    }
    return getPhasesForType(projectType);
  }, [projectType, customPhases]);

  const [viewMode, setViewMode] = useState<ViewMode>(availablePhases.length > 0 ? 'phase' : 'type');
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

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

  // Group tasks by phase_name
  const tasksByPhase = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    // Initialize with empty arrays for each phase
    availablePhases.forEach((phase) => {
      grouped[phase.name] = [];
    });

    // Group tasks by their phase_name
    tasks.forEach((task) => {
      const phaseName = task.phase_name || 'Unassigned';
      if (phaseName === 'Unassigned') return; // User requested to remove unassigned phase from view
      if (!grouped[phaseName]) {
        grouped[phaseName] = [];
      }
      grouped[phaseName].push(task);
    });

    // Sort each group by sort_order
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.sort_order - b.sort_order);
    });

    return grouped;
  }, [tasks, availablePhases]);

  // Toggle phase expansion
  const togglePhase = useCallback((phaseName: string) => {
    setExpandedPhases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(phaseName)) {
        newSet.delete(phaseName);
      } else {
        newSet.add(phaseName);
      }
      return newSet;
    });
  }, []);

  // Progress

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

  const handleAddPhase = async () => {
    if (!newPhaseName.trim()) return;
    await createProjectPhase(projectId, newPhaseName.trim());
    setNewPhaseName('');
    setIsAddingPhase(false);
    invalidateProjectPhases(projectId);
  };

  const handleDeletePhase = async (phaseId: string) => {
    await deleteProjectPhase(phaseId, projectId);
    invalidateProjectPhases(projectId);
  };

  const handleUpdatePhase = async (phaseId: string, name: string) => {
    await updateProjectPhase(phaseId, name, projectId);
    invalidateProjectPhases(projectId);
  };

  const handleCreatePhaseTask = useCallback(async () => {
    if (!newItemTitle.trim() || !addingToPhase) return;

    const formData = new FormData();
    formData.set('title', newItemTitle.trim());
    formData.set('status', 'Todo');
    formData.set('project_id', projectId);
    formData.set('show_in_inbox', 'true');
    formData.set('item_type', 'task');
    formData.set('phase_name', addingToPhase);

    await createTask(formData);
    setNewItemTitle('');
    setAddingToPhase(null);
    revalidate();
    invalidateProjectTasks(projectId);
    invalidateInboxTasks();
  }, [newItemTitle, projectId, addingToPhase, revalidate]);

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
        {/* Progress Bar & View Toggle */}
        <div className="flex items-center justify-end">
          {/* View Toggle - Only show if project has phases */}
          {availablePhases.length > 0 && (
            <div className="flex rounded-lg border border-border/50 bg-secondary/30 p-1">
              <button
                onClick={() => setViewMode('type')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  viewMode === 'type'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Type</span>
              </button>
              <button
                onClick={() => setViewMode('phase')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  viewMode === 'phase'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Phases</span>
              </button>
            </div>
          )}
        </div>

        {/* TYPE VIEW */}
        {viewMode === 'type' && (
          <>
            {/* Resources Section - Top Row */}
            <ResourcesSection
              resources={tasksByType.resource}
              onDeleteTask={handleDeleteTask}
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
          </>
        )}

        {/* PHASE VIEW */}
        {viewMode === 'phase' && (
          <div className="space-y-3">
            {/* Predefined phases in order */}
            {availablePhases.map((phase) => (
              <PhaseGroup
                key={phase.id || phase.name}
                phase={phase}
                tasks={tasksByPhase[phase.name] || []}
                isExpanded={expandedPhases.has(phase.name) || addingToPhase === phase.name}
                onToggle={() => togglePhase(phase.name)}
                onDeleteTask={handleDeleteTask}
                onAddTask={() => {
                  setAddingToPhase(phase.name);
                  setExpandedPhases((prev) => new Set(prev).add(phase.name));
                }}
                isAddingTask={addingToPhase === phase.name}
                newTaskTitle={addingToPhase === phase.name ? newItemTitle : ''}
                onNewTaskTitleChange={setNewItemTitle}
                onCreateTask={handleCreatePhaseTask}
                onCancelAddTask={() => {
                  setAddingToPhase(null);
                  setNewItemTitle('');
                }}
                onDeletePhase={phase.id ? () => handleDeletePhase(phase.id) : undefined}
                onUpdatePhase={phase.id ? (name) => handleUpdatePhase(phase.id, name) : undefined}
              />
            ))}

            {/* Add Phase UI */}
            <div className="pt-2">
              {isAddingPhase ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3">
                  <Input
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    placeholder="Enter phase name..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddPhase();
                      if (e.key === 'Escape') setIsAddingPhase(false);
                    }}
                    className="h-8 py-0"
                  />
                  <Button size="sm" onClick={handleAddPhase}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingPhase(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingPhase(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 py-3 text-sm text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary/20 hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Phase
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <DragOverlay>{activeTask && <DragOverlayCard task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}
