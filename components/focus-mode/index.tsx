'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Coffee,
  Zap,
  Target,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface FocusTask {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
  project?: { name: string } | null;
}

interface FocusModeProps {
  tasks: FocusTask[];
  onTaskComplete?: (taskId: string) => void;
}

// Pomodoro Timer States
type TimerState = 'idle' | 'focus' | 'break' | 'longBreak';

// Timer durations in seconds
const DURATIONS = {
  focus: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60,
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

// Format time display
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Circular Progress Component
function CircularProgress({
  progress,
  size = 280,
  strokeWidth = 6,
  state,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  state: TimerState;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;

  const colors = {
    idle: 'hsl(var(--muted-foreground))',
    focus: 'hsl(var(--primary))',
    break: 'hsl(142 71% 45%)',
    longBreak: 'hsl(262 83% 58%)',
  };

  return (
    <svg className="rotate-[-90deg]" width={size} height={size}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted) / 0.3)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colors[state]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
}

// Focus Task Item
function FocusTaskItem({
  task,
  isActive,
  onSelect,
  onComplete,
}: {
  task: FocusTask;
  isActive: boolean;
  onSelect: () => void;
  onComplete: () => void;
}) {
  return (
    <motion.div
      layout
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-4 transition-all duration-200',
        task.completed
          ? 'border-emerald-500/30 bg-emerald-500/5 opacity-60'
          : isActive
            ? 'border-qualia-500/50 bg-qualia-500/10 shadow-lg shadow-qualia-500/10'
            : 'border-border/60 bg-card hover:border-border hover:shadow-md'
      )}
      whileHover={{ scale: task.completed ? 1 : 1.01 }}
      onClick={!task.completed ? onSelect : undefined}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!task.completed) onComplete();
        }}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          task.completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-muted-foreground/30 hover:border-qualia-500 hover:bg-qualia-500/10'
        )}
      >
        {task.completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4 opacity-0 group-hover:opacity-50" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium',
            task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </p>
        {task.project && (
          <p className="mt-0.5 text-xs text-muted-foreground">{task.project.name}</p>
        )}
      </div>

      {isActive && !task.completed && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex h-6 items-center rounded-full bg-qualia-500 px-2 text-xs font-medium text-white"
        >
          <Zap className="mr-1 h-3 w-3" />
          Active
        </motion.div>
      )}
    </motion.div>
  );
}

