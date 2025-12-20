'use client';

import Link from 'next/link';
import { DashboardAIInput } from '@/components/dashboard-ai-input';
import { QualiaVoiceInline } from '@/components/qualia-voice-inline';
import type { LeadFollowUp } from '@/components/leads-follow-up-widget';
import { useEffect, useState } from 'react';
import { isPast, isToday, isTomorrow } from 'date-fns';
import { Phone, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardNotes } from './dashboard-notes';
import { DashboardMeetings } from './dashboard-meetings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  workspaceId?: string;
}

export interface GreetingData {
  reminders: Array<{
    type: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    details?: Record<string, unknown>;
    count?: number;
  }>;
  motivationalMessages: string[];
  specialOccasions: Array<{
    type: string;
    message: string;
  }>;
  stats: {
    todayMeetingsCount: number;
    urgentTasksCount: number;
    overdueTasksCount: number;
    completedTasksCount: number;
  };
}

interface DashboardMeeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
}

interface DashboardClientProps {
  greeting: string;
  dateString: string;
  user?: DashboardUser;
  greetingData?: GreetingData | null;
  leadFollowUps?: LeadFollowUp[];
  meetings?: DashboardMeeting[];
}

// Minimal lead card for the compact widget (currently unused, kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CompactLeadCard({ followUp }: { followUp: LeadFollowUp }) {
  const date = new Date(followUp.follow_up_date);
  const isOverdue = isPast(date) && !isToday(date);
  const isTodayDate = isToday(date);
  const isTomorrowDate = isTomorrow(date);

  const dateLabel = isOverdue
    ? 'Overdue'
    : isTodayDate
      ? 'Today'
      : isTomorrowDate
        ? 'Tomorrow'
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Link
      href={`/clients/${followUp.client_id}`}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 transition-all',
        'hover:bg-card/60',
        isOverdue && 'bg-orange-500/5'
      )}
    >
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
          followUp.priority === 'urgent' || followUp.priority === 'high'
            ? 'bg-orange-500/10 text-orange-500'
            : 'bg-muted/50 text-muted-foreground'
        )}
      >
        {followUp.lead_status === 'hot' ? (
          <Flame className="h-3 w-3" />
        ) : (
          <Phone className="h-3 w-3" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{followUp.contact_name}</p>
        <p className="truncate text-[10px] text-muted-foreground">{followUp.client_name}</p>
      </div>
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-[10px] font-medium',
          isOverdue
            ? 'bg-orange-500/10 text-orange-500'
            : isTodayDate
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-muted/50 text-muted-foreground'
        )}
      >
        {dateLabel}
      </span>
    </Link>
  );
}

