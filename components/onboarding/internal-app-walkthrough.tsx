'use client';

import { persistInternalOnboardingState } from '@/app/actions/auth';
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
  Bot,
  Building2,
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
  Monitor,
  Moon,
  Palette,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Upload,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useReducedMotion } from 'framer-motion';

const WALKTHROUGH_VERSION = 2;
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
      title: `Hey ${firstName} \u2014 let\u2019s get you up to speed with Qualia.`,
      description:
        'Qualia is how we build. It\u2019s a framework that runs inside Claude Code and handles planning, building, verifying, and shipping \u2014 so you can focus on the work, not the process.',
      tone: 'teal',
      routes: ['/qualia', '/qualia-new'],
      metrics: ['Type / commands', 'AI handles the rest', 'Takes 3 minutes'],
      note: 'Everything happens inside Claude Code. You type slash commands, the framework orchestrates the workflow. No extra tools to install.',
      highlights: [
        {
          icon: Command,
          title: 'Slash commands are your interface',
          description:
            'Type /qualia in any project to get started. The framework tells you exactly what to do next.',
          tag: 'Commands',
        },
        {
          icon: Workflow,
          title: 'Plan \u2192 Build \u2192 Verify \u2192 Ship',
          description:
            'Every project follows the same flow. The framework enforces quality at each step.',
          tag: 'Workflow',
        },
        {
          icon: Shield,
          title: 'Guards protect you automatically',
          description:
            'Security checks, migration safety, branch protection \u2014 all handled by hooks that run in the background.',
          tag: 'Guards',
        },
        {
          icon: Sparkles,
          title: 'Fresh context per task',
          description:
            'Each task gets a fresh AI brain. Task 50 is as sharp as Task 1. No quality degradation.',
          tag: 'Quality',
        },
      ],
    },
    {
      id: 'starting',
      icon: FolderKanban,
      eyebrow: 'Getting Started',
      title: 'Every project starts with /qualia-new.',
      description:
        'Open Claude Code in your project folder and type /qualia-new. The wizard asks about the client, the scope, and the phases. It creates a .planning/ directory with everything the framework needs.',
      tone: 'sky',
      routes: ['/qualia-new', '/qualia'],
      metrics: ['Interactive setup', 'Creates .planning/', 'Defines all phases'],
      note: 'The .planning/ directory is the project brain \u2014 it tracks state, plans, verifications, and progress. Never edit these files manually.',
      highlights: [
        {
          icon: FolderKanban,
          title: 'Project setup wizard',
          description:
            'Answers a few questions: client name, project type, how many phases. Creates the whole structure.',
          tag: 'Setup',
        },
        {
          icon: Files,
          title: '.planning/ is the brain',
          description:
            'STATE.md tracks where you are. tracking.json syncs to the ERP. Plans and verifications live here.',
          tag: 'State',
        },
        {
          icon: LayoutDashboard,
          title: 'DESIGN.md defines the look',
          description:
            'Colors, fonts, components, shadows \u2014 all specified upfront so the AI builds exactly what you want.',
          tag: 'Design',
        },
        {
          icon: GitBranch,
          title: 'Feature branches only',
          description:
            'The framework creates a branch for you. You never push to main directly \u2014 that\u2019s enforced by guards.',
          tag: 'Git',
        },
      ],
    },
    {
      id: 'planning',
      icon: ClipboardList,
      eyebrow: 'Planning',
      title: 'Before building, you plan. Type /qualia-plan.',
      description:
        'The planner AI reads your project context and breaks the phase into tasks. Each task gets success criteria and verification contracts. You review the plan before building starts.',
      tone: 'amber',
      routes: ['/qualia-plan'],
      metrics: ['AI generates the plan', 'Tasks with success criteria', 'You approve before build'],
      note: 'Plans are not suggestions \u2014 they become the builder\u2019s instructions. If the plan is wrong, the build will be wrong. Review carefully.',
      highlights: [
        {
          icon: ClipboardList,
          title: 'Tasks with \u2018Done when\u2019',
          description:
            'Every task has clear criteria: \u2018Done when auth page renders and accepts email/password.\u2019 No ambiguity.',
          tag: 'Criteria',
        },
        {
          icon: Activity,
          title: 'Verification contracts',
          description:
            'The planner creates testable contracts \u2014 file-exists checks, grep patterns \u2014 that the verifier runs later.',
          tag: 'Contracts',
        },
        {
          icon: Users,
          title: 'Wave-based parallelization',
          description:
            'Independent tasks run in parallel (Wave 1). Dependent tasks wait (Wave 2). Faster builds, same quality.',
          tag: 'Waves',
        },
        {
          icon: CheckCircle2,
          title: 'You approve before anything builds',
          description: 'Read the plan, check the tasks, confirm. Nothing happens until you say go.',
          tag: 'Control',
        },
      ],
    },
    {
      id: 'building',
      icon: Bot,
      eyebrow: 'Building',
      title: 'Now the real work happens. Type /qualia-build.',
      description:
        'The framework spawns a fresh AI agent for each task. They read the plan, build the code, and report results. Each agent gets clean context \u2014 no accumulated garbage from previous tasks.',
      tone: 'violet',
      routes: ['/qualia-build', '/qualia-task', '/qualia-quick'],
      metrics: ['One agent per task', 'Fresh context each time', 'Parallel execution'],
      note: 'If something small needs fixing, use /qualia-quick instead. It skips planning for hot fixes and tweaks.',
      highlights: [
        {
          icon: Bot,
          title: 'Fresh AI per task',
          description:
            'Each builder agent starts with a clean slate. No context pollution. Task 50 is as good as Task 1.',
          tag: 'Isolation',
        },
        {
          icon: Workflow,
          title: 'Waves execute in order',
          description:
            'Wave 1 tasks run in parallel. When all finish, Wave 2 starts. The framework orchestrates everything.',
          tag: 'Execution',
        },
        {
          icon: FlaskConical,
          title: '/qualia-quick for small fixes',
          description:
            'Bug fixes and tweaks don\u2019t need full planning. /qualia-quick skips straight to building.',
          tag: 'Quick',
        },
        {
          icon: Settings,
          title: 'Recovery if things go wrong',
          description:
            'The framework tags a recovery point before each build. If something breaks, you can roll back.',
          tag: 'Safety',
        },
      ],
    },
    {
      id: 'verifying',
      icon: Shield,
      eyebrow: 'Verification',
      title: 'Built doesn\u2019t mean done. Type /qualia-verify.',
      description:
        'The verifier doesn\u2019t trust claims \u2014 it greps the code. Does the file exist? Is it imported? Does the data flow end-to-end? It scores on four dimensions and fails anything below the threshold.',
      tone: 'rose',
      routes: ['/qualia-verify'],
      metrics: ['Checks real code, not claims', 'Scores on 4 dimensions', 'Hard fail threshold'],
      note: 'If verification fails, the framework routes you back to /qualia-plan with a --gaps flag. It only replans what failed. Maximum 2 retries before escalation.',
      highlights: [
        {
          icon: Shield,
          title: 'Goal-backward checking',
          description:
            'Doesn\u2019t ask \u2018did the task run?\u2019 \u2014 asks \u2018does the GOAL hold?\u2019 A component that exists but isn\u2019t imported = FAIL.',
          tag: 'Goals',
        },
        {
          icon: BarChart3,
          title: 'Scored on 4 dimensions',
          description:
            'Correctness, Completeness, Wiring, Quality \u2014 each scored 1\u20135. Any score below 3 = automatic FAIL.',
          tag: 'Scoring',
        },
        {
          icon: Activity,
          title: 'Contracts run automatically',
          description:
            'The testable contracts from planning execute first. File-exists, grep-match, command checks. Deterministic.',
          tag: 'Contracts',
        },
        {
          icon: ExternalLink,
          title: 'Gap closure loop',
          description:
            'Failed? The framework replans just the gaps, rebuilds, re-verifies. Up to 2 cycles before escalating to Fawzi.',
          tag: 'Retry',
        },
      ],
    },
    {
      id: 'polish-ship',
      icon: Upload,
      eyebrow: 'Polish & Deploy',
      title: 'Make it beautiful, then ship it. /qualia-polish \u2192 /qualia-ship.',
      description:
        'Polish runs the anti-AI-slop detector, fixes typography, color, states, motion, accessibility, and responsive design. Ship runs quality gates (TypeScript, lint, build, tests) then deploys to Vercel.',
      tone: 'emerald',
      routes: ['/qualia-polish', '/qualia-ship', '/qualia-handoff'],
      metrics: ['Anti-AI-slop detector', 'Quality gates before deploy', 'Client handoff docs'],
      note: 'After shipping, /qualia-handoff generates the client deliverable: credentials, deployment URL, documentation. Then /qualia-report logs your session.',
      highlights: [
        {
          icon: Palette,
          title: 'Polish kills AI slop',
          description:
            'Scans for generic fonts, card grids, blue-purple gradients, hardcoded colors. Fixes everything automatically.',
          tag: 'Polish',
        },
        {
          icon: Shield,
          title: 'Quality gates block bad deploys',
          description:
            'TypeScript must compile. Lint must pass. Build must succeed. Service keys must not leak to client code.',
          tag: 'Gates',
        },
        {
          icon: Upload,
          title: 'Deploy with one command',
          description:
            '/qualia-ship pushes to GitHub, deploys to Vercel, and verifies the live site returns HTTP 200.',
          tag: 'Deploy',
        },
        {
          icon: Building2,
          title: 'Handoff to the client',
          description:
            '/qualia-handoff creates credentials, docs, and the handover package. Professional delivery, every time.',
          tag: 'Handoff',
        },
      ],
    },
  ];

  const roleStep: WalkthroughStep = isAdmin
    ? {
        id: 'admin',
        icon: Shield,
        eyebrow: 'Your Toolkit',
        title: 'As owner, you have the full picture.',
        description:
          'You can push to main, approve deploys, edit secrets, and manage the team. Everyone else works on feature branches with guard rails. The framework enforces this automatically.',
        tone: 'rose',
        routes: ['/qualia', '/qualia-report'],
        metrics: ['Full access', 'Team management', 'Analytics dashboard'],
        note: 'Run `qualia-framework analytics` to see how plans are performing \u2014 first-pass success rate, gap cycles, hook activity.',
        highlights: [
          {
            icon: Shield,
            title: 'Owner-level access',
            description:
              'Push to main, approve deploys, edit .env files. Guards step aside for you but still log everything.',
            tag: 'Access',
          },
          {
            icon: Users,
            title: 'Team management',
            description:
              '`qualia-framework team list` shows everyone. Add or remove members with their install codes.',
            tag: 'Team',
          },
          {
            icon: BarChart3,
            title: 'Analytics & traces',
            description:
              '`qualia-framework analytics` shows verification pass rates, gap cycles, and hook performance.',
            tag: 'Analytics',
          },
          {
            icon: Receipt,
            title: 'Session reports',
            description:
              '/qualia-report logs hours, commits, and progress. Syncs to the ERP automatically on push.',
            tag: 'Reports',
          },
        ],
      }
    : {
        id: 'daily-flow',
        icon: Workflow,
        eyebrow: 'Your Daily Flow',
        title: 'The flow is simple once you know it.',
        description:
          'Open Claude Code. Type /qualia. It tells you what to do next. Follow the commands: plan, build, verify, polish, ship. End your day with /qualia-report.',
        tone: 'teal',
        routes: ['/qualia', '/qualia-report', '/qualia-pause'],
        metrics: [
          '/qualia tells you what\u2019s next',
          'Follow the road',
          'Report before clock-out',
        ],
        note: '/qualia-pause saves your progress for tomorrow. /qualia-resume picks up exactly where you left off. No context lost between sessions.',
        highlights: [
          {
            icon: LayoutDashboard,
            title: 'Start with /qualia',
            description:
              'It reads the project state and tells you exactly what command to run next. No guessing.',
            tag: 'Start',
          },
          {
            icon: FolderKanban,
            title: 'Follow the road',
            description:
              'Plan \u2192 Build \u2192 Verify \u2192 Polish \u2192 Ship. The framework advances you through each step.',
            tag: 'Flow',
          },
          {
            icon: ExternalLink,
            title: 'Pause and resume',
            description:
              '/qualia-pause saves session context. /qualia-resume picks up tomorrow. Zero context loss.',
            tag: 'Sessions',
          },
          {
            icon: Settings,
            title: '/qualia-report before clock-out',
            description: 'Mandatory. Logs your work, syncs to the ERP. Takes 10 seconds.',
            tag: 'Report',
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
      title: 'That\u2019s the whole framework. Go build something.',
      description:
        '/qualia-new to start. /qualia-plan to plan. /qualia-build to build. /qualia-verify to check. /qualia-polish to make it beautiful. /qualia-ship to deploy. /qualia-report to log. You\u2019ve got this.',
      tone: 'sky',
      routes: ['/qualia', '/qualia-new', '/qualia-plan', '/qualia-build'],
      metrics: [
        'New \u2192 Plan \u2192 Build \u2192 Verify',
        'Polish \u2192 Ship \u2192 Handoff',
        'Won\u2019t show again',
      ],
      note: 'This walkthrough is saved to your account. It won\u2019t appear again. Type /qualia in any project for guidance.',
      highlights: [
        {
          icon: Command,
          title: '/qualia',
          description: 'Your compass. Type it anywhere to know what\u2019s next.',
          tag: '/qualia',
        },
        {
          icon: Workflow,
          title: 'The Road',
          description:
            'New \u2192 Plan \u2192 Build \u2192 Verify \u2192 Polish \u2192 Ship \u2192 Handoff. Every project, every time.',
          tag: 'Flow',
        },
        {
          icon: Bot,
          title: 'AI does the heavy lifting',
          description:
            'You direct. The framework orchestrates. Fresh context per task. Quality guaranteed.',
          tag: 'AI',
        },
        {
          icon: CheckCircle2,
          title: 'Quality is enforced',
          description:
            'Guards, contracts, scored verification, anti-slop detection. Ships only when it\u2019s ready.',
          tag: 'Quality',
        },
      ],
    },
  ];
}

