'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderKanban, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  getMessagingProjects,
  startConversation,
  type MessagingProject,
} from '@/app/actions/portal-messages';
import { invalidateMessageChannels } from '@/lib/swr';

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onConversationStarted: (projectId: string, channelId: string) => void;
}

export function NewConversationDialog({
  open,
  onClose,
  userId,
  onConversationStarted,
}: NewConversationDialogProps) {
  const [projects, setProjects] = useState<MessagingProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingId, setIsStartingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch projects when the dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);

    getMessagingProjects(userId)
      .then((result) => {
        if (cancelled) return;
        if (result.success && Array.isArray(result.data)) {
          setProjects(result.data);
        } else {
          toast.error(result.error || 'Failed to load projects');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const handleStart = useCallback(
    async (projectId: string) => {
      if (isStartingId) return;
      setIsStartingId(projectId);

      const result = await startConversation(projectId);

      setIsStartingId(null);

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to start conversation');
        return;
      }

      invalidateMessageChannels(userId, true);
      onConversationStarted(result.data.projectId, result.data.channelId);
      onClose();
    },
    [isStartingId, userId, onConversationStarted, onClose]
  );

  const filtered = search.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>Pick a project to open its message channel.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Search projects"
            autoFocus
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <FolderKanban
                className="mb-3 h-10 w-10 text-muted-foreground/30"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-foreground">
                {search.trim()
                  ? 'No matching projects'
                  : projects.length === 0
                    ? 'No projects available'
                    : 'No projects match'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search.trim()
                  ? 'Try a different search term'
                  : 'You have no projects to message about'}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((project) => {
                const starting = isStartingId === project.id;
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => handleStart(project.id)}
                      disabled={!!isStartingId}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 text-left transition-colors duration-150',
                        'hover:border-primary/30 hover:bg-primary/[0.04]',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                        'disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderKanban className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {project.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {project.project_type.replace(/_/g, ' ')}
                          {project.status ? ` · ${project.status}` : ''}
                        </p>
                      </div>
                      {starting && (
                        <Loader2
                          className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
