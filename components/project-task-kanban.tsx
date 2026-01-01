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
import { createTask, deleteTask, reorderTasks, toggleTaskInbox } from '@/app/actions/inbox';
import type { Task } from '@/app/actions/inbox';
import { useProjectTasks, invalidateProjectTasks, invalidateInboxTasks } from '@/lib/swr';
import { cn } from '@/lib/utils';
import { renderTextWithLinks, extractFirstUrl } from '@/lib/render-links';
import { getPhasesForType, type Phase } from '@/lib/project-phases';
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

// Sortable Item Card - Minimal design
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
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
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

            {task.show_in_inbox && (
              <>
                <span className="text-border">·</span>
                <Inbox className="h-2.5 w-2.5 text-primary" />
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
            <SortableItemCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onToggleInbox={() => onToggleInbox(task.id, task.show_in_inbox)}
            />
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

// Phase Group Component for phase view
interface PhaseGroupProps {
  phase: Phase;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onDeleteTask: (taskId: string) => void;
  onToggleInbox: (taskId: string, currentValue: boolean) => void;
}

const PhaseGroup = memo(function PhaseGroup({
  phase,
  tasks,
  isExpanded,
  onToggle,
  onDeleteTask,
  onToggleInbox,
}: PhaseGroupProps) {
  const doneCount = tasks.filter((t) => t.status === 'Done').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

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

  const progressColors = {
    empty: 'bg-secondary',
    not_started: 'bg-muted-foreground/30',
    in_progress: 'bg-primary',
    completed: 'bg-emerald-500',
  };

  return (
    <div className={cn('rounded-xl border transition-all', statusColors[status])}>
      {/* Phase Header */}
      <button onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <div className="flex items-center gap-2">
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
            </div>
            {phase.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{phase.description}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary/50">
            <div
              className={cn('h-full transition-all', progressColors[status])}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            className={cn(
              'min-w-[3rem] text-right text-sm font-medium',
              status === 'completed'
                ? 'text-emerald-500'
                : status === 'in_progress'
                  ? 'text-primary'
                  : 'text-muted-foreground'
            )}
          >
            {progress}%
          </span>
        </div>
      </button>

      {/* Tasks List */}
      {isExpanded && tasks.length > 0 && (
        <div className="space-y-2 border-t border-border/50 p-4">
          {tasks.map((task) => (
            <PhaseTaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onToggleInbox={() => onToggleInbox(task.id, task.show_in_inbox)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {isExpanded && tasks.length === 0 && (
        <div className="border-t border-border/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">No tasks in this phase</p>
        </div>
      )}
    </div>
  );
});

// Simplified task card for phase view
const PhaseTaskCard = memo(function PhaseTaskCard({
  task,
  onDelete,
  onToggleInbox,
}: {
  task: Task;
  onDelete: () => void;
  onToggleInbox: () => void;
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
      {/* Status Icon */}
      <div
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full',
          statusConfig.bgColor
        )}
      >
        <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
      </div>

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
          <span className="flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
        {task.show_in_inbox && (
          <span className="rounded-full bg-primary/10 p-1">
            <Inbox className="h-3 w-3 text-primary" />
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

type ViewMode = 'type' | 'phase';

interface ProjectTaskKanbanProps {
  projectId: string;
}

export function ProjectTaskKanban({ projectId }: ProjectTaskKanbanProps) {
  const { tasks, isLoading, revalidate } = useProjectTasks(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingToType, setAddingToType] = useState<ItemType | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('type');
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

  // Get project type from first task's project relation
  const projectType = useMemo(() => {
    const firstTaskWithProject = tasks.find((t) => t.project?.project_type);
    return firstTaskWithProject?.project?.project_type || null;
  }, [tasks]);

  // Get available phases for this project type
  const availablePhases = useMemo(() => {
    return getPhasesForType(projectType);
  }, [projectType]);

  // Group tasks by milestone/phase
  const tasksByPhase = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    // Initialize with empty arrays for each phase
    availablePhases.forEach((phase) => {
      grouped[phase.name] = [];
    });
    // Add "Unassigned" for tasks without a milestone
    grouped['Unassigned'] = [];

    tasks.forEach((task) => {
      const milestone = task.milestone || 'Unassigned';
      if (!grouped[milestone]) {
        grouped[milestone] = [];
      }
      grouped[milestone].push(task);
    });

    // Sort by sort_order within each phase
    Object.keys(grouped).forEach((phase) => {
      grouped[phase].sort((a, b) => a.sort_order - b.sort_order);
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
        {/* Progress Bar & View Toggle */}
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
          </>
        )}

        {/* PHASE VIEW */}
        {viewMode === 'phase' && (
          <div className="space-y-3">
            {/* Predefined phases in order */}
            {availablePhases.map((phase) => (
              <PhaseGroup
                key={phase.name}
                phase={phase}
                tasks={tasksByPhase[phase.name] || []}
                isExpanded={expandedPhases.has(phase.name)}
                onToggle={() => togglePhase(phase.name)}
                onDeleteTask={handleDeleteTask}
                onToggleInbox={handleToggleInbox}
              />
            ))}

            {/* Unassigned tasks (tasks without a milestone) */}
            {tasksByPhase['Unassigned']?.length > 0 && (
              <PhaseGroup
                phase={{
                  name: 'Unassigned',
                  order: 999,
                  description: 'Tasks not assigned to a phase',
                }}
                tasks={tasksByPhase['Unassigned']}
                isExpanded={expandedPhases.has('Unassigned')}
                onToggle={() => togglePhase('Unassigned')}
                onDeleteTask={handleDeleteTask}
                onToggleInbox={handleToggleInbox}
              />
            )}
          </div>
        )}
      </div>

      <DragOverlay>{activeTask && <DragOverlayCard task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}
