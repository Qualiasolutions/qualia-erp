'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createTask } from '@/app/actions/inbox';
import { invalidateProjectTasks, invalidateInboxTasks } from '@/lib/swr';
import { toast } from 'sonner';

interface QuickAddTaskProps {
  projectId: string;
  defaultStatus: 'Todo' | 'In Progress' | 'Done';
  onTaskCreated?: () => void;
}

export function QuickAddTask({ projectId, defaultStatus, onTaskCreated }: QuickAddTaskProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
    setTitle('');
    setIsSubmitting(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', trimmed);
      formData.append('status', defaultStatus);
      formData.append('project_id', projectId);
      formData.append('show_in_inbox', 'true');

      const result = await createTask(formData);

      if (result.success) {
        setTitle('');
        invalidateProjectTasks(projectId, true);
        invalidateInboxTasks(true);
        onTaskCreated?.();
        // Keep form open for rapid entry — re-focus input
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      } else {
        toast.error(result.error || 'Failed to create task');
      }
    } catch (err) {
      console.error('[QuickAddTask] Error creating task:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, isSubmitting, defaultStatus, projectId, onTaskCreated]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    },
    [handleSubmit, handleClose]
  );

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task title..."
        className="h-9 text-sm"
        disabled={isSubmitting}
        aria-label="New task title"
      />
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="default"
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClose}
          disabled={isSubmitting}
          aria-label="Cancel adding task"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