// Main Focus Mode Component
export function FocusMode({ tasks: initialTasks, onTaskComplete }: FocusModeProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(
    initialTasks.find((t) => !t.completed)?.id || null
  );
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [showTasks, setShowTasks] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate progress
  const progress = useMemo(() => {
    const duration =
      timerState === 'break'
        ? DURATIONS.break
        : timerState === 'longBreak'
          ? DURATIONS.longBreak
          : DURATIONS.focus;
    return 1 - timeRemaining / duration;
  }, [timeRemaining, timerState]);

  // Get active task
  const activeTask = useMemo(() => tasks.find((t) => t.id === activeTaskId), [tasks, activeTaskId]);

  // Completed tasks count
  const completedTasksCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer completed
          setIsRunning(false);

          if (timerState === 'focus') {
            const newCount = completedPomodoros + 1;
            setCompletedPomodoros(newCount);

            // Every 4 pomodoros, take a long break
            if (newCount % 4 === 0) {
              setTimerState('longBreak');
              setTimeRemaining(DURATIONS.longBreak);
            } else {
              setTimerState('break');
              setTimeRemaining(DURATIONS.break);
            }

            // Play sound
            if (isSoundEnabled) {
              // Could add actual sound here
            }
          } else {
            // Break completed, back to focus
            setTimerState('focus');
            setTimeRemaining(DURATIONS.focus);
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timerState, completedPomodoros, isSoundEnabled]);

  // Start/Pause timer
  const toggleTimer = useCallback(() => {
    if (timerState === 'idle') {
      setTimerState('focus');
      setTimeRemaining(DURATIONS.focus);
    }
    setIsRunning((prev) => !prev);
  }, [timerState]);

  // Reset timer
  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimerState('idle');
    setTimeRemaining(DURATIONS.focus);
  }, []);

  // Complete task
  const handleCompleteTask = useCallback(
    (taskId: string) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));

      // Find next incomplete task
      const nextTask = tasks.find((t) => t.id !== taskId && !t.completed);
      if (nextTask) {
        setActiveTaskId(nextTask.id);
      }

      onTaskComplete?.(taskId);
    },
    [tasks, onTaskComplete]
  );

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // State labels
  const stateLabels = {
    idle: 'Ready to Focus',
    focus: 'Deep Focus',
    break: 'Short Break',
    longBreak: 'Long Break',
  };

  const stateColors = {
    idle: 'text-muted-foreground',
    focus: 'text-qualia-500',
    break: 'text-emerald-500',
    longBreak: 'text-violet-500',
  };

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-background transition-all duration-500',
        isFullscreen && 'fixed inset-0 z-50'
      )}
    >
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className={cn(
            'absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]',
            timerState === 'focus' && 'bg-qualia-500/10',
            timerState === 'break' && 'bg-emerald-500/10',
            timerState === 'longBreak' && 'bg-violet-500/10',
            timerState === 'idle' && 'bg-muted/10'
          )}
          animate={{
            scale: isRunning ? [1, 1.1, 1] : 1,
            opacity: isRunning ? [0.3, 0.5, 0.3] : 0.2,
          }}
          transition={{
            duration: 4,
            repeat: isRunning ? Infinity : 0,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="relative flex items-center justify-between border-b border-border/40 bg-background/80 px-6 py-4 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit Focus Mode
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-8">
        <motion.div
          className="flex flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Timer Display */}
          <motion.div variants={itemVariants} className="relative mb-8">
            <CircularProgress progress={progress} state={timerState} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-6xl font-bold tracking-tight text-foreground"
                key={timeRemaining}
                initial={{ scale: 1.1, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {formatTime(timeRemaining)}
              </motion.span>
              <span className={cn('mt-2 text-sm font-medium', stateColors[timerState])}>
                {stateLabels[timerState]}
              </span>
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div variants={itemVariants} className="mb-8 flex items-center gap-4">
            <button
              onClick={resetTimer}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <motion.button
              onClick={toggleTimer}
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all',
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : timerState === 'break' || timerState === 'longBreak'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-qualia-500 hover:bg-qualia-600'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isRunning ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
            </motion.button>

            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card">
              <span className="text-sm font-bold text-foreground">{completedPomodoros}</span>
              <Coffee className="ml-1 h-3 w-3 text-muted-foreground" />
            </div>
          </motion.div>

          {/* Active Task Display */}
          {activeTask && (
            <motion.div
              variants={itemVariants}
              className="mb-6 rounded-xl border border-qualia-500/30 bg-qualia-500/5 px-6 py-4 text-center"
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-qualia-500">
                Currently Working On
              </p>
              <p className="text-lg font-semibold text-foreground">{activeTask.title}</p>
              {activeTask.project && (
                <p className="mt-1 text-sm text-muted-foreground">{activeTask.project.name}</p>
              )}
            </motion.div>
          )}

          {/* Task Stats */}
          <motion.div variants={itemVariants} className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">
                {completedTasksCount} / {tasks.length} tasks
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-qualia-500" />
              <span className="text-muted-foreground">{completedPomodoros} pomodoros</span>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Task List Drawer */}
      <motion.div
        className="relative border-t border-border/40 bg-card/80 backdrop-blur-sm"
        initial={{ height: showTasks ? 'auto' : 56 }}
        animate={{ height: showTasks ? 'auto' : 56 }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setShowTasks(!showTasks)}
          className="flex w-full items-center justify-center gap-2 py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {showTasks ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Hide Tasks
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" />
              Show Tasks ({tasks.filter((t) => !t.completed).length} remaining)
            </>
          )}
        </button>

        {/* Task List */}
        <AnimatePresence>
          {showTasks && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-auto max-w-2xl space-y-2 px-4 pb-6">
                {tasks.map((task) => (
                  <FocusTaskItem
                    key={task.id}
                    task={task}
                    isActive={task.id === activeTaskId}
                    onSelect={() => setActiveTaskId(task.id)}
                    onComplete={() => handleCompleteTask(task.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default FocusMode;
