'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { LogIn, Clock, AlertCircle, Loader2, FolderOpen, FileText, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { clockIn } from '@/app/actions/work-sessions';
import { invalidateActiveSession } from '@/lib/swr';
import { getEmployeeAssignments } from '@/app/actions/project-assignments';
import { getActiveProjects } from '@/app/actions/projects';
import { useAdminContext } from '@/components/admin-provider';
import {
  getWorkPresetsForEmail,
  resolveWorkPresetProjectId,
  isWorkPresetId,
  type WorkPreset,
} from '@/lib/work-presets';
import { format } from 'date-fns';

interface ClockInModalProps {
  open: boolean;
  workspaceId: string;
  currentUserId: string | null;
  onSuccess: () => void;
  onDismiss?: () => void;
}

const DURATION_PRESETS: Array<{ minutes: number; label: string }> = [
  { minutes: 30, label: '30m' },
  { minutes: 60, label: '1h' },
  { minutes: 120, label: '2h' },
  { minutes: 240, label: '4h' },
  { minutes: 480, label: 'Full day' },
];

interface SelectedTarget {
  type: 'project' | 'preset';
  /** Stable id used by the UI list (project.id OR preset.id). */
  id: string;
  /** Resolved project UUID — for presets this comes from the bound project. */
  projectId: string;
  /** Display name for the plan-step header. */
  label: string;
}

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
  const [target, setTarget] = useState<SelectedTarget | null>(null);
  const [plannedOutcome, setPlannedOutcome] = useState('');
  const [plannedMinutes, setPlannedMinutes] = useState<number>(60);
  const [isPending, startTransition] = useTransition();

  const presets = useMemo<WorkPreset[]>(() => getWorkPresetsForEmail(userEmail), [userEmail]);

  useEffect(() => {
    if (!open || !currentUserId) return;

    setLoadingProjects(true);
    setError(null);
    setTarget(null);
    setPlannedOutcome('');
    setPlannedMinutes(60);

    // Admin sees all active projects; employees see only assigned ones.
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

  function handlePickProject(p: { id: string; name: string }) {
    setError(null);
    setTarget({ type: 'project', id: p.id, projectId: p.id, label: p.name });
  }

  function handlePickPreset(preset: WorkPreset) {
    setError(null);
    const resolvedProjectId = resolveWorkPresetProjectId(preset, projects);
    if (!resolvedProjectId) {
      setError(`${preset.label} is not bound to an assigned project yet. Contact your admin.`);
      return;
    }
    setTarget({
      type: 'preset',
      id: preset.id,
      projectId: resolvedProjectId,
      label: preset.label,
    });
  }

  function handleBack() {
    setTarget(null);
    setError(null);
  }

  function handleClockIn() {
    if (!target) return;
    if (!plannedOutcome.trim()) {
      setError('Tell the team in one sentence what you plan to ship this session.');
      return;
    }
    if (!plannedMinutes || plannedMinutes <= 0) {
      setError('Pick how long you plan to work.');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const reasonForLog = target.type === 'preset' ? `[preset] ${target.label}` : target.label;
        const result = await clockIn(
          workspaceId,
          target.projectId,
          plannedOutcome.trim(),
          plannedMinutes,
          reasonForLog
        );

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
  }

  const showPickStep = target === null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && isAdmin && onDismiss?.()} modal>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-sm"
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
            {showPickStep
              ? "Pick the project you're working on, then commit to a plan."
              : 'One sentence on what you plan to ship — and how long you expect it to take.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session start time — visible on both steps */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2">
            <Clock className="size-3.5 text-primary" />
            <span className="text-sm text-foreground">
              Starting at{' '}
              <span className="font-semibold tabular-nums text-primary">
                {format(new Date(), 'h:mm a')}
              </span>
            </span>
          </div>

          {showPickStep && (
            <div className="space-y-2">
              {loadingProjects && (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Loading projects...</span>
                </div>
              )}

              {!loadingProjects && projects.length === 0 && presets.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FolderOpen className="size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No projects assigned — contact your admin.
                  </p>
                </div>
              )}

              {/* Configurable presets — pinned above project list. Source: lib/work-presets.ts. */}
              {!loadingProjects &&
                presets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    className="h-auto w-full cursor-pointer justify-start border-primary/30 bg-primary/[0.04] px-4 py-3 text-left text-sm font-medium hover:border-primary/50 hover:bg-primary/[0.08]"
                    disabled={isPending}
                    onClick={() => handlePickPreset(preset)}
                  >
                    <FileText className="mr-2 size-4 text-primary" />
                    {preset.label}
                  </Button>
                ))}

              {!loadingProjects &&
                projects.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="h-auto w-full cursor-pointer justify-start px-4 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-primary/5"
                    disabled={isPending}
                    onClick={() => handlePickProject(p)}
                  >
                    <FolderOpen className="mr-2 size-4 text-muted-foreground" />
                    {p.name}
                  </Button>
                ))}
            </div>
          )}

          {!showPickStep && target && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 cursor-pointer gap-1 px-2 text-xs"
                  onClick={handleBack}
                  disabled={isPending}
                  aria-label="Back to project picker"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </Button>
                <span className="text-xs text-muted-foreground">Working on</span>
                <span className="ml-auto truncate text-sm font-semibold text-foreground">
                  {target.label}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clock-in-outcome" className="text-sm font-medium">
                  Planned outcome
                </Label>
                <Textarea
                  id="clock-in-outcome"
                  value={plannedOutcome}
                  onChange={(e) => {
                    setPlannedOutcome(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Wire up the deadline-health admin panel and ship behind a flag."
                  rows={3}
                  required
                  aria-required="true"
                  className="resize-none text-sm"
                  disabled={isPending}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Planned duration</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {DURATION_PRESETS.map((d) => {
                    const active = plannedMinutes === d.minutes;
                    return (
                      <Button
                        key={d.minutes}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 cursor-pointer px-2 text-xs"
                        disabled={isPending}
                        onClick={() => setPlannedMinutes(d.minutes)}
                        aria-pressed={active}
                      >
                        {d.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                className="h-10 w-full cursor-pointer text-sm font-semibold"
                disabled={isPending || !plannedOutcome.trim()}
                onClick={handleClockIn}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Clocking in…
                  </>
                ) : (
                  'Start session'
                )}
              </Button>
            </div>
          )}

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

// Re-export so legacy tests/imports that reference the constant keep working.
export { isWorkPresetId };
