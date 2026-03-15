'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TeamMemberTaskTimeLog } from '@/app/actions/team-dashboard';

interface TaskTimeTrackerProps {
  taskId: string;
  timeLog: TeamMemberTaskTimeLog | null;
  readOnly?: boolean;
  onUpdate?: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

export function TaskTimeTracker({
  taskId,
  timeLog,
  readOnly = false,
  onUpdate,
}: TaskTimeTrackerProps) {
  // Determine initial state from timeLog
  const isRunning = !!timeLog && !timeLog.finished_at;
  const isDone = !!timeLog && !!timeLog.finished_at && timeLog.time_spent_minutes != null;

  const [running, setRunning] = useState(isRunning);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (isRunning && timeLog) {
      return Math.floor((Date.now() - new Date(timeLog.started_at).getTime()) / 1000);
    }
    return 0;
  });
  const [pending, setPending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live counter when running
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 10);
      }, 10_000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Sync state if parent timeLog prop changes (e.g. after parent refresh)
  useEffect(() => {
    const nowRunning = !!timeLog && !timeLog.finished_at;
    setRunning(nowRunning);
    if (nowRunning && timeLog) {
      setElapsedSeconds(Math.floor((Date.now() - new Date(timeLog.started_at).getTime()) / 1000));
    }
  }, [timeLog]);

  const handleStart = useCallback(async () => {
    setPending(true);
    try {
      const { startTaskTimer } = await import('@/app/actions/time-logs');
      const result = await startTaskTimer(taskId);
      if (result.success) {
        setRunning(true);
        setElapsedSeconds(0);
        onUpdate?.();
      }
    } finally {
      setPending(false);
    }
  }, [taskId, onUpdate]);

  const handleStop = useCallback(async () => {
    setPending(true);
    try {
      const { stopTaskTimer } = await import('@/app/actions/time-logs');
      const result = await stopTaskTimer(taskId);
      if (result.success) {
        setRunning(false);
        onUpdate?.();
      }
    } finally {
      setPending(false);
    }
  }, [taskId, onUpdate]);

  // Read-only: just show time badge if there's a completed log
  if (readOnly) {
    if (!timeLog || timeLog.time_spent_minutes == null) return null;
    return (
      <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
        <Clock className="size-3" />
        {formatMinutes(timeLog.time_spent_minutes)}
      </span>
    );
  }

  // Not started yet
  if (!running && !isDone) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-muted-foreground/50 hover:text-qualia-500"
        onClick={handleStart}
        disabled={pending}
        aria-label="Start timer"
        title="Start tracking time"
      >
        <Play className="size-3.5" />
      </Button>
    );
  }

  // Timer running — show live counter + stop button
  if (running) {
    return (
      <div className="flex items-center gap-1">
        <span
          className={cn(
            'rounded bg-qualia-500/10 px-1.5 py-0.5 text-xs tabular-nums text-qualia-600 dark:text-qualia-400'
          )}
        >
          {formatElapsed(elapsedSeconds)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-red-500/70 hover:text-red-500"
          onClick={handleStop}
          disabled={pending}
          aria-label="Stop timer"
          title="Stop timer"
        >
          <Square className="size-3.5" />
        </Button>
      </div>
    );
  }

  // Done — show completed time badge
  return (
    <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
      <Clock className="size-3" />
      {timeLog?.time_spent_minutes != null ? formatMinutes(timeLog.time_spent_minutes) : '—'}
    </span>
  );
}
