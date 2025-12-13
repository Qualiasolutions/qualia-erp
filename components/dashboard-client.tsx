'use client';

import Link from 'next/link';
import Image from 'next/image';
import { DashboardAIInput } from '@/components/dashboard-ai-input';
import { QualiaVoiceInline } from '@/components/qualia-voice-inline';
import type { LeadFollowUp } from '@/components/leads-follow-up-widget';
import { useEffect, useState } from 'react';
import { isPast, isToday, isTomorrow } from 'date-fns';
import { Phone, Calendar, Flame, Folder, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface DashboardClientProps {
  greeting: string;
  dateString: string;
  user?: DashboardUser;
  greetingData?: GreetingData | null;
  leadFollowUps?: LeadFollowUp[];
}

// Minimal lead card for the compact widget
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
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-qualia-500/[0.02] blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/[0.02] blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-6">
        {/* Top navigation bar */}
        <nav className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.webp" alt="Qualia" width={32} height={32} className="rounded-lg" />
            <span className="text-sm font-semibold text-foreground">Qualia</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/projects"
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <Folder className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </Link>
            <Link
              href="/clients"
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </Link>
            <Link
              href="/schedule"
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </Link>
            <div className="mx-2 h-4 w-px bg-border" />
            <Link
              href="/settings"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </nav>

        {/* Main content - centered hero section */}
        <main className="flex flex-1 flex-col items-center justify-center pb-6">
          {/* Voice assistant - hero element */}
          <div className="mb-8">
            <QualiaVoiceInline
              user={user}
              autoGreet={shouldAutoGreet && !hasAutoGreeted}
              autoGreetingMessage={buildAutoGreetingMessage()}
              onAutoGreetComplete={handleAutoGreetComplete}
              greetingContext={greetingData || undefined}
            />
          </div>

          {/* Greeting text */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {greeting}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{dateString}</p>
          </div>

          {/* AI Input - prominent centered */}
          <div className="mb-8 w-full max-w-lg">
            <DashboardAIInput />
          </div>
        </main>

        {/* Bottom section - compact lead follow-ups */}
        {sortedFollowUps.length > 0 && (
          <footer className="border-t border-border/50 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10">
                  <Phone className="h-3 w-3 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-foreground">Follow-ups</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {leadFollowUps.filter((f) => f.status === 'pending').length} pending
                    {overdueCount > 0 && (
                      <span className="text-orange-500"> · {overdueCount} overdue</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex max-w-md items-center gap-2 overflow-hidden">
                {sortedFollowUps.slice(0, 3).map((followUp) => (
                  <CompactLeadCard key={followUp.id} followUp={followUp} />
                ))}
                {sortedFollowUps.length > 3 && (
                  <Link
                    href="/clients"
                    className="flex items-center justify-center rounded-md px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  >
                    +{sortedFollowUps.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
