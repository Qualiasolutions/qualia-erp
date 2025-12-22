'use client';

import { DashboardAIInput } from '@/components/dashboard-ai-input';
import { QualiaVoiceInline } from '@/components/qualia-voice-inline';
import { useEffect, useState, useCallback } from 'react';
import { Volume2, X, Bell } from 'lucide-react';
import { DashboardNotes } from './dashboard-notes';
import { DashboardMeetings } from './dashboard-meetings';
import { DashboardObjectives } from './dashboard-objectives';
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
  meetings?: DashboardMeeting[];
}

export function DashboardClient({
  greeting,
  dateString,
  user,
  greetingData,
  meetings = [],
}: DashboardClientProps) {
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [shouldStartGreeting, setShouldStartGreeting] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');

  // Check if there are important reminders to show notification
  useEffect(() => {
    if (!user || !greetingData) return;

    // Check if already greeted today
    const lastGreeting = localStorage.getItem('lastAutoGreeting');
    const today = new Date().toDateString();
    if (lastGreeting === today) {
      setHasGreeted(true);
      return;
    }

    const firstName = user.name.split(' ')[0].toLowerCase();
    const isSpecialUser = firstName === 'fawzi' || firstName === 'moayad';

    // Build notification message
    const hasUrgentItems = greetingData.reminders.some(
      (r) => r.priority === 'critical' || r.priority === 'high'
    );
    const hasMeetings = greetingData.stats.todayMeetingsCount > 0;
    const hasOverdueTasks = greetingData.stats.overdueTasksCount > 0;

    let message = '';
    if (hasUrgentItems) {
      const urgentCount = greetingData.reminders.filter(
        (r) => r.priority === 'critical' || r.priority === 'high'
      ).length;
      message = `${urgentCount} urgent reminder${urgentCount > 1 ? 's' : ''}`;
    } else if (hasMeetings) {
      message = `${greetingData.stats.todayMeetingsCount} meeting${greetingData.stats.todayMeetingsCount > 1 ? 's' : ''} today`;
    } else if (hasOverdueTasks) {
      message = `${greetingData.stats.overdueTasksCount} overdue task${greetingData.stats.overdueTasksCount > 1 ? 's' : ''}`;
    } else if (isSpecialUser) {
      message = 'Good morning update';
    }

    if (message && isSpecialUser) {
      setNotificationMessage(message);
      // Show notification after a short delay
      setTimeout(() => setShowNotification(true), 2000);
    }
  }, [user, greetingData]);

  const handleStartGreeting = useCallback(() => {
    setShowNotification(false);
    setShouldStartGreeting(true);
  }, []);

  const handleDismissNotification = useCallback(() => {
    setShowNotification(false);
    // Mark as greeted to prevent showing again today
    const today = new Date().toDateString();
    localStorage.setItem('lastAutoGreeting', today);
    setHasGreeted(true);
  }, []);

  const handleGreetingComplete = useCallback(() => {
    const today = new Date().toDateString();
    localStorage.setItem('lastAutoGreeting', today);
    setHasGreeted(true);
    setShouldStartGreeting(false);
  }, []);

  const buildGreetingMessage = useCallback(() => {
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
  }, [user, greetingData]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-background/95">
      {/* Enhanced gradient background with more depth */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-pulse-subtle absolute -left-1/4 -top-1/4 h-[400px] w-[400px] rounded-full bg-qualia-500/[0.04] blur-3xl sm:h-[600px] sm:w-[600px]" />
        <div
          className="animate-pulse-subtle absolute -bottom-1/4 -right-1/4 h-[350px] w-[350px] rounded-full bg-violet-500/[0.03] blur-3xl sm:h-[500px] sm:w-[500px]"
          style={{ animationDelay: '1s' }}
        />
        <div className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-qualia-400/[0.02] blur-3xl sm:h-[400px] sm:w-[400px]" />
        {/* Additional ambient glow */}
        <div className="absolute right-1/4 top-1/3 hidden h-[300px] w-[300px] rounded-full bg-amber-500/[0.02] blur-3xl sm:block" />
      </div>

      <div className="pb-safe relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
        {/* Main content - centered hero section */}
        <main className="flex flex-1 flex-col items-center justify-center py-6 sm:py-8 lg:py-12">
          {/* Voice assistant - hero element */}
          <div className="mb-6 w-full max-w-2xl sm:mb-8">
            <QualiaVoiceInline
              user={user}
              autoGreet={shouldStartGreeting && !hasGreeted}
              autoGreetingMessage={buildGreetingMessage()}
              onAutoGreetComplete={handleGreetingComplete}
              greetingContext={greetingData || undefined}
            />
          </div>

          {/* Voice greeting notification */}
          {showNotification && (
            <div className="fixed bottom-20 left-4 right-4 z-50 duration-300 animate-in fade-in slide-in-from-bottom-4 sm:bottom-24 sm:left-auto sm:right-6">
              <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-qualia-500/30 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md sm:px-5 sm:py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-qualia-500/20 to-violet-500/10 sm:h-12 sm:w-12">
                  <Bell className="h-4 w-4 text-qualia-500 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Qualia has updates</p>
                  <p className="truncate text-xs text-muted-foreground">{notificationMessage}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={handleStartGreeting}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-qualia-500 to-qualia-600 px-3 text-xs font-semibold text-white shadow-lg transition-all active:scale-95 sm:h-10 sm:px-4 sm:hover:scale-105 sm:hover:shadow-qualia-500/25"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span className="xs:inline hidden">Listen</span>
                  </button>
                  <button
                    onClick={handleDismissNotification}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-10 sm:w-10"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Greeting text */}
          <div className="mb-6 w-full max-w-2xl space-y-2 px-2 text-center sm:mb-8 sm:space-y-3 sm:px-0">
            <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
              {greeting}
            </h1>
            <p className="text-sm font-medium text-muted-foreground sm:text-base lg:text-lg">
              {dateString}
            </p>
          </div>

          {/* AI Input - centered below greeting */}
          <div className="w-full max-w-xl px-2 sm:px-0">
            <DashboardAIInput />
          </div>
        </main>

        {/* Bottom section - Responsive dashboard grid */}
        <div className="mt-auto border-t border-border/30 bg-gradient-to-t from-background/90 to-transparent px-1 pb-6 pt-5 sm:px-0 sm:pb-8 sm:pt-6">
          {/* Responsive grid: stack on mobile, 2 cols on tablet, optimized on desktop */}
          <div className="grid gap-4 sm:gap-5 lg:gap-6">
            {/* Meetings row - full width, adaptive height */}
            <div
              className={cn(
                'min-h-[180px] sm:min-h-[200px]',
                meetings.length === 0 ? 'h-auto' : 'h-[200px] sm:h-[220px]'
              )}
            >
              <DashboardMeetings meetings={meetings} />
            </div>

            {/* Two column grid for objectives and notes */}
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:gap-6">
              {/* 2025 Objectives Widget */}
              <div className="min-h-[300px] sm:min-h-[340px] md:min-h-[360px]">
                <DashboardObjectives workspaceId={user?.workspaceId} />
              </div>

              {/* Team Notes Widget */}
              <div className="min-h-[300px] sm:min-h-[340px] md:min-h-[360px]">
                <DashboardNotes workspaceId={user?.workspaceId} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
