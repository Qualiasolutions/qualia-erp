'use client';

import { useAdminContext } from '@/components/admin-provider';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { AnimatePresence, m } from '@/lib/lazy-motion';
import { cn } from '@/lib/utils';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Command,
  ExternalLink,
  Files,
  FlaskConical,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  type LucideIcon,
  MessagesSquare,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Upload,
  Users,
  Wallet,
  Workflow,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useReducedMotion } from 'framer-motion';

const WALKTHROUGH_VERSION = 1;
const WALKTHROUGH_STORAGE_KEY = 'qualia-internal-walkthrough';

type WalkthroughTone = 'teal' | 'sky' | 'amber' | 'violet' | 'rose' | 'emerald';

interface WalkthroughHighlight {
  title: string;
  description: string;
  icon: LucideIcon;
  tag: string;
}

interface WalkthroughStep {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  tone: WalkthroughTone;
  routes: string[];
  metrics: string[];
  note: string;
  highlights: WalkthroughHighlight[];
}

const toneStyles: Record<
  WalkthroughTone,
  {
    badge: string;
    iconWrap: string;
    icon: string;
    route: string;
    glow: string;
    border: string;
    progress: string;
    dot: string;
    mesh: string;
  }
> = {
  teal: {
    badge: 'border-primary/20 bg-primary/10 text-primary',
    iconWrap: 'bg-primary/12 text-primary',
    icon: 'text-primary',
    route: 'border-primary/15 bg-primary/[0.08] text-primary',
    glow: 'from-primary/24 via-primary/10 to-transparent',
    border: 'border-primary/18',
    progress: 'bg-primary',
    dot: 'bg-primary',
    mesh: 'from-primary/12 via-transparent to-transparent',
  },
  sky: {
    badge: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    iconWrap: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
    icon: 'text-sky-700 dark:text-sky-300',
    route: 'border-sky-500/15 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300',
    glow: 'from-sky-500/24 via-sky-500/10 to-transparent',
    border: 'border-sky-500/18',
    progress: 'bg-sky-500',
    dot: 'bg-sky-500',
    mesh: 'from-sky-500/12 via-transparent to-transparent',
  },
  amber: {
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    iconWrap: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    icon: 'text-amber-700 dark:text-amber-300',
    route: 'border-amber-500/15 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
    glow: 'from-amber-500/24 via-amber-500/10 to-transparent',
    border: 'border-amber-500/18',
    progress: 'bg-amber-500',
    dot: 'bg-amber-500',
    mesh: 'from-amber-500/12 via-transparent to-transparent',
  },
  violet: {
    badge: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    iconWrap: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
    icon: 'text-violet-700 dark:text-violet-300',
    route: 'border-violet-500/15 bg-violet-500/[0.08] text-violet-700 dark:text-violet-300',
    glow: 'from-violet-500/24 via-violet-500/10 to-transparent',
    border: 'border-violet-500/18',
    progress: 'bg-violet-500',
    dot: 'bg-violet-500',
    mesh: 'from-violet-500/12 via-transparent to-transparent',
  },
  rose: {
    badge: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    iconWrap: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
    icon: 'text-rose-700 dark:text-rose-300',
    route: 'border-rose-500/15 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300',
    glow: 'from-rose-500/24 via-rose-500/10 to-transparent',
    border: 'border-rose-500/18',
    progress: 'bg-rose-500',
    dot: 'bg-rose-500',
    mesh: 'from-rose-500/12 via-transparent to-transparent',
  },
  emerald: {
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    iconWrap: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-700 dark:text-emerald-300',
    route: 'border-emerald-500/15 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300',
    glow: 'from-emerald-500/24 via-emerald-500/10 to-transparent',
    border: 'border-emerald-500/18',
    progress: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    mesh: 'from-emerald-500/12 via-transparent to-transparent',
  },
};

function getStorageKey(userId: string) {
  return `${WALKTHROUGH_STORAGE_KEY}:${userId}`;
}

