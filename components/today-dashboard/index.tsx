'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  Settings,
  Menu,
  Bot,
  Globe,
  Mic2,
  Hammer,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { InboxWidget } from './inbox-widget';
import { TimelineSidebar } from './timeline-sidebar';
import { useTransition, useState, useEffect } from 'react';
import { type Task } from '@/app/actions/inbox';
import { type MeetingWithRelations } from '@/lib/swr';
import { motion } from 'framer-motion';

interface Project {
  id: string;
  name: string;
  project_type: string | null;
  is_building?: boolean;
}

interface TodayDashboardProps {
  meetings: MeetingWithRelations[];
  tasks: Task[];
  projects: Project[];
  finishedProjects: unknown[];
  issues?: unknown[];
}

// =============================================================================
// UNIFIED SECTION HEADER COMPONENT
// =============================================================================

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  countLabel?: string;
  countColor?: 'amber' | 'violet' | 'emerald' | 'blue';
  action?: React.ReactNode;
}

const COUNT_COLORS = {
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
} as const;

function SectionHeader({
  icon,
  title,
  count,
  countLabel,
  countColor = 'emerald',
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-4">
      <div className="flex items-center gap-2.5">
        <span className="text-foreground/70">{icon}</span>
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        {typeof count === 'number' && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
              COUNT_COLORS[countColor]
            )}
          >
            {count}
            {countLabel && <span className="ml-1 font-normal opacity-70">{countLabel}</span>}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

// =============================================================================
// PROJECT TYPE CONFIG
// =============================================================================

const PROJECT_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; dotColor: string; label: string }
> = {
  ai_agent: {
    icon: <Bot className="size-3.5" />,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
    dotColor: 'bg-violet-500',
    label: 'AI Agents',
  },
  voice_agent: {
    icon: <Mic2 className="size-3.5" />,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    dotColor: 'bg-amber-500',
    label: 'Voice Agents',
  },
  web_design: {
    icon: <Globe className="size-3.5" />,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    dotColor: 'bg-emerald-500',
    label: 'Web Design',
  },
  seo: {
    icon: <Globe className="size-3.5" />,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    dotColor: 'bg-blue-500',
    label: 'SEO',
  },
  ads: {
    icon: <Globe className="size-3.5" />,
    color: 'text-pink-600 dark:text-pink-400 bg-pink-500/10',
    dotColor: 'bg-pink-500',
    label: 'Ads',
  },
  other: {
    icon: <Globe className="size-3.5" />,
    color: 'text-foreground/60 bg-muted',
    dotColor: 'bg-zinc-500',
    label: 'Other',
  },
};

// =============================================================================
// BUILDING PROJECTS SIDEBAR
// =============================================================================

function BuildingProjectsList({ projects }: { projects: Project[] }) {
  const buildingProjects = projects.filter((p) => p.is_building);

  // Group by project type
  const grouped = buildingProjects.reduce(
    (acc, project) => {
      const type = project.project_type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(project);
      return acc;
    },
    {} as Record<string, Project[]>
  );

  const typeOrder = ['ai_agent', 'voice_agent', 'web_design', 'seo', 'ads', 'other'];

  if (buildingProjects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted/50">
          <Hammer className="size-4 text-foreground/40" />
        </div>
        <p className="text-xs font-medium text-foreground/60">No active builds</p>
        <p className="mt-1 text-center text-[11px] text-foreground/40">
          Projects marked as building will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2">
        {typeOrder.map((type) => {
          const typeProjects = grouped[type];
          if (!typeProjects?.length) return null;

          const config = PROJECT_TYPE_CONFIG[type] || PROJECT_TYPE_CONFIG.other;

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3"
            >
              {/* Type Header */}
              <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
                <span className={cn('rounded-md p-1', config.color)}>{config.icon}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
                  {config.label}
                </span>
                <span className="text-[10px] tabular-nums text-foreground/40">
                  {typeProjects.length}
                </span>
              </div>

              {/* Project List */}
              <div className="space-y-0.5">
                {typeProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent"
                  >
                    <span className={cn('size-2 rounded-full', config.dotColor)} />
                    <span className="flex-1 truncate text-[13px] font-medium text-foreground">
                      {project.name}
                    </span>
                    <ChevronRight className="size-3.5 text-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

export function TodayDashboard({ meetings, tasks, projects }: TodayDashboardProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [isRefreshing, startRefresh] = useTransition();
  const [greeting, setGreeting] = useState('');

  const now = new Date();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleRefresh = () => {
    startRefresh(() => router.refresh());
  };

  // Computed stats
  const todaysMeetings = meetings.filter((m) => isToday(parseISO(m.start_time)));
  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;
  const buildingCount = projects.filter((p) => p.is_building).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ===== TOP HEADER ===== */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm lg:px-6">
        {/* Left: Menu + Greeting */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-foreground">{greeting}</h1>
            <span className="text-foreground/30">·</span>
            <p className="text-sm text-foreground/70">{format(now, 'EEEE, MMM d')}</p>
          </div>

          {/* Quick Stats Pills */}
          <div className="ml-4 hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1">
              <span className="text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                {pendingTasks}
              </span>
              <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">tasks</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1">
              <span className="text-xs font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                {todaysMeetings.length}
              </span>
              <span className="text-[10px] text-violet-600/70 dark:text-violet-400/70">
                meetings
              </span>
            </div>
            {buildingCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {buildingCount}
                </span>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                  building
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
          </Button>
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/settings">
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ===== MAIN 3-COLUMN LAYOUT ===== */}
      <main className="min-h-0 flex-1">
        <div className="flex h-full">
          {/* ----- LEFT: Building Projects ----- */}
          <aside className="hidden w-56 shrink-0 flex-col border-r border-border/60 lg:flex xl:w-64">
            <SectionHeader
              icon={<Hammer className="size-4" />}
              title="Building"
              count={buildingCount}
              countColor="emerald"
              action={
                <Button variant="ghost" size="icon" className="size-7" asChild>
                  <Link href="/projects?filter=building">
                    <Plus className="size-4" />
                  </Link>
                </Button>
              }
            />
            <BuildingProjectsList projects={projects} />
          </aside>

          {/* ----- CENTER: Inbox (Primary) ----- */}
          <section className="min-w-0 flex-1 border-r border-border/60">
            <InboxWidget tasks={tasks} />
          </section>

          {/* ----- RIGHT: Today Timeline ----- */}
          <aside className="hidden w-72 shrink-0 flex-col lg:flex xl:w-80">
            <TimelineSidebar meetings={meetings} />
          </aside>
        </div>
      </main>
    </div>
  );
}

export { InboxWidget } from './inbox-widget';
