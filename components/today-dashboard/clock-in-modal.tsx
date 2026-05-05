'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { LogIn, Clock, AlertCircle, Loader2, FolderOpen, FileText, Check } from 'lucide-react';
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
import { cn } from '@/lib/utils';
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

type Step = 'pick' | 'plan';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>('pick');
  const [plannedOutcome, setPlannedOutcome] = useState('');
  const [plannedMinutes, setPlannedMinutes] = useState<number>(60);
  const [isPending, startTransition] = useTransition();

  const presets = useMemo<WorkPreset[]>(() => getWorkPresetsForEmail(userEmail), [userEmail]);

  useEffect(() => {
    if (!open || !currentUserId) return;

    setLoadingProjects(true);
    setError(null);
    setSelectedIds(new Set());
    setStep('pick');
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

  function toggleProject(projectId: string) {
    setError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  function togglePreset(preset: WorkPreset) {
    setError(null);
    const resolvedProjectId = resolveWorkPresetProjectId(preset, projects);
    if (!resolvedProjectId) {
      setError(`${preset.label} is not bound to an assigned project yet. Contact your admin.`);
      return;
    }
    toggleProject(resolvedProjectId);
  }

  function handleContinue() {
    if (selectedIds.size === 0) {
      setError('Pick at least one project.');
      return;
    }
    setError(null);
    setStep('plan');
  }

  function handleBack() {
    setStep('pick');
    setError(null);
  }

  function handleClockIn() {
    if (selectedIds.size === 0) return;
    if (!plannedOutcome.trim()) {
      setError('Tell the team in one sentence what you plan to ship this session.');
      return;
    }
    if (!plannedMinutes || plannedMinutes <= 0) {
      setError('Pick how long you plan to work.');
      return;
    }

    setError(null);

    const projectIds = Array.from(selectedIds);

    startTransition(async () => {
      try {
        const result = await clockIn(
          workspaceId,
          projectIds,
          plannedOutcome.trim(),
          plannedMinutes
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

  const selectedNames = Array.from(selectedIds)
    .map((id) => projects.find((p) => p.id === id)?.name)
    .filter(Boolean) as string[];

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
            {step === 'pick'
              ? 'Tick every project you plan to work on this session — you’ll need a /qualia-report from each one to clock out.'
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

          {step === 'pick' && (
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

              {/* Configurable presets — pinned above project list. */}
              {!loadingProjects &&
                presets.map((preset) => {
                  const presetProjectId = resolveWorkPresetProjectId(preset, projects);
                  const checked = !!presetProjectId && selectedIds.has(presetProjectId);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={isPending}
                      onClick={() => togglePreset(preset)}
                      className={cn(
                        'flex h-auto w-full cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                        checked
                          ? 'border-primary bg-primary/[0.10] text-foreground'
                          : 'border-primary/30 bg-primary/[0.04] hover:border-primary/50 hover:bg-primary/[0.08]'
                      )}
                    >
                      <Checkbox checked={checked} />
                      <FileText className="size-4 text-primary" />
                      <span className="flex-1 truncate">{preset.label}</span>
                    </button>
                  );
                })}

              {!loadingProjects &&
                projects.map((p) => {
                  const checked = selectedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={isPending}
                      onClick={() => toggleProject(p.id)}
                      className={cn(
                        'flex h-auto w-full cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                        checked
                          ? 'border-primary bg-primary/[0.10] text-foreground'
                          : 'border-border hover:border-primary/40 hover:bg-primary/5'
                      )}
                    >
                      <Checkbox checked={checked} />
                      <FolderOpen
                        className={cn('size-4', checked ? 'text-primary' : 'text-muted-foreground')}
                      />
                      <span className="flex-1 truncate">{p.name}</span>
                    </button>
                  );
                })}

              {!loadingProjects && (projects.length > 0 || presets.length > 0) && (
                <Button
                  type="button"
                  className="mt-2 h-10 w-full cursor-pointer text-sm font-semibold"
                  disabled={isPending || selectedIds.size === 0}
                  onClick={handleContinue}
                >
                  Continue
                  {selectedIds.size > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary-foreground/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                      {selectedIds.size}
                    </span>
                  )}
                </Button>
              )}
            </div>
          )}

          {step === 'plan' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Working on{' '}
                    <span className="tabular-nums">
                      {selectedIds.size} project{selectedIds.size === 1 ? '' : 's'}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 cursor-pointer px-2 text-[11px] text-muted-foreground"
                    onClick={handleBack}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-md bg-primary/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                    >
                      {name}
                    </span>
                  ))}
                </div>
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

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

// Re-export so legacy tests/imports that reference the constant keep working.
export { isWorkPresetId };