function readStoredVersion(userId: string) {
  try {
    return window.localStorage.getItem(getStorageKey(userId));
  } catch {
    return null;
  }
}

function writeStoredVersion(userId: string) {
  try {
    window.localStorage.setItem(getStorageKey(userId), String(WALKTHROUGH_VERSION));
  } catch {
    // Ignore localStorage failures and rely on profile persistence instead.
  }
}

function getInternalWalkthroughSteps(firstName: string, isAdmin: boolean): WalkthroughStep[] {
  const sharedSteps: WalkthroughStep[] = [
    {
      id: 'welcome',
      icon: Sparkles,
      eyebrow: 'Welcome',
      title: `Hey ${firstName} — let\u2019s get you set up.`,
      description:
        'Qualia is where we manage everything: projects, clients, tasks, and team coordination. This quick walkthrough shows you the key areas so you can hit the ground running.',
      tone: 'teal',
      routes: ['/', '/projects', '/clients'],
      metrics: ['Everything in one place', 'Built for our workflow', 'Takes 2 minutes'],
      note: 'Sidebar on the left for navigation, your work in the center, quick actions in the header. Simple layout, same everywhere.',
      highlights: [
        {
          icon: Workflow,
          title: 'Sidebar is your map',
          description:
            'Projects, clients, schedule, knowledge — everything is one click away in the sidebar. No digging.',
          tag: 'Navigation',
        },
        {
          icon: Command,
          title: 'Cmd+K to jump anywhere',
          description:
            'The command menu lets you search and navigate instantly. Once you get used to it, you won\u2019t use anything else.',
          tag: 'Shortcut',
        },
        {
          icon: Bell,
          title: 'Notifications keep you in the loop',
          description:
            'Task assignments, project updates, and mentions — you\u2019ll see them in the bell icon, no need to check Slack.',
          tag: 'Alerts',
        },
        {
          icon: Shield,
          title: 'You see what\u2019s relevant to you',
          description:
            'Admins see everything. Team members see their projects and tasks. Clients see their portal. Clean and focused.',
          tag: 'Roles',
        },
      ],
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      eyebrow: 'Dashboard',
      title: 'Your day starts here.',
      description:
        'The dashboard shows what matters today: your tasks, upcoming meetings, active projects, and team updates. Open this first thing — it\u2019s your morning briefing.',
      tone: 'sky',
      routes: ['/'],
      metrics: ['Today\u2019s tasks', 'Meetings at a glance', 'Team pulse'],
      note: 'You can clock in, check your tasks, and see what the team is working on — all without leaving this page.',
      highlights: [
        {
          icon: ClipboardList,
          title: 'Your tasks for today',
          description:
            'Tasks due today and overdue items surface at the top. Pick what to work on and update progress as you go.',
          tag: 'Focus',
        },
        {
          icon: FolderKanban,
          title: 'Active project movement',
          description:
            'See which projects are moving, which need attention, and where things stand across the pipeline.',
          tag: 'Projects',
        },
        {
          icon: CalendarRange,
          title: 'Meetings right there',
          description:
            'Today\u2019s meetings show up on the dashboard so you\u2019re never caught off guard by a call.',
          tag: 'Schedule',
        },
        {
          icon: MessagesSquare,
          title: 'Team updates and notes',
          description:
            'Announcements, owner updates, and shared notes live here — no need to hunt through chat threads.',
          tag: 'Updates',
        },
      ],
    },
    {
      id: 'projects',
      icon: FolderKanban,
      eyebrow: 'Projects',
      title: 'This is where the real work happens.',
      description:
        'Every client project lives here — organized by stage (demos, active, launched). Click into a project to see its roadmap, tasks, files, team, and deployment status.',
      tone: 'amber',
      routes: ['/projects', '/projects/[id]'],
      metrics: ['Pipeline by stage', 'Roadmap phases', 'Files and deployments'],
      note: 'Projects page gives you the bird\u2019s eye view. Project detail page is where you actually execute.',
      highlights: [
        {
          icon: GitBranch,
          title: 'Pipeline shows everything',
          description:
            'Projects are grouped by stage: Demos, Active, Launched, Done. You can see the full portfolio at a glance.',
          tag: 'Pipeline',
        },
        {
          icon: LayoutDashboard,
          title: 'Deep project detail',
          description:
            'Each project has phases, tasks, notes, health metrics, and team assignments. Everything you need is inside.',
          tag: 'Detail',
        },
        {
          icon: Files,
          title: 'Files stay with the project',
          description:
            'Designs, documents, assets — upload them to the project directly. No more digging through Google Drive.',
          tag: 'Files',
        },
        {
          icon: Users,
          title: 'Clear ownership',
          description:
            'Every project shows who\u2019s assigned and responsible. No ambiguity about who\u2019s doing what.',
          tag: 'Team',
        },
      ],
    },
    {
      id: 'client-experience',
      icon: Building2,
      eyebrow: 'Clients & Portal',
      title: 'Manage the relationship and what the client sees.',
      description:
        'The Clients page is our internal CRM — track leads, contacts, and account status. The Portal is what clients actually see: their project progress, invoices, and feature requests.',
      tone: 'violet',
      routes: ['/clients', '/portal'],
      metrics: ['CRM for leads', 'Client-facing portal', 'Invoices and requests'],
      note: 'When you update a project internally, the client sees it reflected in their portal automatically. One source of truth.',
      highlights: [
        {
          icon: Building2,
          title: 'Client CRM',
          description:
            'Track every client: their status, contacts, projects, and last interaction. This is the relationship hub.',
          tag: 'CRM',
        },
        {
          icon: ExternalLink,
          title: 'Client portal',
          description:
            'Clients log in here to check progress, submit requests, download files, and view invoices. Professional and clean.',
          tag: 'Portal',
        },
        {
          icon: Upload,
          title: 'Feature requests',
          description:
            'Clients can submit requests through the portal. They stay organized and tied to the project — not lost in email.',
          tag: 'Requests',
        },
        {
          icon: Receipt,
          title: 'Billing in context',
          description:
            'Invoices and payments are attached to the client account. Financial tracking next to the delivery work.',
          tag: 'Billing',
        },
      ],
    },
    {
      id: 'operations',
      icon: CalendarRange,
      eyebrow: 'Schedule & Status',
      title: 'Keep the team coordinated without the chaos.',
      description:
        'Schedule manages meetings and team availability. Status monitors our live systems and deployments. Together, they keep things running smoothly.',
      tone: 'rose',
      routes: ['/schedule', '/status'],
      metrics: ['Team calendar', 'System monitoring', 'Uptime tracking'],
      note: 'Good operations are boring operations. These pages help keep it that way.',
      highlights: [
        {
          icon: CalendarRange,
          title: 'Team schedule',
          description:
            'See who\u2019s available, when meetings are, and plan your week without back-and-forth messages.',
          tag: 'Calendar',
        },
        {
          icon: Activity,
          title: 'Live system status',
          description:
            'Monitor all our production systems in one place. If something\u2019s down, you\u2019ll know before the client does.',
          tag: 'Monitoring',
        },
        {
          icon: Bell,
          title: 'Real-time updates',
          description:
            'The suite auto-refreshes. Task changes, project updates, and notifications come through live — no manual refresh needed.',
          tag: 'Live',
        },
        {
          icon: ClipboardList,
          title: 'Daily check-ins',
          description:
            'Quick daily updates keep the team aligned. What you did, what you\u2019re doing, anything blocking you.',
          tag: 'Check-ins',
        },
      ],
    },
    {
      id: 'intelligence',
      icon: BookOpen,
      eyebrow: 'Knowledge & AI',
      title: 'Don\u2019t start from scratch — the answers are already here.',
      description:
        'Research tracks investigations and findings. Knowledge stores guides and how-tos. And the AI assistant can help you find information, create tasks, and move faster.',
      tone: 'emerald',
      routes: ['/research', '/knowledge', '/agent'],
      metrics: ['Research library', 'Team knowledge base', 'AI assistant'],
      note: 'If you solved a problem, write it down in Knowledge. If you\u2019re investigating something new, use Research. Future you will thank you.',
      highlights: [
        {
          icon: FlaskConical,
          title: 'Research workspace',
          description:
            'Running a technical investigation or market research? Track your findings here so the team can reference them later.',
          tag: 'Research',
        },
        {
          icon: BookOpen,
          title: 'Knowledge base',
          description:
            'Guides, processes, and internal documentation. If someone asks the same question twice, it should live here.',
          tag: 'Knowledge',
        },
        {
          icon: Bot,
          title: 'AI assistant',
          description:
            'Ask questions about projects, create tasks, or get help — the assistant knows the context of your workspace.',
          tag: 'AI',
        },
        {
          icon: Settings,
          title: 'Your settings',
          description:
            'Notification preferences, integrations, and personal config. Make the suite work the way you want.',
          tag: 'Settings',
        },
      ],
    },
  ];

  const roleStep: WalkthroughStep = isAdmin
    ? {
        id: 'admin',
        icon: Shield,
        eyebrow: 'Admin Panel',
        title: 'You have the controls. Here\u2019s where they live.',
        description:
          'As an admin, you manage assignments, attendance, reports, and financials. These tools are separate from everyday work so they don\u2019t clutter the team\u2019s view.',
        tone: 'rose',
        routes: ['/admin', '/admin/assignments', '/payments'],
        metrics: ['Team assignments', 'Attendance tracking', 'Financial overview'],
        note: 'Only admins see the /admin section. Everyone else gets a cleaner, focused experience.',
        highlights: [
          {
            icon: Users,
            title: 'Assign people to projects',
            description:
              'Control who\u2019s working on what. Assignments auto-create tasks from the project roadmap.',
            tag: 'Assignments',
          },
          {
            icon: ClipboardList,
            title: 'Track attendance',
            description:
              'See who\u2019s clocked in, review work sessions, and keep the team accountable.',
            tag: 'Attendance',
          },
          {
            icon: BarChart3,
            title: 'Reports and analytics',
            description:
              'Check-in stats, task completion rates, and team performance — all generated from real data.',
            tag: 'Reports',
          },
          {
            icon: Wallet,
            title: 'Payments and invoices',
            description:
              'Track what\u2019s been invoiced, what\u2019s paid, and what\u2019s outstanding — right next to the project work.',
            tag: 'Financials',
          },
        ],
      }
    : {
        id: 'team-rhythm',
        icon: ClipboardList,
        eyebrow: 'Your Daily Loop',
        title: 'The rhythm is simple once you know it.',
        description:
          'Open Dashboard to see your day. Work inside Projects. Check Schedule for meetings. Update your progress so the team stays in sync. That\u2019s it.',
        tone: 'teal',
        routes: ['/', '/projects', '/schedule'],
        metrics: ['Dashboard first', 'Execute in projects', 'Stay in sync'],
        note: 'The best thing you can do is keep your tasks and check-ins up to date. Everything else follows from that.',
        highlights: [
          {
            icon: LayoutDashboard,
            title: 'Start with Dashboard',
            description:
              'Check what\u2019s on your plate today before diving into project work. 30 seconds, every morning.',
            tag: 'Morning',
          },
          {
            icon: FolderKanban,
            title: 'Do the work in Projects',
            description:
              'Update tasks, upload files, move phases forward. Keep the project state real — not in your head.',
            tag: 'Execute',
          },
          {
            icon: ExternalLink,
            title: 'Check the client view',
            description:
              'Curious what a client sees? Open the portal. It mirrors the real project state automatically.',
            tag: 'Portal',
          },
          {
            icon: Settings,
            title: 'Set up your preferences',
            description:
              'Notification settings, integrations, and personal config. Tweak once, forget about it.',
            tag: 'Settings',
          },
        ],
      };

  return [
    ...sharedSteps,
    roleStep,
    {
      id: 'finish',
      icon: CheckCircle2,
      eyebrow: 'You\u2019re Ready',
      title: 'That\u2019s the whole picture. Go build something.',
      description:
        'Dashboard for your day. Projects for the work. Clients and Portal for the relationship. Knowledge and AI when you need context. You\u2019ve got this.',
      tone: 'sky',
      routes: ['/', '/projects', '/clients', '/agent'],
      metrics: [
        'Dashboard \u2192 Projects \u2192 Clients',
        'One source of truth',
        'Won\u2019t show again',
      ],
      note: 'This walkthrough is saved to your account. It won\u2019t appear again. If you need a refresher, the sidebar has everything.',
      highlights: [
        {
          icon: LayoutDashboard,
          title: 'Dashboard',
          description: 'Your starting point every day. Tasks, meetings, and team pulse.',
          tag: '/',
        },
        {
          icon: FolderKanban,
          title: 'Projects',
          description: 'Where delivery happens. Phases, tasks, files, and team.',
          tag: '/projects',
        },
        {
          icon: Building2,
          title: 'Clients',
          description: 'CRM and portal. The full client relationship in one place.',
          tag: '/clients',
        },
        {
          icon: Bot,
          title: 'AI Assistant',
          description:
            'Ask anything about your workspace. Create tasks, find answers, move faster.',
          tag: '/agent',
        },
      ],
    },
  ];
}

