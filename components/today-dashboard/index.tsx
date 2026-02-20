'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  Search,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { DailyScheduleGrid } from './daily-schedule-grid';
import { BuildingProjectSheet } from './building-project-sheet';
import { useTransition, useState, useEffect } from 'react';
import { type Task } from '@/app/actions/inbox';
import { type MeetingWithRelations } from '@/lib/swr';

interface Project {
  id: string;
  name: string;
  project_type: string | null;
  logo_url?: string | null;
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
    label: 'Voice',
  },
  web_design: {
    icon: <Globe className="size-3.5" />,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    dotColor: 'bg-emerald-500',
    label: 'Web',
  },
  seo: {
    icon: <Search className="size-3.5" />,
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
// PROJECT LOGO
// =============================================================================

function ProjectLogo({
  logo_url,
  name,
  project_type,
}: {
  logo_url?: string | null;
  name: string;
  project_type?: string | null;
}) {
  if (logo_url) {
    return (
      <div className="size-6 shrink-0 overflow-hidden rounded-md border border-border/40">
        <Image
          src={logo_url}
          alt={name}
          width={24}
          height={24}
          className="size-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  const config = PROJECT_TYPE_CONFIG[project_type || 'other'] || PROJECT_TYPE_CONFIG.other;
  return (
    <div
      className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', config.color)}
    >
      {config.icon}
    </div>
  );
}

// =============================================================================
// BUILDING PROJECTS SIDEBAR
// =============================================================================

function BuildingProjectsList({
  projects,
  onProjectClick,
}: {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}) {
  const grouped = projects.reduce(
    (acc, project) => {
      const type = project.project_type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(project);
      return acc;
    },
    {} as Record<string, Project[]>
  );

  const typeOrder = ['ai_agent', 'voice_agent', 'web_design', 'seo', 'ads', 'other'];

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted/50">
          <Hammer className="size-4 text-foreground/40" />
        </div>
        <p className="text-xs font-medium text-foreground/60">No active builds</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      {typeOrder.map((type) => {
        const typeProjects = grouped[type];
        if (!typeProjects?.length) return null;

        const config = PROJECT_TYPE_CONFIG[type] || PROJECT_TYPE_CONFIG.other;

        return (
          <div key={type} className="mb-4 last:mb-0">
            {/* Type Header */}
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
                {config.label}
              </span>
              <span className="text-[10px] tabular-nums text-foreground/25">
                {typeProjects.length}
              </span>
            </div>

            {/* Project List */}
            <div className="space-y-px">
              {typeProjects.map((project, i) => (
                <button
                  key={project.id}
                  onClick={() => onProjectClick(project)}
                  className="group flex w-full animate-slide-in items-center gap-2.5 rounded-lg px-2 py-[7px] text-left transition-colors hover:bg-accent"
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                >
                  <ProjectLogo
                    logo_url={project.logo_url}
                    name={project.name}
                    project_type={project.project_type}
                  />
                  <span className="flex-1 truncate text-[13px] font-medium text-foreground/80 group-hover:text-foreground">
                    {project.name}
                  </span>
                  <ChevronRight className="size-3 text-foreground/20 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// STAT PILL
// =============================================================================

function StatPill({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: 'amber' | 'violet' | 'emerald';
}) {
  const colors = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1', colors[color])}>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] opacity-70">{label}</span>
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
  const [sheetProject, setSheetProject] = useState<Project | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const todaysMeetings = meetings.filter((m) => isToday(parseISO(m.start_time)));
  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;
  const buildingCount = projects.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ===== TOP BAR ===== */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-background px-4 lg:px-5">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-semibold text-foreground">{greeting}</h1>
            <span className="text-foreground/20">|</span>
            <span className="text-[13px] text-foreground/50">{format(now, 'EEE, MMM d')}</span>
          </div>

          {/* Stats */}
          <div className="ml-3 hidden items-center gap-1.5 lg:flex">
            <div
              className="animate-scale-in"
              style={{ animationDelay: '100ms', animationFillMode: 'both' }}
            >
              <StatPill value={pendingTasks} label="tasks" color="amber" />
            </div>
            <div
              className="animate-scale-in"
              style={{ animationDelay: '160ms', animationFillMode: 'both' }}
            >
              <StatPill value={todaysMeetings.length} label="meetings" color="violet" />
            </div>
            {buildingCount > 0 && (
              <div
                className="animate-scale-in"
                style={{ animationDelay: '220ms', animationFillMode: 'both' }}
              >
                <StatPill value={buildingCount} label="building" color="emerald" />
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          </Button>
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/settings">
              <Settings className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <div className="flex min-h-0 flex-1">
        {/* ----- LEFT: Building Projects ----- */}
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border/40 lg:flex">
          {/* Panel Header - same h-12 as top bar */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-4">
            <div className="flex items-center gap-2">
              <Hammer className="size-3.5 text-foreground/50" />
              <span className="text-[13px] font-semibold text-foreground">Building</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                {buildingCount}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="size-7" asChild>
              <Link href="/projects?filter=building">
                <Plus className="size-3.5" />
              </Link>
            </Button>
          </div>
          <BuildingProjectsList
            projects={projects}
            onProjectClick={(p) => {
              setSheetProject(p);
              setSheetOpen(true);
            }}
          />
        </aside>

        {/* ----- CENTER: Daily Schedule ----- */}
        <section className="min-w-0 flex-1">
          <DailyScheduleGrid tasks={tasks} meetings={meetings} />
        </section>
      </div>

      {/* Project Sheet */}
      <BuildingProjectSheet project={sheetProject} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

export { DailyScheduleGrid } from './daily-schedule-grid';
