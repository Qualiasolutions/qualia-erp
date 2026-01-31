'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Menu, Bot, Globe, Mic2 } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { InboxWidget } from './inbox-widget';
import { TimelineSidebar } from './timeline-sidebar';
import { useTransition, useState, useEffect } from 'react';
import { type Task } from '@/app/actions/inbox';
import { type MeetingWithRelations } from '@/lib/swr';

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

const PROJECT_TYPE_ICONS: Record<string, React.ReactNode> = {
  ai_agent: <Bot className="h-3.5 w-3.5" />,
  voice_agent: <Mic2 className="h-3.5 w-3.5" />,
  web_design: <Globe className="h-3.5 w-3.5" />,
};

const PROJECT_TYPE_COLORS: Record<string, string> = {
  ai_agent: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  voice_agent: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  web_design: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
};

function BuildingProjectsList({ projects }: { projects: Project[] }) {
  // Filter to only building projects
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

  const typeOrder = ['ai_agent', 'voice_agent', 'web_design', 'other'];

  if (buildingProjects.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-3 py-8 text-center">
        <p className="text-xs text-muted-foreground">No active builds</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {typeOrder.map((type) => {
        const typeProjects = grouped[type];
        if (!typeProjects?.length) return null;

        return (
          <div key={type} className="mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1">
              <span
                className={cn(
                  'rounded p-0.5',
                  PROJECT_TYPE_COLORS[type] || 'text-muted-foreground'
                )}
              >
                {PROJECT_TYPE_ICONS[type] || <Globe className="h-3.5 w-3.5" />}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {type.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-0.5 px-1.5">
              {typeProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-lg px-2 py-1.5 transition-all hover:bg-accent"
                >
                  <p className="truncate text-xs font-medium text-foreground">{project.name}</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

  // Filter today's meetings
  const todaysMeetings = meetings.filter((m) => isToday(parseISO(m.start_time)));

  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;
  const buildingCount = projects.filter((p) => p.is_building).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Compact Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-foreground">{greeting}</h1>
            <span className="text-xs text-muted-foreground">·</span>
            <p className="text-xs text-muted-foreground">{format(now, 'EEE, MMM d')}</p>
          </div>

          {/* Quick Stats */}
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

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </Button>
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
            <Link href="/settings">
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main - 3 Column: Building Projects (narrow) + Inbox (primary) + Timeline (secondary) */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Building Projects - Left Sidebar */}
          <div className="hidden w-48 flex-col border-r lg:flex">
            <div className="flex h-12 items-center justify-between border-b px-3">
              <h2 className="text-xs font-medium text-foreground">Building</h2>
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {buildingCount}
              </span>
            </div>
            <BuildingProjectsList projects={projects} />
          </div>

          {/* Inbox - Primary (takes most space) */}
          <div className="min-w-0 flex-1 border-r">
            <InboxWidget tasks={tasks} />
          </div>

          {/* Timeline Sidebar - Secondary */}
          <div className="hidden w-72 flex-col overflow-hidden lg:flex xl:w-80">
            <TimelineSidebar meetings={meetings} />
          </div>
        </div>
      </main>
    </div>
  );
}

export { InboxWidget } from './inbox-widget';
