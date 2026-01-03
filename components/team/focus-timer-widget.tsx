'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
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
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
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

  const toggleTimer = () => setIsRunning(!isRunning);
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
    <div className={cn('rounded-lg border border-border/60 bg-card/50', className)}>
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/timer-complete.mp3" type="audio/mpeg" />
      </audio>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <span className="text-sm font-medium text-foreground">Focus Timer</span>
        <span className="text-xs tabular-nums text-muted-foreground/60">
          {sessionCount} session{sessionCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timer display */}
      <div className="px-4 py-6">
        <div className="text-center">
          <div
            className={cn(
              'font-mono text-4xl font-light tracking-widest transition-colors duration-300',
              isRunning ? 'text-foreground' : 'text-foreground/60'
            )}
          >
            {formatTime(timeLeft)}
          </div>

          {/* Progress bar */}
          <div className="mx-auto mt-4 h-0.5 w-32 overflow-hidden rounded-full bg-border/40">
            <div
              className="h-full bg-foreground/30 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={resetTimer}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border border-border/60',
              'text-muted-foreground/60 transition-all duration-150',
              'hover:border-border hover:bg-muted/30 hover:text-foreground'
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={toggleTimer}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-150',
              isRunning
                ? 'border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10'
                : 'border-border bg-background text-foreground/80 hover:bg-muted/50'
            )}
          >
            {isRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 translate-x-0.5" />
            )}
          </button>

          <div className="h-9 w-9" />
        </div>

        {/* Duration presets */}
        <div className="mt-5 flex items-center justify-center gap-1">
          {[15, 25, 45].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(mins * 60);
              }}
              className={cn(
                'rounded px-3 py-1 text-xs font-medium transition-colors duration-150',
                timeLeft === mins * 60 && !isRunning
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground/50 hover:bg-muted/50 hover:text-foreground/70'
              )}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