export function DashboardClient({
  greeting,
  dateString,
  user,
  greetingData,
  leadFollowUps = [],
  meetings = [],
}: DashboardClientProps) {
  const [hasAutoGreeted, setHasAutoGreeted] = useState(false);
  const [shouldAutoGreet, setShouldAutoGreet] = useState(false);

  useEffect(() => {
    if (!user) return;
    const firstName = user.name.split(' ')[0].toLowerCase();
    const isSpecialUser = firstName === 'fawzi' || firstName === 'moayad';
    if (isSpecialUser) {
      setTimeout(() => setShouldAutoGreet(true), 2500);
    }
  }, [user]);

  const handleAutoGreetComplete = () => {
    const today = new Date().toDateString();
    localStorage.setItem('lastAutoGreeting', today);
    setHasAutoGreeted(true);
    setShouldAutoGreet(false);
  };

  const buildAutoGreetingMessage = () => {
    if (!user || !greetingData) return null;
    const firstName = user.name.split(' ')[0];
    const messages = [];
    const hour = new Date().getHours();

    if (hour < 12) {
      messages.push(`صباح الخير يا ${firstName}! إن شاء الله يومك يكون مليان إنجازات`);
    } else if (hour < 18) {
      messages.push(`أهلا ${firstName}! كيف الشغل ماشي معك اليوم؟`);
    } else {
      messages.push(`مساء الخير يا ${firstName}! يعطيك العافية على شغل اليوم`);
    }

    if (greetingData.reminders.length > 0) {
      const criticalReminders = greetingData.reminders.filter((r) => r.priority === 'critical');
      const highReminders = greetingData.reminders.filter((r) => r.priority === 'high');
      if (criticalReminders.length > 0) messages.push('انتبه! ' + criticalReminders[0].message);
      if (highReminders.length > 0 && messages.length < 3) messages.push(highReminders[0].message);
    }

    if (greetingData.motivationalMessages.length > 0 && messages.length < 4) {
      messages.push(greetingData.motivationalMessages[0]);
    }

    if (greetingData.specialOccasions.length > 0) {
      messages.push(greetingData.specialOccasions[0].message);
    }

    const isFawzi = firstName.toLowerCase() === 'fawzi';
    const isMoayad = firstName.toLowerCase() === 'moayad';

    if (isFawzi && greetingData.stats.todayMeetingsCount > 0) {
      messages.push('لا تنسى تذكر مؤيد بالاجتماع اللي عندكم');
    }

    if (isMoayad && Math.random() > 0.5) {
      const tips = [
        'جرب استخدم الـ AI عشان تسرع الشغل',
        'لا تنسى تسأل فوزي إذا محتاج مساعدة تقنية',
        'خلي التواصل مع العملاء أولوية اليوم',
      ];
      messages.push(tips[Math.floor(Math.random() * tips.length)]);
    }

    if (messages.length < 5) {
      const endings = ['الله يوفقك!', 'بالتوفيق!', 'يلا نشتغل!', 'خلينا نخلص الشغل اليوم'];
      messages.push(endings[Math.floor(Math.random() * endings.length)]);
    }

    return messages.join('. ');
  };

  // Sort follow-ups: overdue first, then by date
  const sortedFollowUps = [...leadFollowUps]
    .filter((f) => f.status === 'pending')
    .sort((a, b) => {
      const aDate = new Date(a.follow_up_date);
      const bDate = new Date(b.follow_up_date);
      const aOverdue = isPast(aDate) && !isToday(aDate);
      const bOverdue = isPast(bDate) && !isToday(bDate);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return aDate.getTime() - bDate.getTime();
    })
    .slice(0, 5);

  const overdueCount = leadFollowUps.filter((f) => {
    const date = new Date(f.follow_up_date);
    return f.status === 'pending' && isPast(date) && !isToday(date);
  }).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background/85">
      {/* Enhanced gradient background with more depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-pulse-subtle absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-qualia-500/[0.03] blur-3xl" />
        <div
          className="animate-pulse-subtle absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/[0.02] blur-3xl"
          style={{ animationDelay: '1s' }}
        />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-qualia-400/[0.01] blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-6">
        {/* Main content - centered hero section */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6 sm:pb-6">
          {/* Voice assistant - hero element */}
          <div className="mb-6 w-full sm:mb-8">
            <QualiaVoiceInline
              user={user}
              autoGreet={shouldAutoGreet && !hasAutoGreeted}
              autoGreetingMessage={buildAutoGreetingMessage()}
              onAutoGreetComplete={handleAutoGreetComplete}
              greetingContext={greetingData || undefined}
            />
          </div>

          {/* Greeting text */}
          <div className="mb-6 space-y-2 text-center sm:mb-8">
            <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {greeting}
            </h1>
            <p className="text-sm font-medium text-muted-foreground sm:text-base">{dateString}</p>
          </div>
        </main>

        {/* Bottom section - Three columns */}
        <div className="mt-auto grid gap-4 border-t border-border/40 bg-background/40 px-4 py-6 backdrop-blur-sm sm:gap-6 sm:px-6 sm:py-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Meetings Widget */}
          <div className="h-[320px]">
            <DashboardMeetings meetings={meetings} />
          </div>

          {/* Notes Widget */}
          <div className="h-[320px]">
            <DashboardNotes workspaceId={user?.workspaceId} />
          </div>

          {/* Follow-ups Widget */}
          <div className="h-[320px] md:col-span-2 lg:col-span-1">
            <Card className="flex h-full flex-col border-border/60 shadow-lg transition-shadow duration-300 hover:shadow-xl">
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/10 text-qualia-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span>Follow-ups</span>
                  {overdueCount > 0 && (
                    <span className="ml-auto rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                      {overdueCount} overdue
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {sortedFollowUps.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {sortedFollowUps.map((followUp, index) => (
                      <div
                        key={followUp.id}
                        className="group p-4 transition-all duration-200 hover:bg-qualia-500/5"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">
                            {followUp.contact_name}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                              followUp.priority === 'urgent'
                                ? 'bg-red-500/10 text-red-500 ring-1 ring-red-500/20'
                                : followUp.priority === 'high'
                                  ? 'bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20'
                                  : 'bg-muted/80 text-muted-foreground'
                            )}
                          >
                            {followUp.priority}
                          </span>
                        </div>
                        <p className="mb-3 text-xs font-medium text-muted-foreground">
                          {followUp.client_name}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {new Date(followUp.follow_up_date).toLocaleDateString()}
                          </span>
                          <Link
                            href={`/clients/${followUp.client_id}`}
                            className="text-[10px] font-medium text-qualia-500 transition-colors hover:text-qualia-600 hover:underline dark:hover:text-qualia-400"
                          >
                            View Client →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <div className="space-y-2 text-center">
                      <Phone className="mx-auto h-8 w-8 opacity-20" />
                      <p>No pending follow-ups</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Send Message Container - moved below widgets */}
        <div className="mx-auto mt-4 w-full max-w-lg px-4 pb-4 sm:px-6 sm:pb-6">
          <DashboardAIInput />
        </div>
      </div>
    </div>
  );
}
