'use client';

import { useState } from 'react';
import {
  Zap,
  Bot,
  Mail,
  Phone,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  Globe,
  MessageSquare,
  BarChart3,
  Shield,
  RefreshCw,
  ArrowRight,
  Activity,
  Sparkles,
  Send,
  CalendarCheck,
  Brain,
  Mic,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AutomationStatus = 'active' | 'paused' | 'monitoring';

interface Automation {
  id: string;
  name: string;
  description: string;
  category: string;
  status: AutomationStatus;
  icon: LucideIcon;
  trigger: string;
  lastRun: string;
  runsToday: number;
  successRate: number;
  tools: string[];
}

const AUTOMATIONS: Automation[] = [
  {
    id: 'lead-qualifier',
    name: 'Lead Qualification Agent',
    description:
      'Scores inbound leads from website forms, LinkedIn, and referrals. Enriches with company data, assigns lead temperature, and routes hot leads to calendar.',
    category: 'Sales',
    status: 'active',
    icon: TrendingUp,
    trigger: 'New form submission or CRM entry',
    lastRun: '12 min ago',
    runsToday: 18,
    successRate: 94,
    tools: ['Supabase', 'Gemini AI', 'Resend'],
  },
  {
    id: 'voice-receptionist',
    name: 'Voice AI Receptionist',
    description:
      'Handles inbound calls 24/7. Qualifies caller intent, books discovery calls, answers FAQs about services and pricing, and logs call summaries to CRM.',
    category: 'Voice',
    status: 'active',
    icon: Phone,
    trigger: 'Inbound phone call via Telnyx',
    lastRun: '3 hours ago',
    runsToday: 5,
    successRate: 91,
    tools: ['VAPI', 'ElevenLabs', 'Telnyx', 'Supabase'],
  },
  {
    id: 'project-health-monitor',
    name: 'Project Health Monitor',
    description:
      'Runs daily health checks across all active projects. Detects overdue tasks, stalled phases, scope creep, and budget burn rate. Sends alerts and generates health insights.',
    category: 'Operations',
    status: 'active',
    icon: Activity,
    trigger: 'Daily at 08:00 AM (cron)',
    lastRun: 'Today 08:00 AM',
    runsToday: 1,
    successRate: 100,
    tools: ['Supabase', 'Gemini AI', 'Resend'],
  },
  {
    id: 'client-followup',
    name: 'Client Follow-up Sequences',
    description:
      'Tracks client engagement and triggers personalized follow-up emails. Detects cold clients (no contact in 14+ days) and sends re-engagement sequences.',
    category: 'Sales',
    status: 'active',
    icon: Mail,
    trigger: 'Client inactivity threshold exceeded',
    lastRun: '2 hours ago',
    runsToday: 7,
    successRate: 96,
    tools: ['Supabase', 'Resend', 'Gemini AI'],
  },
  {
    id: 'meeting-prep',
    name: 'Meeting Prep Assistant',
    description:
      'Before each client meeting, compiles a brief: project status, open issues, recent activity, talking points, and outstanding invoices. Delivered 30 min before meeting time.',
    category: 'Operations',
    status: 'active',
    icon: CalendarCheck,
    trigger: '30 min before scheduled meeting',
    lastRun: 'Today 09:30 AM',
    runsToday: 3,
    successRate: 100,
    tools: ['Supabase', 'Gemini AI', 'Zoho'],
  },
  {
    id: 'invoice-automation',
    name: 'Invoice Generation & Reminders',
    description:
      'Auto-generates invoices from completed project milestones. Sends payment reminders at 3, 7, and 14 days overdue. Escalates to phone follow-up after 21 days.',
    category: 'Finance',
    status: 'active',
    icon: FileText,
    trigger: 'Phase completion or payment overdue',
    lastRun: '1 day ago',
    runsToday: 2,
    successRate: 98,
    tools: ['Zoho Invoice', 'Supabase', 'Resend'],
  },
  {
    id: 'seo-monitor',
    name: 'SEO & Performance Monitor',
    description:
      'Monitors client website rankings, Core Web Vitals, and uptime. Alerts on ranking drops > 5 positions, performance regressions, or downtime detected.',
    category: 'Monitoring',
    status: 'active',
    icon: Search,
    trigger: 'Every 6 hours (cron)',
    lastRun: '2 hours ago',
    runsToday: 4,
    successRate: 99,
    tools: ['Google Search Console', 'Vercel Analytics', 'Supabase'],
  },
  {
    id: 'proposal-generator',
    name: 'Proposal & SOW Generator',
    description:
      'Generates tailored project proposals from discovery call notes. Includes scope, timeline, pricing tiers, and tech stack recommendations based on client industry.',
    category: 'Sales',
    status: 'active',
    icon: Sparkles,
    trigger: 'After discovery call summary logged',
    lastRun: '1 day ago',
    runsToday: 1,
    successRate: 92,
    tools: ['Gemini AI', 'Supabase', 'Resend'],
  },
  {
    id: 'code-review-bot',
    name: 'Automated Code Review',
    description:
      'Reviews PRs from trainee developers against Qualia coding standards. Checks TypeScript strictness, security patterns, component structure, and provides inline feedback.',
    category: 'Engineering',
    status: 'active',
    icon: Shield,
    trigger: 'New pull request opened',
    lastRun: '4 hours ago',
    runsToday: 6,
    successRate: 97,
    tools: ['GitHub Actions', 'Claude AI', 'ESLint'],
  },
  {
    id: 'voice-outreach',
    name: 'Voice Outreach Campaigns',
    description:
      'Runs targeted voice outreach to warm leads. AI agent introduces Qualia services, gauges interest, and books qualified meetings. Respects timezone and DNC lists.',
    category: 'Voice',
    status: 'paused',
    icon: Mic,
    trigger: 'Scheduled campaign batches',
    lastRun: '3 days ago',
    runsToday: 0,
    successRate: 78,
    tools: ['VAPI', 'Telnyx', 'Supabase'],
  },
  {
    id: 'weekly-digest',
    name: 'Weekly Client Digest',
    description:
      'Every Friday, generates and sends personalized progress reports to each active client. Includes completed work, upcoming milestones, hours logged, and next steps.',
    category: 'Operations',
    status: 'active',
    icon: Send,
    trigger: 'Every Friday at 4:00 PM',
    lastRun: 'Last Friday',
    runsToday: 0,
    successRate: 100,
    tools: ['Supabase', 'Gemini AI', 'Resend'],
  },
  {
    id: 'chat-support',
    name: 'AI Chat Support Agent',
    description:
      'Embedded on client websites to handle visitor questions, capture leads, and provide instant answers about services. Escalates complex queries to human.',
    category: 'Sales',
    status: 'active',
    icon: MessageSquare,
    trigger: 'Visitor initiates chat',
    lastRun: '45 min ago',
    runsToday: 22,
    successRate: 88,
    tools: ['Gemini AI', 'Supabase', 'WebSocket'],
  },
  {
    id: 'deployment-monitor',
    name: 'Deployment & Uptime Monitor',
    description:
      'Watches all client Vercel deployments. Auto-runs Lighthouse audits post-deploy, checks for build errors, and monitors uptime across all live projects.',
    category: 'Monitoring',
    status: 'active',
    icon: Globe,
    trigger: 'Post-deployment webhook',
    lastRun: '1 hour ago',
    runsToday: 8,
    successRate: 100,
    tools: ['Vercel API', 'Lighthouse', 'Supabase'],
  },
  {
    id: 'trainee-onboarding',
    name: 'Trainee Onboarding Flow',
    description:
      'Guides new trainees through setup, codebase orientation, and first tasks. Assigns starter projects, tracks progress, and escalates blockers to mentors.',
    category: 'Operations',
    status: 'active',
    icon: Users,
    trigger: 'New team member added',
    lastRun: '5 days ago',
    runsToday: 0,
    successRate: 100,
    tools: ['Supabase', 'GitHub', 'Resend'],
  },
  {
    id: 'analytics-reporter',
    name: 'Analytics & KPI Reporter',
    description:
      'Aggregates key business metrics: revenue pipeline, project velocity, client satisfaction scores, team utilization. Generates dashboard data and weekly trend analysis.',
    category: 'Finance',
    status: 'active',
    icon: BarChart3,
    trigger: 'Daily at 07:00 AM',
    lastRun: 'Today 07:00 AM',
    runsToday: 1,
    successRate: 100,
    tools: ['Supabase', 'Zoho', 'Gemini AI'],
  },
  {
    id: 'knowledge-rag',
    name: 'Knowledge Base RAG Engine',
    description:
      'Indexes all project documents, meeting notes, and internal guides into vector embeddings. Powers the AI assistant with company-specific context for accurate answers.',
    category: 'Engineering',
    status: 'active',
    icon: Brain,
    trigger: 'New document uploaded or updated',
    lastRun: '30 min ago',
    runsToday: 11,
    successRate: 99,
    tools: ['pgvector', 'Gemini AI', 'Supabase Storage'],
  },
  {
    id: 'task-scheduler',
    name: 'Smart Task Scheduler',
    description:
      'Analyzes team capacity, project priorities, and deadlines to auto-assign and schedule tasks. Detects overloaded team members and suggests redistribution.',
    category: 'Operations',
    status: 'monitoring',
    icon: Clock,
    trigger: 'New task created or deadline changed',
    lastRun: '20 min ago',
    runsToday: 14,
    successRate: 85,
    tools: ['Supabase', 'Gemini AI'],
  },
  {
    id: 'contract-sync',
    name: 'Contract & Renewal Tracker',
    description:
      'Monitors active contracts and flags upcoming renewals 30 days out. Generates renewal proposals with updated pricing and scope based on project history.',
    category: 'Finance',
    status: 'active',
    icon: RefreshCw,
    trigger: 'Contract expiry within 30 days',
    lastRun: '2 days ago',
    runsToday: 0,
    successRate: 100,
    tools: ['Zoho', 'Supabase', 'Gemini AI'],
  },
];

const CATEGORIES = [
  'All',
  'Sales',
  'Voice',
  'Operations',
  'Finance',
  'Engineering',
  'Monitoring',
] as const;

const STATUS_CONFIG: Record<AutomationStatus, { label: string; color: string; dotColor: string }> =
  {
    active: {
      label: 'Active',
      color: 'text-emerald-400',
      dotColor: 'bg-emerald-400',
    },
    paused: {
      label: 'Paused',
      color: 'text-amber-400',
      dotColor: 'bg-amber-400',
    },
    monitoring: {
      label: 'Monitoring',
      color: 'text-blue-400',
      dotColor: 'bg-blue-400',
    },
  };

const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-violet-500/10 text-violet-400',
  Voice: 'bg-rose-500/10 text-rose-400',
  Operations: 'bg-sky-500/10 text-sky-400',
  Finance: 'bg-emerald-500/10 text-emerald-400',
  Engineering: 'bg-amber-500/10 text-amber-400',
  Monitoring: 'bg-cyan-500/10 text-cyan-400',
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AutomationCard({ automation }: { automation: Automation }) {
  const statusConfig = STATUS_CONFIG[automation.status];

  return (
    <div className="group rounded-xl border border-border/60 bg-card/80 p-5 transition-all duration-200 hover:border-border hover:bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="bg-primary/8 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary">
            <automation.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-foreground">{automation.name}</h3>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  CATEGORY_COLORS[automation.category]
                )}
              >
                {automation.category}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {automation.description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dotColor)} />
          <span className={cn('text-xs font-medium', statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Metadata row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/40 pt-3.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 text-primary/60" />
          <span className="font-medium text-foreground/80">{automation.trigger}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {automation.lastRun}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          {automation.runsToday} runs today
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {automation.successRate >= 95 ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          ) : automation.successRate >= 85 ? (
            <CheckCircle2 className="h-3 w-3 text-amber-400" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-rose-400" />
          )}
          <span
            className={cn(
              'font-medium',
              automation.successRate >= 95
                ? 'text-emerald-400'
                : automation.successRate >= 85
                  ? 'text-amber-400'
                  : 'text-rose-400'
            )}
          >
            {automation.successRate}% success
          </span>
        </div>
      </div>

      {/* Tools */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {automation.tools.map((tool) => (
          <span
            key={tool}
            className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AutomationsClient() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = AUTOMATIONS.filter((a) => {
    const matchesCategory = activeCategory === 'All' || a.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tools.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const activeCount = AUTOMATIONS.filter((a) => a.status === 'active').length;
  const totalRunsToday = AUTOMATIONS.reduce((sum, a) => sum + a.runsToday, 0);
  const avgSuccess = Math.round(
    AUTOMATIONS.reduce((sum, a) => sum + a.successRate, 0) / AUTOMATIONS.length
  );

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Automations
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              AI agents & workflows powering Qualia operations
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            label="Total Automations"
            value={AUTOMATIONS.length}
            icon={Bot}
            accent="bg-primary/10 text-primary"
          />
          <StatCard
            label="Active Now"
            value={activeCount}
            icon={CheckCircle2}
            accent="bg-emerald-500/10 text-emerald-400"
          />
          <StatCard
            label="Runs Today"
            value={totalRunsToday}
            icon={Zap}
            accent="bg-amber-500/10 text-amber-400"
          />
          <StatCard
            label="Avg Success Rate"
            value={`${avgSuccess}%`}
            icon={TrendingUp}
            accent="bg-violet-500/10 text-violet-400"
          />
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
                  activeCategory === cat
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {cat}
                {cat !== 'All' && (
                  <span className="ml-1.5 opacity-50">
                    {AUTOMATIONS.filter((a) => a.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search automations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border border-border/60 bg-card/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 sm:w-64"
            />
          </div>
        </div>

        {/* Pipeline visualization */}
        <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary/60" />
            <span className="text-xs font-semibold text-foreground">Automation Pipeline</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-md bg-violet-500/10 px-2.5 py-1 font-medium text-violet-400">
              Lead Capture
            </span>
            <ArrowRight className="h-3 w-3 text-border" />
            <span className="rounded-md bg-rose-500/10 px-2.5 py-1 font-medium text-rose-400">
              Voice Qualification
            </span>
            <ArrowRight className="h-3 w-3 text-border" />
            <span className="rounded-md bg-sky-500/10 px-2.5 py-1 font-medium text-sky-400">
              Proposal Generation
            </span>
            <ArrowRight className="h-3 w-3 text-border" />
            <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-400">
              Project Setup
            </span>
            <ArrowRight className="h-3 w-3 text-border" />
            <span className="rounded-md bg-amber-500/10 px-2.5 py-1 font-medium text-amber-400">
              Delivery & Monitoring
            </span>
            <ArrowRight className="h-3 w-3 text-border" />
            <span className="rounded-md bg-cyan-500/10 px-2.5 py-1 font-medium text-cyan-400">
              Invoicing & Renewal
            </span>
          </div>
        </div>

        {/* Automation cards */}
        <div className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
              <Bot className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No automations found</p>
            </div>
          ) : (
            filtered.map((automation) => (
              <AutomationCard key={automation.id} automation={automation} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
