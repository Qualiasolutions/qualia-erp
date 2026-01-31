'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Menu, Video, Clock, MapPin, ExternalLink } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { InboxWidget } from './inbox-widget';
import { useTransition, useState, useEffect } from 'react';
import { type Task } from '@/app/actions/inbox';
import { type MeetingWithRelations } from '@/lib/swr';

interface TodayDashboardProps {
  meetings: MeetingWithRelations[];
  tasks: Task[];
  projects: unknown[];
  finishedProjects: unknown[];
  issues?: unknown[];
}

function MeetingCard({ meeting }: { meeting: MeetingWithRelations }) {
  const startTime = parseISO(meeting.start_time);
  const endTime = parseISO(meeting.end_time);
  const isNow = new Date() >= startTime && new Date() <= endTime;

  return (
    <div
      className={cn(
        'group rounded-xl border border-white/[0.06] bg-zinc-800/50 p-4 transition-all hover:bg-zinc-800/80',
        isNow && 'border-violet-500/30 bg-violet-500/10'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-white">{meeting.title}</h4>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
            {meeting.client && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {meeting.client.display_name}
              </span>
            )}
          </div>
        </div>
        {meeting.meeting_link && (
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'h-8 gap-1.5 rounded-lg text-xs',
              isNow
                ? 'bg-violet-500 text-white hover:bg-violet-600'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            )}
            asChild
          >
            <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
              <Video className="h-3.5 w-3.5" />
              {isNow ? 'Join' : 'Link'}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function TodayDashboard({ meetings, tasks }: TodayDashboardProps) {
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

  // Filter today's meetings and sort by time
  const todaysMeetings = meetings
    .filter((m) => isToday(parseISO(m.start_time)))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Compact Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/80 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-white">{greeting}</h1>
            <span className="text-xs text-zinc-500">·</span>
            <p className="text-xs text-zinc-500">{format(now, 'EEE, MMM d')}</p>
          </div>

          {/* Quick Stats */}
          <div className="ml-4 hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1">
              <span className="text-xs font-semibold tabular-nums text-amber-400">
                {pendingTasks}
              </span>
              <span className="text-[10px] text-amber-400/70">tasks</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1">
              <span className="text-xs font-semibold tabular-nums text-violet-400">
                {todaysMeetings.length}
              </span>
              <span className="text-[10px] text-violet-400/70">meetings</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </Button>
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
            asChild
          >
            <Link href="/settings">
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main - 2 Column: Inbox (primary) + Meetings (secondary) */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Inbox - Primary (takes most space) */}
          <div className="min-w-0 flex-1 border-r border-white/[0.06]">
            <InboxWidget tasks={tasks} />
          </div>

          {/* Meetings Sidebar - Secondary */}
          <div className="hidden w-80 flex-col overflow-hidden lg:flex xl:w-96">
            <div className="flex h-12 items-center justify-between border-b border-white/[0.06] px-4">
              <h2 className="text-sm font-medium text-white">Today&apos;s Meetings</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-zinc-400 hover:text-white"
                asChild
              >
                <Link href="/schedule">
                  <ExternalLink className="h-3 w-3" />
                  All
                </Link>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {todaysMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
                    <Video className="h-5 w-5 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium text-white">No meetings today</p>
                  <p className="mt-1 text-xs text-zinc-500">Enjoy the focus time</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 h-8 text-xs text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
                    asChild
                  >
                    <Link href="/schedule?new=1">Schedule meeting</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysMeetings.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { InboxWidget } from './inbox-widget';
