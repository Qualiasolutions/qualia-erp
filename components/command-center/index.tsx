'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Target,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Users,
  Folder,
  MessageSquare,
  Phone,
  BarChart3,
  Flame,
  ChevronRight,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isPast, differenceInMinutes } from 'date-fns';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

// Types
interface CommandCenterProps {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
    workspaceId?: string;
  };
  stats: {
    todayTasks: number;
    completedToday: number;
    overdueTasks: number;
    upcomingMeetings: number;
    activeProjects: number;
    hotLeads: number;
    weeklyProgress: number;
  };
  meetings: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    meeting_link?: string | null;
    client?: { display_name: string } | null;
  }>;
  urgentTasks: Array<{
    id: string;
    title: string;
    priority: string;
    due_date: string | null;
    project?: { name: string } | null;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'task_completed' | 'meeting_scheduled' | 'project_updated' | 'client_added';
    message: string;
    timestamp: string;
  }>;
}

// Greeting based on time
function getGreeting(name: string): { greeting: string; emoji: string; subtext: string } {
  const hour = new Date().getHours();
  const firstName = name.split(' ')[0];

  if (hour < 6) {
    return {
      greeting: `Night owl mode, ${firstName}`,
      emoji: '🌙',
      subtext: "Let's make every hour count",
    };
  } else if (hour < 12) {
    return {
      greeting: `Good morning, ${firstName}`,
      emoji: '☀️',
      subtext: 'Ready to conquer the day?',
    };
  } else if (hour < 17) {
    return {
      greeting: `Good afternoon, ${firstName}`,
      emoji: '🚀',
      subtext: "You're in the zone",
    };
  } else if (hour < 21) {
    return {
      greeting: `Good evening, ${firstName}`,
      emoji: '✨',
      subtext: 'Finishing strong today',
    };
  } else {
    return {
      greeting: `Still grinding, ${firstName}?`,
      emoji: '💪',
      subtext: 'Champions work late',
    };
  }
}

