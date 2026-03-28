'use client';

import { useState, useEffect, useTransition } from 'react';
import { LogIn, Clock, AlertCircle, Loader2, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { clockIn } from '@/app/actions/work-sessions';
import { invalidateActiveSession } from '@/lib/swr';
import { getEmployeeAssignments } from '@/app/actions/project-assignments';
import { format } from 'date-fns';

interface ClockInModalProps {
  open: boolean;
  workspaceId: string;
  currentUserId: string | null;
  onSuccess: () => void;
}

export function ClockInModal({ open, workspaceId, currentUserId, onSuccess }: ClockInModalProps) {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockingProjectId, setClockingProjectId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !currentUserId) return;

    setLoadingProjects(true);
    setError(null);
    setClockingProjectId(null);

    getEmployeeAssignments(currentUserId)
      .then((result) => {
        const assignments =
          (result.data as Array<{ project: { id: string; name: string; status: string } }>) ?? [];
        const activeProjects = assignments
          .filter((a) => a.project?.status === 'Active' || a.project?.status === 'Launched')
          .map((a) => ({ id: a.project.id, name: a.project.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setProjects(activeProjects);
      })
      .catch(() => {
        setError('Failed to load projects. Please try again.');
      })
      .finally(() => {
        setLoadingProjects(false);
      });
  }, [open, currentUserId]);

  function handleClockIn(projectId: string) {
    setError(null);
    setClockingProjectId(projectId);

    startTransition(async () => {
      try {
        const result = await clockIn(workspaceId, projectId);

        if (!result.success) {
          setError(result.error ?? 'Failed to clock in. Please try again.');
          setClockingProjectId(null);
          return;
        }

        invalidateActiveSession(workspaceId, true);
        onSuccess();
      } catch {
        setError('An unexpected error occurred. Please try again.');
        setClockingProjectId(null);
      }
    });
  }

  return (
    <Dialog open={open} modal>
      <DialogContent
        className="max-w-sm"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <LogIn className="size-5 text-primary" />
            <DialogTitle className="text-base font-semibold">Clock In</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Tap the project you&apos;re working on to start your session.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Session start time */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <Clock className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Starting session at{' '}
              <span className="text-primary dark:text-primary">{format(new Date(), 'h:mm a')}</span>
            </span>
          </div>

          {/* Project buttons */}
          <div className="space-y-2">
            {loadingProjects && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading projects...</span>
              </div>
            )}

            {!loadingProjects && projects.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <FolderOpen className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No projects assigned — contact your admin.
                </p>
              </div>
            )}

            {!loadingProjects &&
              projects.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  className="h-auto w-full justify-start px-4 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-primary/5"
                  disabled={isPending}
                  onClick={() => handleClockIn(p.id)}
                >
                  {clockingProjectId === p.id ? (
                    <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                  ) : (
                    <FolderOpen className="mr-2 size-4 text-muted-foreground" />
                  )}
                  {p.name}
                </Button>
              ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