export function InternalAppWalkthrough() {
  const { userId, userRole, loading, isViewingAs } = useAdminContext();
  const [displayName, setDisplayName] = useState('');
  const [visible, setVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  const firstName = displayName.trim().split(/\s+/)[0] || 'there';
  const isInternalUser = userRole === 'admin' || userRole === 'manager' || userRole === 'employee';
  const isAdmin = userRole === 'admin';

  const steps = useMemo(
    () => getInternalWalkthroughSteps(firstName, isAdmin),
    [firstName, isAdmin]
  );

  const currentStep = steps[currentStepIndex];
  const currentTone = currentStep ? toneStyles[currentStep.tone] : toneStyles.teal;

  useEffect(() => {
    if (loading) return;

    if (!userId || !isInternalUser || isViewingAs) {
      setVisible(false);
      setIsChecking(false);
      setCurrentStepIndex(0);
      return;
    }

    const resolvedUserId = userId;
    let cancelled = false;

    async function loadWalkthroughState() {
      const localVersion = readStoredVersion(resolvedUserId);

      if (localVersion === String(WALKTHROUGH_VERSION)) {
        if (!cancelled) {
          setVisible(false);
          setIsChecking(false);
        }
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, internal_onboarding_version')
        .eq('id', resolvedUserId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[InternalAppWalkthrough] Failed to load onboarding state:', error);
        setDisplayName('');
        setCurrentStepIndex(0);
        setVisible(true);
        setIsChecking(false);
        return;
      }

      const version = Number(data?.internal_onboarding_version ?? 0);
      const shouldShow = version < WALKTHROUGH_VERSION;

      setDisplayName(data?.full_name || '');
      setCurrentStepIndex(0);
      setVisible(shouldShow);
      setIsChecking(false);

      if (!shouldShow) {
        writeStoredVersion(resolvedUserId);
      }
    }

    setIsChecking(true);
    loadWalkthroughState();

    return () => {
      cancelled = true;
    };
  }, [isInternalUser, isViewingAs, loading, userId]);

  const persistWalkthroughState = useCallback(() => {
    if (!userId) return;

    writeStoredVersion(userId);

    startSaving(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          internal_onboarding_version: WALKTHROUGH_VERSION,
          internal_onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[InternalAppWalkthrough] Failed to persist onboarding state:', error);
      }
    });
  }, [startSaving, userId]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    persistWalkthroughState();
  }, [persistWalkthroughState]);

  const handleNext = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      handleDismiss();
      return;
    }

    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }, [currentStepIndex, handleDismiss, steps.length]);

  const handleBack = useCallback(() => {
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentStepIndex((index) => Math.max(index - 1, 0));
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss, steps.length, visible]);

  if (loading || isChecking || !visible || !currentStep || !isInternalUser || isViewingAs) {
    return null;
  }

  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;
  const StepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[120] flex items-stretch justify-center overflow-hidden bg-[#081314]/60 p-3 backdrop-blur-xl sm:p-4"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0.16 : 0.24, ease: 'easeOut' }}
        role="dialog"
        aria-modal="true"
        aria-label="Qualia onboarding walkthrough"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-primary/18 absolute left-[-10%] top-[-15%] h-[28rem] w-[28rem] rounded-full blur-[140px]" />
          <div className="bg-sky-500/14 absolute bottom-[-18%] right-[-8%] h-[32rem] w-[32rem] rounded-full blur-[160px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.06]" />
        </div>

        <m.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.985, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 18 }}
          transition={{ duration: shouldReduceMotion ? 0.18 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-full max-h-[960px] w-full max-w-[1320px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,rgba(12,20,21,0.96),rgba(9,15,16,0.98))] text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
        >
          <div
            className={cn(
              'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100',
              currentTone.mesh
            )}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="border-white/8 hidden min-h-0 border-r lg:flex lg:flex-col">
              <div className="border-white/8 border-b px-7 py-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="border-white/12 inline-flex items-center rounded-full border bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/65">
                      Quick Tour
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">Get to know Qualia</p>
                      <p className="mt-1 text-sm leading-6 text-white/55">
                        A quick overview of the key areas. Shown once.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label="Close walkthrough"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-white/45">
                    <span>
                      Step {currentStepIndex + 1} of {steps.length}
                    </span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width] duration-300',
                        currentTone.progress
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <div className="space-y-2">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStepIndex;
                    const tone = toneStyles[step.tone];

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setCurrentStepIndex(index)}
                        className={cn(
                          'w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                          isActive
                            ? cn(
                                'bg-white/[0.07] shadow-[0_20px_45px_rgba(0,0,0,0.18)]',
                                tone.border
                              )
                            : 'hover:border-white/12 border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl',
                              isActive ? tone.iconWrap : 'bg-white/[0.05] text-white/60'
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              {isActive && (
                                <span className={cn('size-1.5 rounded-full', tone.dot)} />
                              )}
                            </div>
                            <p className="text-white/92 mt-2 text-sm font-medium">{step.eyebrow}</p>
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/55">
                              {step.title}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 flex-1 flex-col">
              <div className="border-white/8 border-b px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45 lg:hidden">
                      <span>
                        Step {currentStepIndex + 1} of {steps.length}
                      </span>
                      <span className="inline-block h-1 w-1 rounded-full bg-white/25" />
                      <span>Shown once</span>
                    </div>
                    <p className="mt-1 text-sm text-white/55">
                      Arrow keys or the buttons below to navigate. Esc to skip.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white lg:hidden"
                    aria-label="Close walkthrough"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10 lg:hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-300',
                      currentTone.progress
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <m.div
                    key={currentStep.id}
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    transition={{ duration: shouldReduceMotion ? 0.16 : 0.22, ease: 'easeOut' }}
                    className="grid gap-8 p-5 sm:p-6 xl:grid-cols-[0.95fr_1.2fr] xl:p-8"
                  >
                    <div className="space-y-6">
                      <div
                        className={cn(
                          'relative overflow-hidden rounded-[28px] border bg-white/[0.03] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-7',
                          currentTone.border
                        )}
                      >
                        <div
                          className={cn(
                            'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100',
                            currentTone.glow
                          )}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_38%)]" />

                        <div className="relative space-y-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex size-12 items-center justify-center rounded-2xl border border-white/10 shadow-[0_16px_34px_rgba(0,0,0,0.16)]',
                                currentTone.iconWrap
                              )}
                            >
                              <StepIcon className="size-5" />
                            </div>
                            <div>
                              <div
                                className={cn(
                                  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                                  currentTone.badge
                                )}
                              >
                                {currentStep.eyebrow}
                              </div>
                              <p className="mt-2 text-sm text-white/55">Qualia Suite</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                              {currentStep.title}
                            </h2>
                            <p className="max-w-2xl text-base leading-7 text-white/70">
                              {currentStep.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {currentStep.routes.map((route) => (
                              <span
                                key={route}
                                className={cn(
                                  'rounded-full border px-3 py-1.5 font-mono text-xs tracking-[0.01em]',
                                  currentTone.route
                                )}
                              >
                                {route}
                              </span>
                            ))}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            {currentStep.metrics.map((metric) => (
                              <div
                                key={metric}
                                className="border-white/8 rounded-2xl border bg-black/20 px-4 py-4"
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                  Focus
                                </p>
                                <p className="text-white/92 mt-2 text-sm font-medium leading-6">
                                  {metric}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="border-white/8 rounded-2xl border bg-white/[0.03] px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                              Operating note
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                              {currentStep.note}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative min-h-[20rem]">
                      <div
                        className={cn(
                          'absolute inset-x-[8%] top-10 h-40 rounded-full bg-gradient-to-r blur-3xl',
                          currentTone.glow
                        )}
                      />
                      <div className="relative grid gap-4 sm:grid-cols-2">
                        {currentStep.highlights.map((highlight, index) => {
                          const Icon = highlight.icon;

                          return (
                            <m.div
                              key={highlight.title}
                              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: shouldReduceMotion ? 0.16 : 0.2,
                                delay: shouldReduceMotion ? 0 : index * 0.04,
                                ease: 'easeOut',
                              }}
                              className={cn(
                                'group relative overflow-hidden rounded-[24px] border bg-white/[0.04] p-5 shadow-[0_24px_50px_rgba(0,0,0,0.18)] transition-transform duration-200',
                                'hover:-translate-y-1 hover:bg-white/[0.06]',
                                currentTone.border
                              )}
                            >
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_42%)] opacity-80" />
                              <div className="relative flex h-full flex-col">
                                <div className="flex items-start justify-between gap-3">
                                  <div
                                    className={cn(
                                      'border-white/8 flex size-11 items-center justify-center rounded-2xl border',
                                      currentTone.iconWrap
                                    )}
                                  >
                                    <Icon className="size-4" />
                                  </div>
                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                                    {highlight.tag}
                                  </span>
                                </div>

                                <div className="mt-6 space-y-2">
                                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">
                                    {highlight.title}
                                  </h3>
                                  <p className="text-white/66 text-sm leading-6">
                                    {highlight.description}
                                  </p>
                                </div>
                              </div>
                            </m.div>
                          );
                        })}
                      </div>
                    </div>
                  </m.div>
                </AnimatePresence>
              </div>

              <div className="border-white/8 border-t px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="text-sm text-white/50">
                    {currentStepIndex === steps.length - 1
                      ? 'This won\u2019t show again after you continue.'
                      : 'Take a minute to go through this, or skip and jump straight in.'}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStepIndex === 0}
                      className="border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleDismiss}
                      className="text-white/70 hover:bg-white/[0.08] hover:text-white"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={isSaving}
                      className="bg-white text-[#0B1415] shadow-[0_20px_40px_rgba(255,255,255,0.12)] hover:bg-white/90"
                    >
                      {currentStepIndex === steps.length - 1 ? 'Let\u2019s go' : 'Next'}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
