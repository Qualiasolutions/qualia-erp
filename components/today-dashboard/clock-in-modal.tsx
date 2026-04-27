'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { LogIn, Clock, AlertCircle, Loader2, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { clockIn } from '@/app/actions/work-sessions';
import { invalidateActiveSession } from '@/lib/swr';
import { getEmployeeAssignments } from '@/app/actions/project-assignments';
import { getActiveProjects } from '@/app/actions/projects';
import { useAdminContext } from '@/components/admin-provider';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClockInModalProps {
  open: boolean;
  workspaceId: string;
  currentUserId: string | null;
  onSuccess: () => void;
  onDismiss?: () => void;
}

/**
 * Canonical activity labels — keep in sync with the
 * work_sessions.clock_in_activities column comment in the matching migration.
 * The order here is the order they appear in the modal.
 */
const ACTIVITY_OPTIONS = [
  'Daily Blog',
  'Daily Research',
  'Project Work',
  'Client Meetings',
  'Code Review',
  'Bug Fixes',
  'Admin / Email',
  'Other',
] as const;

/** Per-employee defaults — by email, hardcoded. The keys must match
 * profiles.email exactly (lower-case). */
const HARDCODED_DEFAULTS: Record<string, readonly string[]> = {
  'moayad@qualiasolutions.net': ['Daily Blog', 'Daily Research'],
};

export function ClockInModal({
  open,
  workspaceId,
  currentUserId,
  onSuccess,
  onDismiss,
}: ClockInModalProps) {
  const { isAdmin, userEmail } = useAdminContext();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockingProjectId, setClockingProjectId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activities, setActivities] = useState<string[]>([]);

  const initialActivities = useMemo<string[]>(() => {
    const key = (userEmail || '').toLowerCase().trim();
    const preset = HARDCODED_DEFAULTS[key];
    return preset ? [...preset] : [];
  }, [userEmail]);

  useEffect(() => {
    if (!open || !currentUserId) return;

    setLoadingProjects(true);
    setError(null);
    setClockingProjectId(null);
    setActivities(initialActivities);

    // Admin sees all active projects; employees see only assigned ones
    const fetchProjects = isAdmin
      ? getActiveProjects().then((data) => data)
      : getEmployeeAssignments(currentUserId).then((result) => {
          const assignments =
            (result.data as Array<{ project: { id: string; name: string; status: string } }>) ?? [];
          return assignments
            .filter((a) => a.project?.status === 'Active' || a.project?.status === 'Launched')
            .map((a) => ({ id: a.project.id, name: a.project.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        });

    fetchProjects
      .then((activeProjects) => setProjects(activeProjects))
      .catch(() => setError('Failed to load projects. Please try again.'))
      .finally(() => setLoadingProjects(false));
  }, [open, currentUserId, isAdmin, initialActivities]);

  function toggleActivity(label: string, checked: boolean | 'indeterminate') {
    setActivities((prev) => {
      const set = new Set(prev);
      if (checked === true) set.add(label);
      else set.delete(label);
      // Preserve canonical order
      return ACTIVITY_OPTIONS.filter((a) => set.has(a));
    });
  }

  function handleClockIn(projectId: string) {
    setError(null);
    setClockingProjectId(projectId);

    startTransition(async () => {
      try {
        const result = await clockIn(
          workspaceId,
          projectId,
          undefined,
          undefined,
          undefined,
          activities
        );

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
    <Dialog open={open} onOpenChange={(v) => !v && isAdmin && onDismiss?.()} modal>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md"
        showCloseButton={isAdmin}
        onEscapeKeyDown={(e) => !isAdmin && e.preventDefault()}
        onInteractOutside={(e) => !isAdmin && e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <LogIn className="size-4 text-primary" />
            <DialogTitle>Clock In</DialogTitle>
          </div>
          <DialogDescription>
            Pick what you&apos;ll be working on, then tap a project to start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session start time */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2">
            <Clock className="size-3.5 text-primary" />
            <span className="text-sm text-foreground">
              Starting at{' '}
              <span className="font-semibold tabular-nums text-primary">
                {format(new Date(), 'h:mm a')}
              </span>
            </span>
          </div>

          {/* Activities multi-select */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              What will you be working on?{' '}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/60">
                · pick one or many
              </span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ACTIVITY_OPTIONS.map((label) => {
                const checked = activities.includes(label);
                const id = `activity-${label.replace(/\W+/g, '-').toLowerCase()}`;
                return (
                  <label
                    key={label}
                    htmlFor={id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      checked
                        ? 'border-primary/50 bg-primary/[0.06] text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(v) => toggleActivity(label, v)}
                      disabled={isPending}
                      className="size-3.5"
                    />
                    <span className="truncate">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Project buttons */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Project
            </p>
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
                    className="h-auto w-full cursor-pointer justify-start px-4 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-primary/5"
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