// Status Indicator Component
function StatusIndicator({
  status,
  size = 'md',
}: {
  status: 'good' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  const colors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
  };

  return (
    <span className="relative flex">
      <span
        className={cn(
          sizes[size],
          colors[status],
          'absolute inline-flex animate-ping rounded-full opacity-75'
        )}
      />
      <span className={cn(sizes[size], colors[status], 'relative inline-flex rounded-full')} />
    </span>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  status,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  status?: 'good' | 'warning' | 'critical';
  href?: string;
}) {
  const content = (
    <motion.div
      variants={itemVariants}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5',
        'transition-all duration-300 hover:border-qualia-500/30 hover:shadow-lg hover:shadow-qualia-500/5',
        href && 'cursor-pointer'
      )}
      whileHover={{ y: -2 }}
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-qualia-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300',
              'bg-qualia-500/10 text-qualia-500 group-hover:bg-qualia-500 group-hover:text-white'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          {status && <StatusIndicator status={status} />}
        </div>

        {/* Value */}
        <div className="mb-1">
          <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
        </div>

        {/* Title & Subtitle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground/60">{subtitle}</p>}
          </div>

          {/* Trend */}
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                trend.value >= 0
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
              )}
            >
              <TrendingUp className={cn('h-3 w-3', trend.value < 0 && 'rotate-180')} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>

        {/* Arrow indicator for clickable cards */}
        {href && (
          <div className="absolute bottom-5 right-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            <ArrowRight className="h-4 w-4 text-qualia-500" />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Quick Action Button
function QuickAction({
  icon: Icon,
  label,
  href,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  variant?: 'default' | 'primary' | 'success';
}) {
  const variants = {
    default: 'bg-card hover:bg-muted border-border/60 text-foreground',
    primary: 'bg-qualia-500/10 hover:bg-qualia-500/20 border-qualia-500/30 text-qualia-500',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-500',
  };

  return (
    <Link href={href}>
      <motion.div
        className={cn(
          'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200',
          variants[variant]
        )}
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
        <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
      </motion.div>
    </Link>
  );
}

// Meeting Card Component
function MeetingCard({
  meeting,
  isNext,
}: {
  meeting: CommandCenterProps['meetings'][0];
  isNext?: boolean;
}) {
  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);
  const now = new Date();
  const isHappening = startTime <= now && endTime >= now;
  const minutesUntil = differenceInMinutes(startTime, now);

  return (
    <motion.div
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-200',
        isHappening
          ? 'border-qualia-500/50 bg-qualia-500/5'
          : isNext
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-border/60 bg-card hover:border-border'
      )}
      whileHover={{ scale: 1.01 }}
    >
      {isHappening && (
        <div className="absolute -left-px top-4 h-8 w-1 rounded-r-full bg-qualia-500" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{meeting.title}</p>
          {meeting.client && (
            <p className="mt-0.5 text-xs text-muted-foreground">{meeting.client.display_name}</p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isHappening ? (
            <span className="flex items-center gap-1.5 rounded-full bg-qualia-500/20 px-2 py-1 text-xs font-medium text-qualia-500">
              <StatusIndicator status="good" size="sm" />
              Now
            </span>
          ) : minutesUntil <= 30 && minutesUntil > 0 ? (
            <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-500">
              In {minutesUntil}m
            </span>
          ) : null}

          {meeting.meeting_link && (
            <a
              href={meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-qualia-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-qualia-600"
            >
              <Play className="h-3 w-3" />
              Join
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Task Card Component
function TaskCard({ task }: { task: CommandCenterProps['urgentTasks'][0] }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const priorityColors = {
    critical: 'border-l-red-500 bg-red-500/5',
    high: 'border-l-orange-500 bg-orange-500/5',
    medium: 'border-l-amber-500',
    low: 'border-l-slate-400',
  };

  return (
    <Link href={`/inbox`}>
      <motion.div
        className={cn(
          'group rounded-xl border border-l-4 border-border/60 p-4 transition-all duration-200 hover:border-border hover:shadow-md',
          priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium
        )}
        whileHover={{ x: 4 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground group-hover:text-qualia-500">
              {task.title}
            </p>
            {task.project && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Folder className="h-3 w-3" />
                {task.project.name}
              </p>
            )}
          </div>

          {isOverdue ? (
            <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
              Overdue
            </span>
          ) : isDueToday ? (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
              Today
            </span>
          ) : null}
        </div>
      </motion.div>
    </Link>
  );
}

// Progress Ring Component
function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(174 72% 60%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {Math.round(progress)}%
        </motion.span>
        <span className="text-xs text-muted-foreground">complete</span>
      </div>
    </div>
  );
}

// Main Command Center Component
export function CommandCenter({
  user,
  stats,
  meetings,
  urgentTasks,
  // recentActivity - TODO: implement activity feed
}: CommandCenterProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const greeting = useMemo(() => getGreeting(user.name), [user.name]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Determine overall status
  const overallStatus: 'good' | 'warning' | 'critical' = useMemo(() => {
    if (stats.overdueTasks > 3) return 'critical';
    if (stats.overdueTasks > 0 || stats.todayTasks > 10) return 'warning';
    return 'good';
  }, [stats]);

  // Filter upcoming meetings
  const upcomingMeetings = meetings.filter((m) => new Date(m.end_time) >= currentTime).slice(0, 3);

  const isFounder = user.name.toLowerCase().includes('fawzi');

  return (
    <motion.div
      className="min-h-screen bg-background pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Ambient Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-qualia-500/[0.03] blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/[0.02] blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <motion.header className="mb-8" variants={itemVariants}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-3">
                <motion.span className="text-3xl" variants={pulseVariants} animate="pulse">
                  {greeting.emoji}
                </motion.span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {greeting.greeting}
                </h1>
              </div>
              <p className="text-muted-foreground">{greeting.subtext}</p>
            </div>

            <div className="flex items-center gap-4">
              {/* System Status */}
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/80 px-4 py-2 backdrop-blur-sm">
                <StatusIndicator status={overallStatus} />
                <span className="text-sm font-medium text-foreground">
                  {overallStatus === 'good'
                    ? 'All Systems Go'
                    : overallStatus === 'warning'
                      ? 'Attention Needed'
                      : 'Critical Items'}
                </span>
              </div>

              {/* Current Time */}
              <div className="hidden rounded-xl border border-border/60 bg-card/80 px-4 py-2 backdrop-blur-sm sm:block">
                <p className="text-sm font-medium text-foreground">
                  {format(currentTime, 'h:mm a')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(currentTime, 'EEEE, MMM d')}
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column - Metrics & Actions */}
          <div className="space-y-6 lg:col-span-8">
            {/* Key Metrics */}
            <motion.section variants={itemVariants}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Today&apos;s Overview</h2>
                <Link
                  href="/inbox"
                  className="flex items-center gap-1 text-sm font-medium text-qualia-500 hover:text-qualia-600"
                >
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Today's Tasks"
                  value={stats.todayTasks}
                  subtitle={`${stats.completedToday} completed`}
                  icon={Target}
                  status={stats.todayTasks > 8 ? 'warning' : 'good'}
                  href="/inbox"
                />
                <MetricCard
                  title="Overdue"
                  value={stats.overdueTasks}
                  subtitle="Need attention"
                  icon={AlertCircle}
                  status={stats.overdueTasks > 0 ? 'critical' : 'good'}
                  href="/inbox?filter=overdue"
                />
                <MetricCard
                  title="Meetings"
                  value={stats.upcomingMeetings}
                  subtitle="Scheduled today"
                  icon={Calendar}
                  href="/schedule"
                />
                {isFounder ? (
                  <MetricCard
                    title="Hot Leads"
                    value={stats.hotLeads}
                    subtitle="Ready to close"
                    icon={Flame}
                    status={stats.hotLeads > 0 ? 'warning' : 'good'}
                    href="/clients?status=hot"
                  />
                ) : (
                  <MetricCard
                    title="Active Projects"
                    value={stats.activeProjects}
                    subtitle="In progress"
                    icon={Folder}
                    href="/projects"
                  />
                )}
              </div>
            </motion.section>

            {/* Urgent Tasks */}
            {urgentTasks.length > 0 && (
              <motion.section variants={itemVariants}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Priority Tasks
                  </h2>
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
                    {urgentTasks.length} urgent
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {urgentTasks.slice(0, 4).map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <TaskCard task={task} />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Quick Actions */}
            <motion.section variants={itemVariants}>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <QuickAction
                  icon={Target}
                  label="Create Task"
                  href="/inbox?new=true"
                  variant="primary"
                />
                <QuickAction icon={Calendar} label="Schedule Meeting" href="/schedule?new=true" />
                <QuickAction icon={Folder} label="New Project" href="/projects?new=true" />
                {isFounder && (
                  <>
                    <QuickAction icon={Users} label="Add Client" href="/clients?new=true" />
                    <QuickAction icon={Phone} label="Log Call" href="/clients?action=call" />
                    <QuickAction
                      icon={BarChart3}
                      label="View Reports"
                      href="/reports"
                      variant="success"
                    />
                  </>
                )}
              </div>
            </motion.section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6 lg:col-span-4">
            {/* Weekly Progress */}
            <motion.section
              variants={itemVariants}
              className="rounded-2xl border border-border/60 bg-card p-6"
            >
              <h2 className="mb-4 text-center text-sm font-semibold text-foreground">
                Weekly Progress
              </h2>
              <div className="flex justify-center">
                <ProgressRing progress={stats.weeklyProgress} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.completedToday}</p>
                  <p className="text-xs text-muted-foreground">Done Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.activeProjects}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </motion.section>

            {/* Upcoming Meetings */}
            <motion.section
              variants={itemVariants}
              className="rounded-2xl border border-border/60 bg-card p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-qualia-500" />
                  Upcoming
                </h2>
                <Link
                  href="/schedule"
                  className="text-xs font-medium text-qualia-500 hover:text-qualia-600"
                >
                  See all
                </Link>
              </div>

              {upcomingMeetings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting, index) => (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <MeetingCard meeting={meeting} isNext={index === 0} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                  <Link
                    href="/schedule?new=true"
                    className="mt-2 text-xs font-medium text-qualia-500 hover:underline"
                  >
                    Schedule one
                  </Link>
                </div>
              )}
            </motion.section>

            {/* AI Assistant Prompt */}
            <motion.section
              variants={itemVariants}
              className="group relative overflow-hidden rounded-2xl border border-qualia-500/30 bg-gradient-to-br from-qualia-500/10 via-qualia-500/5 to-transparent p-5"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-qualia-500/10 blur-2xl transition-all duration-500 group-hover:bg-qualia-500/20" />

              <div className="relative">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/20">
                    <Sparkles className="h-4 w-4 text-qualia-500" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">AI Assistant</h2>
                </div>

                <p className="mb-4 text-xs text-muted-foreground">
                  Ask me anything about your projects, schedule, or let me help you draft messages.
                </p>

                <button className="w-full rounded-xl border border-qualia-500/30 bg-qualia-500/10 px-4 py-3 text-left text-sm text-muted-foreground transition-all hover:border-qualia-500/50 hover:bg-qualia-500/20">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Ask Qualia...
                  </span>
                </button>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default CommandCenter;
