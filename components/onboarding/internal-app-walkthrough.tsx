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
      eyebrow: 'Internal Suite',
      title: `Welcome to Qualia, ${firstName}.`,
      description:
        'This workspace is the operational layer for delivery, communication, and client visibility. The walkthrough maps the pages your team uses most so new people get context fast and existing people see the same system clearly.',
      tone: 'teal',
      routes: ['/', '/projects', '/portal'],
      metrics: ['One shared system', 'Role-aware navigation', 'Shown once per account'],
      note: 'The shell stays consistent across the suite: sidebar on the left, live utilities in the header, deep work in the center.',
      highlights: [
        {
          icon: Workflow,
          title: 'Navigation stays structured',
          description:
            'Sidebar sections separate workspace views, resources, and external-facing portal access so the suite is easy to scan.',
          tag: 'Sidebar',
        },
        {
          icon: Command,
          title: 'Fast jumps are built in',
          description:
            'Use the command menu when you want to move between pages and actions without hunting through navigation.',
          tag: 'Command menu',
        },
        {
          icon: Bell,
          title: 'Signals stay visible',
          description:
            'Notifications, live assistant entry points, and session-aware controls remain close while you work.',
          tag: 'Global shell',
        },
        {
          icon: Shield,
          title: 'Access is role-aware',
          description:
            'Admins, managers, employees, and clients each see a different slice of the product, but the mental model stays consistent.',
          tag: 'Permissions',
        },
      ],
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      eyebrow: 'Dashboard',
      title: 'Start with the current day, not the whole backlog.',
      description:
        'Dashboard is the operational starting point. It pulls meetings, active work, live project movement, updates, and today-level signals into one focused surface.',
      tone: 'sky',
      routes: ['/'],
      metrics: ['Today view', 'Meetings + task pulse', 'Clock-in aware flow'],
      note: 'If you only open one page to orient yourself each day, make it Dashboard.',
      highlights: [
        {
          icon: ClipboardList,
          title: 'Daily focus stays visible',
          description:
            'Today-level task work is surfaced so people can prioritize what matters now instead of searching through everything.',
          tag: 'Tasks',
        },
        {
          icon: FolderKanban,
          title: 'Project movement is visible',
          description:
            'The dashboard keeps active delivery work in view so you can spot what is building, blocked, or drifting.',
          tag: 'Pipeline pulse',
        },
        {
          icon: CalendarRange,
          title: 'Meetings stay anchored',
          description:
            'Upcoming meetings and day structure are part of the operational view, not buried in a separate calendar tab.',
          tag: 'Schedule',
        },
        {
          icon: MessagesSquare,
          title: 'Updates stay close to execution',
          description:
            'Owner updates, notes, and team context sit near the work instead of living in disconnected side channels.',
          tag: 'Context',
        },
      ],
    },
    {
      id: 'projects',
      icon: FolderKanban,
      eyebrow: 'Projects',
      title: 'Projects is where delivery actually gets controlled.',
      description:
        'Pipeline stages, individual project detail views, tasks, notes, files, and integrations all converge here. This is the main system for moving work from demo to live.',
      tone: 'amber',
      routes: ['/projects', '/projects/[id]'],
      metrics: ['Pipeline stages', 'Project detail views', 'Roadmaps, files, deployments'],
      note: 'Think of Projects as the delivery engine: broad stage visibility first, then depth inside each project.',
      highlights: [
        {
          icon: GitBranch,
          title: 'Stage lanes show portfolio state',
          description:
            'Projects are organized by delivery stage so the team can understand what is in demo, building, pre-production, and live.',
          tag: 'Pipeline',
        },
        {
          icon: LayoutDashboard,
          title: 'Project detail views go deep',
          description:
            'Inside each project you can work through phases, task flow, health, notes, assignments, and supporting context.',
          tag: 'Project page',
        },
        {
          icon: Files,
          title: 'Files and integrations stay attached',
          description:
            'Project assets, delivery files, deployments, and connected tools stay with the project instead of scattering across chats and drives.',
          tag: 'Delivery assets',
        },
        {
          icon: Users,
          title: 'Ownership is explicit',
          description:
            'Assignments, assignees, and execution responsibility stay visible so the team knows who is moving each project forward.',
          tag: 'Coordination',
        },
      ],
    },
    {
      id: 'client-experience',
      icon: Building2,
      eyebrow: 'Clients And Portal',
      title: 'Internal CRM and external portal live in one operating model.',
      description:
        'Use the Clients surface to manage the relationship internally, then switch to the Client Portal whenever you need the customer-facing view of progress, requests, files, and billing.',
      tone: 'violet',
      routes: ['/clients', '/portal'],
      metrics: ['Clients CRM', 'Portal visibility', 'Requests, files, invoices'],
      note: 'The Portal is not a separate universe. It is the client-facing expression of work already tracked inside the ERP.',
      highlights: [
        {
          icon: Building2,
          title: 'Clients keeps the relationship organized',
          description:
            'Use the internal client directory for account-level context, status, contacts, and relationship management.',
          tag: 'CRM',
        },
        {
          icon: ExternalLink,
          title: 'Portal shows the client lens',
          description:
            'Open the portal to see what a client sees: project progress, action items, requests, updates, and next steps.',
          tag: 'Portal dashboard',
        },
        {
          icon: Upload,
          title: 'Requests and uploads stay structured',
          description:
            'Feature requests, file submissions, and portal exchanges stay tied to the project instead of getting lost in email threads.',
          tag: 'Collaboration',
        },
        {
          icon: Receipt,
          title: 'Billing remains attached to the account',
          description:
            'Invoices and billing visibility sit beside delivery context so financial follow-through is easy to track.',
          tag: 'Billing',
        },
      ],
    },
    {
      id: 'operations',
      icon: CalendarRange,
      eyebrow: 'Operations',
      title: 'Schedule and status handle the coordination layer.',
      description:
        'Schedule keeps meetings and calendar structure clean, while Status keeps live-system confidence visible. Together they cover time, readiness, and operational awareness.',
      tone: 'rose',
      routes: ['/schedule', '/status'],
      metrics: ['Schedule discipline', 'System status', 'Operational visibility'],
      note: 'When delivery is strong, operations usually stay boring. These pages help keep it that way.',
      highlights: [
        {
          icon: CalendarRange,
          title: 'Meetings stay organized',
          description:
            'Use the schedule views to manage team availability, meeting placement, and calendar context without guesswork.',
          tag: 'Calendar',
        },
        {
          icon: Activity,
          title: 'Live service health stays visible',
          description:
            'Status gives the team a direct view into monitored production systems so issues are visible before they become surprises.',
          tag: 'Monitoring',
        },
        {
          icon: Bell,
          title: 'Refresh loops are intentional',
          description:
            'Live indicators, notification flows, and operational surfaces help the team stay synchronized without constant manual checking.',
          tag: 'Realtime',
        },
        {
          icon: ClipboardList,
          title: 'Day structure is operationalized',
          description:
            'The platform supports structured workdays, session awareness, and a clean operating rhythm across the team.',
          tag: 'Daily flow',
        },
      ],
    },
    {
      id: 'intelligence',
      icon: BookOpen,
      eyebrow: 'Research, Knowledge, AI',
      title: 'When context is thin, use the system to refill it.',
      description:
        'Research and Knowledge hold reusable context, and the assistant helps you move faster inside the workflow. These surfaces are for precedent, clarification, and sharper execution.',
      tone: 'emerald',
      routes: ['/research', '/knowledge', '/settings'],
      metrics: ['Research workspace', 'Knowledge base', 'AI-assisted context'],
      note: 'The goal is to make context durable. If something matters twice, it should probably live in the system.',
      highlights: [
        {
          icon: FlaskConical,
          title: 'Research captures new findings',
          description:
            'Use Research when work needs fresh investigation, discovery, or decision support that the team may need to revisit later.',
          tag: 'Research',
        },
        {
          icon: BookOpen,
          title: 'Knowledge keeps repeatable answers',
          description:
            'The knowledge area stores guides, patterns, and internal references so the same questions do not have to be solved from zero.',
          tag: 'Knowledge',
        },
        {
          icon: Bot,
          title: 'Assistant is embedded in the workflow',
          description:
            'The assistant is available inside the shell so team members can ask, retrieve, and move without leaving the operating environment.',
          tag: 'AI assistant',
        },
        {
          icon: Settings,
          title: 'Settings control the edges',
          description:
            'Notification preferences, integrations, schedules, and personal controls live here when you need to tune how the system behaves.',
          tag: 'Settings',
        },
      ],
    },
  ];

  const roleStep: WalkthroughStep = isAdmin
    ? {
        id: 'admin',
        icon: Shield,
        eyebrow: 'Admin Controls',
        title: 'Admins get the operational control layer on top of delivery.',
        description:
          'Assignments, attendance, reporting, and financial visibility sit behind the admin section. It is the control plane for staffing, oversight, and business health.',
        tone: 'rose',
        routes: ['/admin', '/admin/assignments', '/payments'],
        metrics: ['Assignments', 'Reports', 'Financial control'],
        note: 'Admin-only tools are grouped separately so the operational control layer does not clutter everyday execution for the whole team.',
        highlights: [
          {
            icon: Users,
            title: 'Assignments stay explicit',
            description:
              'Manage who is attached to which project so ownership and staffing stay visible across the workspace.',
            tag: 'Assignments',
          },
          {
            icon: ClipboardList,
            title: 'Attendance is trackable',
            description:
              'Attendance and work-session visibility provide a direct operational record for daily oversight.',
            tag: 'Attendance',
          },
          {
            icon: BarChart3,
            title: 'Reports stay close to the system',
            description:
              'Reporting surfaces give leaders a clearer view of operational performance without pulling data into a second tool first.',
            tag: 'Reports',
          },
          {
            icon: Wallet,
            title: 'Financial visibility is integrated',
            description:
              'Payment and finance surfaces sit beside delivery context so revenue and execution can be read together.',
            tag: 'Financials',
          },
        ],
      }
    : {
        id: 'team-rhythm',
        icon: ClipboardList,
        eyebrow: 'Execution Rhythm',
        title: 'For daily operators, the loop is intentionally simple.',
        description:
          'Orient on Dashboard, execute inside Projects, keep Schedule clean, and open the Portal whenever client-facing visibility matters. The system works best when updates happen in the system itself.',
        tone: 'teal',
        routes: ['/', '/projects', '/portal', '/settings'],
        metrics: ['Dashboard first', 'Projects for execution', 'Portal for client view'],
        note: 'The fastest teams keep one shared source of truth and avoid recreating the project state in private side channels.',
        highlights: [
          {
            icon: LayoutDashboard,
            title: 'Orient before you dive',
            description:
              'Use Dashboard to decide what matters today before you move into detailed execution screens.',
            tag: 'Start here',
          },
          {
            icon: FolderKanban,
            title: 'Update the delivery system directly',
            description:
              'Move tasks, notes, files, and progress where the rest of the team can see the real project state.',
            tag: 'Execution',
          },
          {
            icon: ExternalLink,
            title: 'Use the portal when you need the client lens',
            description:
              'If you want to verify what a client can see, the portal gives you the external-facing version of the truth.',
            tag: 'Client visibility',
          },
          {
            icon: Settings,
            title: 'Tune your own operating edge',
            description:
              'Keep preferences, notifications, and personal controls aligned with how you actually work.',
            tag: 'Personal setup',
          },
        ],
      };

  return [
    ...sharedSteps,
    roleStep,
    {
      id: 'finish',
      icon: CheckCircle2,
      eyebrow: 'Ready To Move',
      title: 'That is the map.',
      description:
        'Dashboard is for today. Projects is for delivery. Clients and Portal are for relationship visibility. Research, Knowledge, and the assistant fill context gaps. Everything else supports those flows.',
      tone: 'sky',
      routes: ['/', '/projects', '/portal', '/settings'],
      metrics: [
        'Today -> Delivery -> Client visibility',
        'One shared source of truth',
        'No second walkthrough',
      ],
      note: 'This walkthrough is stored per account. Once you continue, it will not reopen automatically for this user.',
      highlights: [
        {
          icon: LayoutDashboard,
          title: 'Dashboard',
          description: 'Open this first when you need the fastest read on what matters now.',
          tag: '/',
        },
        {
          icon: FolderKanban,
          title: 'Projects',
          description: 'Use this when the work needs to move, be clarified, or be delivered.',
          tag: '/projects',
        },
        {
          icon: ExternalLink,
          title: 'Client Portal',
          description: 'Switch here when you need the client-facing lens on progress and requests.',
          tag: '/portal',
        },
        {
          icon: Settings,
          title: 'Settings',
          description:
            'Adjust integrations, notifications, and personal controls when your edge needs tuning.',
          tag: '/settings',
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
                      Qualia Walkthrough
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">
                        Internal onboarding for the suite
                      </p>
                      <p className="mt-1 text-sm leading-6 text-white/55">
                        Comprehensive, account-level, and shown once per user.
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
                      <span>Stored once per user</span>
                    </div>
                    <p className="mt-1 text-sm text-white/55">
                      Use the arrow keys or the controls below to move through the product map.
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
                              <p className="mt-2 text-sm text-white/55">
                                Qualia internal suite walkthrough
                              </p>
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
                      ? 'This will be stored for your account after you continue.'
                      : 'Move through the rest of the walkthrough now, or close it and continue into the suite.'}
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
                      {currentStepIndex === steps.length - 1 ? 'Enter workspace' : 'Next'}
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
