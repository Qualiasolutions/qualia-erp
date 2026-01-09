'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getResourceTypeConfig,
  detectResourceType,
  type ResourceType,
} from '@/lib/pipeline-constants';
import {
  createPhaseResource,
  deletePhaseResource,
  type PhaseResource,
} from '@/app/actions/pipeline';
import { motion, AnimatePresence } from 'framer-motion';

interface PhaseResourcesProps {
  phaseId: string;
  resources: PhaseResource[];
  onResourcesChange: () => void;
  compact?: boolean;
}

export function PhaseResources({
  phaseId,
  resources,
  onResourcesChange,
  compact = false,
}: PhaseResourcesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    if (!newTitle.trim()) return;

    const resourceType = newUrl ? detectResourceType(newUrl) : 'link';

    startTransition(async () => {
      const result = await createPhaseResource(phaseId, {
        title: newTitle.trim(),
        url: newUrl.trim() || undefined,
        resource_type: resourceType,
      });

      if (result.success) {
        setNewTitle('');
        setNewUrl('');
        setIsAdding(false);
        onResourcesChange();
      }
    });
  };

  const handleDelete = (resourceId: string) => {
    startTransition(async () => {
      const result = await deletePhaseResource(resourceId);
      if (result.success) {
        onResourcesChange();
      }
    });
  };

  if (compact && resources.length === 0 && !isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add resource
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Resources ({resources.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      )}

      {/* Resource List */}
      <AnimatePresence mode="popLayout">
        {resources.map((resource) => {
          const typeConfig = getResourceTypeConfig(resource.resource_type as ResourceType);
          const TypeIcon = typeConfig.icon;

          return (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="group flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-2.5 py-1.5 transition-colors hover:bg-muted/50"
            >
              <div className={cn('rounded p-1', typeConfig.bgColor)}>
                <TypeIcon className={cn('h-3 w-3', typeConfig.color)} />
              </div>

              {resource.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-1 text-xs font-medium text-foreground hover:text-primary"
                >
                  <span className="truncate">{resource.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {resource.title}
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDelete(resource.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <Input
              placeholder="Resource name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
            <Input
              placeholder="URL (optional)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={handleAdd}
                disabled={isPending || !newTitle.trim()}
              >
                {isPending ? 'Adding...' : 'Add'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                  setNewUrl('');
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!compact && resources.length === 0 && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full rounded-lg border border-dashed border-border/50 py-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
        >
          <Plus className="mx-auto mb-1 h-4 w-4" />
          Add first resource
        </button>
      )}
    </div>
  );
}
