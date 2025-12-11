'use client';

import Link from 'next/link';
import { DashboardAIInput } from '@/components/dashboard-ai-input';
import { QualiaVoiceInline } from '@/components/qualia-voice-inline';
import { useEffect, useState } from 'react';

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
}

export function DashboardClient({
  greeting,
  dateString,
  user,
  greetingData,
}: DashboardClientProps) {
  const [hasAutoGreeted, setHasAutoGreeted] = useState(false);
  const [shouldAutoGreet, setShouldAutoGreet] = useState(false);

  useEffect(() => {
    // Check if we should auto-greet - simplified for Fawzi and Moayad
    if (!user) return;

    // Check if it's a special user (Fawzi or Moayad) - always greet them
    const firstName = user.name.split(' ')[0].toLowerCase();
    const isSpecialUser = firstName === 'fawzi' || firstName === 'moayad';

    // For special users, always auto-greet (no localStorage check)
    if (isSpecialUser) {
      // Set a delay to let the page and VAPI initialize
      setTimeout(() => {
        setShouldAutoGreet(true);
      }, 2500);
    }
  }, [user]);

  const handleAutoGreetComplete = () => {
    // Mark that we've greeted today
    const today = new Date().toDateString();
    localStorage.setItem('lastAutoGreeting', today);
    setHasAutoGreeted(true);
    setShouldAutoGreet(false);
  };

  // Build auto-greeting message for the voice assistant
  const buildAutoGreetingMessage = () => {
    if (!user || !greetingData) return null;

    const firstName = user.name.split(' ')[0];
    const messages = [];

    // Personalized greeting
    const hour = new Date().getHours();
    if (hour < 12) {
      messages.push(`صباح الخير يا ${firstName}! إن شاء الله يومك يكون مليان إنجازات`);
    } else if (hour < 18) {
      messages.push(`أهلا ${firstName}! كيف الشغل ماشي معك اليوم؟`);
    } else {
      messages.push(`مساء الخير يا ${firstName}! يعطيك العافية على شغل اليوم`);
    }

    // Add reminders
    if (greetingData.reminders.length > 0) {
      // Priority reminders first
      const criticalReminders = greetingData.reminders.filter((r) => r.priority === 'critical');
      const highReminders = greetingData.reminders.filter((r) => r.priority === 'high');

      if (criticalReminders.length > 0) {
        messages.push('انتبه! ' + criticalReminders[0].message);
      }

      if (highReminders.length > 0 && messages.length < 3) {
        messages.push(highReminders[0].message);
      }
    }

    // Add motivational message
    if (greetingData.motivationalMessages.length > 0 && messages.length < 4) {
      messages.push(greetingData.motivationalMessages[0]);
    }

    // Add special occasions
    if (greetingData.specialOccasions.length > 0) {
      messages.push(greetingData.specialOccasions[0].message);
    }

    // Personalized tips for Fawzi and Moayad
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

    // End with encouragement
    if (messages.length < 5) {
      const endings = ['الله يوفقك!', 'بالتوفيق!', 'يلا نشتغل!', 'خلينا نخلص الشغل اليوم'];
      messages.push(endings[Math.floor(Math.random() * endings.length)]);
    }

    return messages.join('. ');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12">
        {/* Qualia Voice - with auto-greeting support */}
        <div className="mb-6">
          <QualiaVoiceInline
            user={user}
            autoGreet={shouldAutoGreet && !hasAutoGreeted}
            autoGreetingMessage={buildAutoGreetingMessage()}
            onAutoGreetComplete={handleAutoGreetComplete}
            greetingContext={greetingData || undefined}
          />
        </div>

        {/* Date and Greeting */}
        <header className="mb-10 text-center">
          <p className="text-sm text-muted-foreground">{dateString}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{greeting}</h1>
        </header>

        {/* AI Command Input */}
        <section className="mb-12">
          <DashboardAIInput />
        </section>

        {/* Navigation Grid */}
        <nav className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/projects"
            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-card/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-foreground">Projects</span>
          </Link>

          <Link
            href="/clients"
            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-card/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
              <svg
                className="h-5 w-5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-foreground">Clients</span>
          </Link>

          <Link
            href="/schedule"
            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-card/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
              <svg
                className="h-5 w-5 text-violet-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-foreground">Schedule</span>
          </Link>

          <Link
            href="/settings"
            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-card/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-500/10 transition-colors group-hover:bg-gray-500/20">
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-foreground">Settings</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