export function InternalAppWalkthrough() {
  const { userId, userRole, loading, isViewingAs } = useAdminContext();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [visible, setVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  const firstName = displayName.trim().split(/\s+/)[0] || 'there';
  const isInternalUser = userRole === 'admin' || userRole === 'employee';
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
      const result = await persistInternalOnboardingState(WALKTHROUGH_VERSION);
      if (!result.success) {
        console.error('[InternalAppWalkthrough] Failed to persist onboarding state:', result.error);
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

                      {currentStep.id === 'theme' ? (
                        <div className="relative grid gap-4 sm:grid-cols-3">
                          {(
                            [
                              {
                                value: 'light',
                                icon: Sun,
                                label: 'Light',
                                desc: 'Clean and bright with warm teal-tinted neutrals.',
                              },
                              {
                                value: 'dark',
                                icon: Moon,
                                label: 'Dark',
                                desc: 'Easy on the eyes with deep teal-tinted surfaces.',
                              },
                              {
                                value: 'system',
                                icon: Monitor,
                                label: 'System',
                                desc: 'Follows your OS preference automatically.',
                              },
                            ] as const
                          ).map((option, index) => {
                            const Icon = option.icon;
                            const isSelected = theme === option.value;

                            return (
                              <m.button
                                key={option.value}
                                type="button"
                                onClick={() => setTheme(option.value)}
                                initial={
                                  shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }
                                }
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: shouldReduceMotion ? 0.16 : 0.2,
                                  delay: shouldReduceMotion ? 0 : index * 0.06,
                                  ease: 'easeOut',
                                }}
                                className={cn(
                                  'group relative flex flex-col items-center overflow-hidden rounded-[24px] border p-6 text-center shadow-[0_24px_50px_rgba(0,0,0,0.18)] transition-all duration-200',
                                  isSelected
                                    ? 'border-primary/40 bg-primary/[0.12] ring-2 ring-primary/30'
                                    : 'border-white/10 bg-white/[0.04] hover:-translate-y-1 hover:bg-white/[0.07]'
                                )}
                              >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_42%)] opacity-80" />
                                <div className="relative flex flex-col items-center gap-4">
                                  <div
                                    className={cn(
                                      'flex size-14 items-center justify-center rounded-2xl border transition-colors',
                                      isSelected
                                        ? 'border-primary/30 bg-primary/20 text-primary'
                                        : 'border-white/10 bg-white/[0.06] text-white/60'
                                    )}
                                  >
                                    <Icon className="size-6" />
                                  </div>
                                  <div className="space-y-2">
                                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">
                                      {option.label}
                                    </h3>
                                    <p className="text-sm leading-6 text-white/55">{option.desc}</p>
                                  </div>
                                  {isSelected && (
                                    <m.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </m.div>
                                  )}
                                </div>
                              </m.button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="relative grid gap-4 sm:grid-cols-2">
                          {currentStep.highlights.map((highlight, index) => {
                            const Icon = highlight.icon;

                            return (
                              <m.div
                                key={highlight.title}
                                initial={
                                  shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }
                                }
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
                      )}
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
