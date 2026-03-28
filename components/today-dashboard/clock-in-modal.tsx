'use client';

import { useState, useEffect, useTransition } from 'react';
import { LogIn, Clock, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !currentUserId) return;

    setLoadingProjects(true);
    setError(null);
    setSelectedProjectId('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await clockIn(workspaceId, selectedProjectId);

        if (!result.success) {
          setError(result.error ?? 'Failed to clock in. Please try again.');
          return;
        }

        invalidateActiveSession(workspaceId, true);
        onSuccess();
      } catch {
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };

  return (
    <Dialog open={open} modal>
      <DialogContent
        className="max-w-sm"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <LogIn className="size-5 text-primary" />
            <DialogTitle className="text-base font-semibold">Clock In</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Select the project you&apos;re working on to start your session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Session start time */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <Clock className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Starting session at{' '}
              <span className="text-primary dark:text-primary">{format(new Date(), 'h:mm a')}</span>
            </span>
          </div>

          {/* Project selection */}
          <div className="space-y-1.5">
            <Label htmlFor="project-select" className="text-sm font-medium">
              Project{' '}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Select
              value={selectedProjectId}
              onValueChange={(v) => {
                setSelectedProjectId(v);
                if (error) setError(null);
              }}
              disabled={loadingProjects || isPending}
            >
              <SelectTrigger id="project-select" className="w-full">
                <SelectValue
                  placeholder={loadingProjects ? 'Loading projects...' : 'Select a project...'}
                />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingProjects && projects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No projects assigned — contact your admin.
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={!selectedProjectId || isPending || loadingProjects}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              {isPending ? 'Clocking In...' : 'Clock In'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
