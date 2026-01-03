'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocusTimerWidgetProps {
  initialMinutes?: number;
  onComplete?: () => void;
  className?: string;
}

export function FocusTimerWidget({
  initialMinutes = 25,
  onComplete,
  className,
}: FocusTimerWidgetProps) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load session count from localStorage
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(`focus-sessions-${today}`);
    if (stored) {
      setSessionCount(parseInt(stored, 10));
    }
  }, []);

  // Use ref to avoid stale closure in timer effect
  const handleCompleteRef = useRef<() => void>(() => {});
  handleCompleteRef.current = () => {
    // Play sound
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    // Increment session count
    const today = new Date().toISOString().split('T')[0];
    const newCount = sessionCount + 1;
    setSessionCount(newCount);
    localStorage.setItem(`focus-sessions-${today}`, String(newCount));

    onComplete?.();
  };

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            handleCompleteRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialMinutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((initialMinutes * 60 - timeLeft) / (initialMinutes * 60)) * 100;

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      {/* Hidden audio for completion sound */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/timer-complete.mp3" type="audio/mpeg" />
      </audio>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Focus Timer</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {sessionCount} session{sessionCount !== 1 ? 's' : ''} today
        </span>
      </div>

      {/* Timer display */}
      <div className="mb-4 text-center">
        <div
          className={cn(
            'font-mono text-4xl font-bold tracking-wider',
            isRunning ? 'text-blue-500' : 'text-foreground'
          )}
        >
          {formatTime(timeLeft)}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full transition-all duration-1000',
              isRunning ? 'bg-blue-500' : 'bg-muted-foreground/30'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={resetTimer}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/50 transition-colors hover:bg-muted"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={toggleTimer}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
            isRunning
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          )}
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
        </button>
        <div className="h-10 w-10" /> {/* Spacer for symmetry */}
      </div>

      {/* Quick duration presets */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {[15, 25, 45].map((mins) => (
          <button
            key={mins}
            onClick={() => {
              setIsRunning(false);
              setTimeLeft(mins * 60);
            }}
            className={cn(
              'rounded-md px-2 py-1 text-xs transition-colors',
              timeLeft === mins * 60 && !isRunning
                ? 'bg-blue-500/20 text-blue-500'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {mins}m
          </button>
        ))}
      </div>
    </div>
  );
}
