'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  LogIn,
  Clock,
  AlertCircle,
  Loader2,
  FolderOpen,
  MoreHorizontal,
  ArrowLeft,
  Timer,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { clockIn } from '@/app/actions/work-sessions';
import { invalidateActiveSession } from '@/lib/swr';
import { getEmployeeAssignments } from '@/app/actions/project-assignments';
import { getActiveProjects } from '@/app/actions/projects';
import { useAdminContext } from '@/components/admin-provider';
import { format } from 'date-fns';

interface ClockInModalProps {
  open: boolean;
  workspaceId: string;
  currentUserId: string | null;
  onSuccess: () => void;
  onDismiss?: () => void;
}

export function ClockInModal({
  open,
  workspaceId,
  currentUserId,
  onSuccess,
  onDismiss,
}: ClockInModalProps) {
  const { isAdmin } = useAdminContext();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockingProjectId, setClockingProjectId] = useState<string | null>(null);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherNote, setOtherNote] = useState('');
  const [plannedDuration, setPlannedDuration] = useState<number | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !currentUserId) return;

    setLoadingProjects(true);
    setError(null);
    setClockingProjectId(null);
    setShowOtherInput(false);
    setOtherNote('');
    setPlannedDuration(null);
    setOtherReason('');

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
  }, [open, currentUserId, isAdmin]);

  function handleClockIn(
    projectId: string | null,
    note?: string,
    duration?: number,
    reason?: string
  ) {
    setError(null);
    setClockingProjectId(projectId ?? '__other__');

    startTransition(async () => {
      try {
        const result = await clockIn(workspaceId, projectId, note, duration, reason);

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
        className="w-[calc(100%-2rem)] max-w-sm"
        showCloseButton={isAdmin}
        onEscapeKeyDown={(e) => !isAdmin && e.preventDefault()}
        onInteractOutside={(e) => !isAdmin && e.preventDefault()}
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

          {/* Project buttons or Other input */}
          {showOtherInput ? (
            <div className="space-y-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setShowOtherInput(false);
                  setOtherNote('');
                  setPlannedDuration(null);
                  setOtherReason('');
                  setError(null);
                }}
                disabled={isPending}
              >
                <ArrowLeft className="size-3" />
                Back to projects
              </button>

              {/* Planned duration */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">
                  How long do you plan to be here?{' '}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '1 hour', value: 60 },
                    { label: '2 hours', value: 120 },
                    { label: '3 hours', value: 180 },
                    { label: '4 hours', value: 240 },
                    { label: '6 hours', value: 360 },
                    { label: '8 hours', value: 480 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        plannedDuration === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                      onClick={() => setPlannedDuration(opt.value)}
                      disabled={isPending}
                    >
                      <Timer className="size-3" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">
                  Why?{' '}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Textarea
                  placeholder="Why are you clocking in under Other?"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                  disabled={isPending}
                />
              </div>

              {/* What are you working on */}
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">
                  What will you be working on?{' '}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Textarea
                  placeholder="Describe the task or activity..."
                  value={otherNote}
                  onChange={(e) => setOtherNote(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                  autoFocus
                  disabled={isPending}
                />
              </div>

              <Button
                className="w-full"
                disabled={isPending || !otherNote.trim() || !plannedDuration || !otherReason.trim()}
                onClick={() => handleClockIn(null, otherNote, plannedDuration!, otherReason)}
              >
                {clockingProjectId === '__other__' ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 size-4" />
                )}
                Start Session
              </Button>
            </div>
          ) : (
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

              {/* Other option */}
              {!loadingProjects && (
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start border-dashed px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  disabled={isPending}
                  onClick={() => setShowOtherInput(true)}
                >
                  <MoreHorizontal className="mr-2 size-4" />
                  Other
                </Button>
              )}
            </div>
          )}

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
