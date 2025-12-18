'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Coffee,
  Brain,
  Target,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface TimerSettings {
  workDuration: number; // in minutes
  shortBreak: number;
  longBreak: number;
  sessionsUntilLongBreak: number;
  soundEnabled: boolean;
  ambientEnabled: boolean;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

interface SessionData {
  id: string;
  type: 'work' | 'break';
  duration: number;
  startTime: Date;
  endTime?: Date;
  projectId?: string;
  taskId?: string;
}

export function FocusTimer({ projectId, taskId }: { projectId?: string; taskId?: string }) {
  const [settings, setSettings] = useState<TimerSettings>({
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsUntilLongBreak: 4,
    soundEnabled: true,
    ambientEnabled: true,
    autoStartBreaks: false,
    autoStartWork: false,
  });

  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [todaysSessions, setTodaysSessions] = useState(0);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
    loadTodaysSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft]);

  const loadSettings = async () => {
    // Load from localStorage or user preferences
    const saved = localStorage.getItem('focusTimerSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    localStorage.setItem('focusTimerSettings', JSON.stringify(newSettings));
  };

  const loadTodaysSessions = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // This would fetch from a sessions table
    // For now, using mock data
    setTodaysSessions(Math.floor(Math.random() * 8) + 1);
  };

  const startTimer = async () => {
    setIsRunning(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const session: SessionData = {
      id: crypto.randomUUID(),
      type: mode === 'work' ? 'work' : 'break',
      duration: timeLeft,
      startTime: new Date(),
      projectId,
      taskId,
    };

    setCurrentSession(session);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    const duration =
      mode === 'work'
        ? settings.workDuration
        : mode === 'shortBreak'
          ? settings.shortBreak
          : settings.longBreak;
    setTimeLeft(duration * 60);
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);

    // Play sound
    if (settings.soundEnabled) {
      playSound();
    }

    // Save session
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        endTime: new Date(),
      };

      // Save to database here
      console.log('Session completed:', completedSession);
    }

    // Update session count
    if (mode === 'work') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      setTodaysSessions((prev) => prev + 1);

      // Determine next mode
      if (newCount % settings.sessionsUntilLongBreak === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }

      // Auto-start break if enabled
      if (settings.autoStartBreaks) {
        setTimeout(() => startTimer(), 1000);
      }
    } else {
      // After break, switch to work
      switchMode('work');

      // Auto-start work if enabled
      if (settings.autoStartWork) {
        setTimeout(() => startTimer(), 1000);
      }
    }
  };

  const switchMode = (newMode: 'work' | 'shortBreak' | 'longBreak') => {
    setMode(newMode);
    const duration =
      newMode === 'work'
        ? settings.workDuration
        : newMode === 'shortBreak'
          ? settings.shortBreak
          : settings.longBreak;
    setTimeLeft(duration * 60);
  };

  const playSound = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/timer-complete.mp3');
    }
    audioRef.current.play().catch(console.error);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    const totalDuration =
      mode === 'work'
        ? settings.workDuration * 60
        : mode === 'shortBreak'
          ? settings.shortBreak * 60
          : settings.longBreak * 60;
    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  const getModeColor = (): string => {
    switch (mode) {
      case 'work':
        return 'from-red-500 to-orange-500';
      case 'shortBreak':
        return 'from-green-500 to-teal-500';
      case 'longBreak':
        return 'from-blue-500 to-purple-500';
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'work':
        return <Target className="h-6 w-6" />;
      case 'shortBreak':
        return <Coffee className="h-6 w-6" />;
      case 'longBreak':
        return <Brain className="h-6 w-6" />;
    }
  };

  return (
    <>
      {/* Ambient Background */}
      {settings.ambientEnabled && isRunning && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <motion.div
            className={cn('absolute inset-0 bg-gradient-to-br opacity-20', getModeColor())}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <AmbientParticles color={mode === 'work' ? '#ef4444' : '#10b981'} />
        </div>
      )}

      <Card
        className={cn(
          'relative p-8 transition-all duration-500',
          isFullscreen &&
            'fixed inset-0 z-50 flex h-screen items-center justify-center rounded-none'
        )}
      >
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getModeIcon()}
              <h2 className="text-2xl font-bold capitalize">
                {mode === 'shortBreak'
                  ? 'Short Break'
                  : mode === 'longBreak'
                    ? 'Long Break'
                    : 'Focus Time'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => saveSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
              >
                {settings.soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
              <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="mb-8 text-center">
            <motion.div
              className="relative inline-block"
              animate={{ scale: isRunning ? 1 : 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {/* Progress Ring */}
              <svg className="h-64 w-64">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-secondary"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={754}
                  strokeDashoffset={754 - (754 * getProgressPercentage()) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 128 128)"
                  transition={{ duration: 0.5 }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={mode === 'work' ? '#ef4444' : '#10b981'} />
                    <stop offset="100%" stopColor={mode === 'work' ? '#f97316' : '#14b8a6'} />
                  </linearGradient>
                </defs>
              </svg>

              {/* Time Display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="font-mono text-6xl font-bold">{formatTime(timeLeft)}</div>
              </div>
            </motion.div>
          </div>

          {/* Controls */}
          <div className="mb-8 flex items-center justify-center gap-4">
            {!isRunning ? (
              <Button
                size="lg"
                className={cn('bg-gradient-to-r', getModeColor())}
                onClick={startTimer}
              >
                <Play className="mr-2 h-5 w-5" />
                Start
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={pauseTimer}>
                <Pause className="mr-2 h-5 w-5" />
                Pause
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={resetTimer}>
              <RotateCcw className="mr-2 h-5 w-5" />
              Reset
            </Button>
          </div>

          {/* Mode Switcher */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <Button
              variant={mode === 'work' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode('work')}
              disabled={isRunning}
            >
              Work
            </Button>
            <Button
              variant={mode === 'shortBreak' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode('shortBreak')}
              disabled={isRunning}
            >
              Short Break
            </Button>
            <Button
              variant={mode === 'longBreak' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode('longBreak')}
              disabled={isRunning}
            >
              Long Break
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Session #{sessionCount + 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              <span>Today: {todaysSessions} sessions</span>
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 rounded-lg border bg-card p-6"
              >
                <h3 className="mb-4 font-semibold">Timer Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Work Duration: {settings.workDuration} min
                    </label>
                    <Slider
                      value={[settings.workDuration]}
                      onValueChange={(value: number[]) =>
                        saveSettings({ ...settings, workDuration: value[0] })
                      }
                      min={15}
                      max={60}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Short Break: {settings.shortBreak} min
                    </label>
                    <Slider
                      value={[settings.shortBreak]}
                      onValueChange={(value: number[]) =>
                        saveSettings({ ...settings, shortBreak: value[0] })
                      }
                      min={3}
                      max={15}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Long Break: {settings.longBreak} min
                    </label>
                    <Slider
                      value={[settings.longBreak]}
                      onValueChange={(value: number[]) =>
                        saveSettings({ ...settings, longBreak: value[0] })
                      }
                      min={10}
                      max={30}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </>
  );
}

// Ambient Particles Component
function AmbientParticles({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 h-full w-full">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.circle
          key={i}
          cx={Math.random() * 100 + '%'}
          cy={Math.random() * 100 + '%'}
          r={Math.random() * 4 + 2}
          fill={color}
          opacity={0.1}
          animate={{
            y: [0, -100, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
    </svg>
  );
}
