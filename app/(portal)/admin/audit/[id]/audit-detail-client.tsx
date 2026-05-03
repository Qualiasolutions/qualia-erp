'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Folder,
  Flag,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { submitSelfAssessment, type EmployeeAuditPayload } from '@/app/actions/employee-audit';

/* ======================================================================
   Animation primitives
   ====================================================================== */

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

/* ======================================================================
   Tone helpers
   ====================================================================== */

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

function toneClasses(tone: Tone): string {
  switch (tone) {
    case 'good':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'warn':
      return 'text-amber-600 dark:text-amber-400';
    case 'bad':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-foreground';
  }
}

function pct(part: number, whole: number): string {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

/* ======================================================================
   Metric card
   ====================================================================== */

function MetricCard({
  label,
  value,
  sub,
  tone = 'neutral',
  index = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  index?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1.5 text-[22px] font-semibold tabular-nums leading-none tracking-tight',
          toneClasses(tone)
        )}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{sub}</div> : null}
    </motion.div>
  );
}

/* ======================================================================
   Section frame
   ====================================================================== */

function Section({
  title,
  subtitle,
  icon: Icon,
  index,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      className="flex flex-col gap-3"
    >
      <header className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <span className="font-mono text-[11px] text-muted-foreground">· {subtitle}</span>
        ) : null}
      </header>
      {children}
    </motion.section>
  );
}

/* ======================================================================
   Self-assessment form
   ====================================================================== */

type Confidence = 1 | 2 | 3 | 4 | 5;

type ProjectArchetypeAnswer = 'solo' | 'review' | 'pair' | 'no';

type FormState = {
  capacityProjects: string;
  archetypes: Record<string, ProjectArchetypeAnswer | ''>;
  domainConfidence: Record<string, Confidence | ''>;
  realisticTime: string;
  scheduleStart: string;
  scheduleEnd: string;
  daysPerWeek: string;
  frameworkBlocker: string;
  topBlocker: string;
  goalsForMay: string;
  knownLimits: string;
};

const ARCHETYPES: Array<{ key: string; label: string; help: string }> = [
  { key: 'one_pager', label: 'Single-page marketing site', help: 'hero · features · contact' },
  { key: 'multi_page_site', label: 'Multi-page marketing site', help: '5–10 pages · CMS-light' },
  { key: 'dashboard', label: 'Web app with auth + dashboard', help: 'Supabase · Next.js' },
  { key: 'ai_chat', label: 'AI chatbot integration', help: 'Gemini / OpenRouter / RAG' },
  { key: 'voice_agent', label: 'Voice agent', help: 'Retell + ElevenLabs + Telnyx' },
  { key: 'integration', label: 'Custom integration', help: 'Zoho / Stripe / Calendar APIs' },
  { key: 'wordpress', label: 'WordPress / CMS site', help: 'theme · plugins · content' },
  { key: 'mobile_expo', label: 'React Native / Expo', help: 'iOS / Android' },
];

const DOMAINS: Array<{ key: string; label: string }> = [
  { key: 'frontend', label: 'Frontend (React, Tailwind)' },
  { key: 'backend', label: 'Backend (Node / server actions)' },
  { key: 'database', label: 'Database (Supabase / SQL / RLS)' },
  { key: 'integrations', label: 'Third-party integrations' },
  { key: 'ai', label: 'AI / LLM features' },
  { key: 'design', label: 'UI/UX design' },
  { key: 'content', label: 'Copy / content writing' },
  { key: 'deploy', label: 'Deploy / DevOps (Vercel, env)' },
  { key: 'qa', label: 'QA / manual testing' },
  { key: 'framework', label: 'Qualia framework / qualia-report' },
];

const ARCHETYPE_LABELS: Record<ProjectArchetypeAnswer, string> = {
  solo: 'Solo end-to-end',
  review: 'Solo + your code review',
  pair: 'Pair with you',
  no: "Don't try yet",
};

const ARCHETYPE_TONES: Record<ProjectArchetypeAnswer, string> = {
  solo: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  review: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  pair: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  no: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
};

function defaultForm(initial?: Record<string, unknown>): FormState {
  const get = <T,>(key: string, fallback: T): T => {
    if (!initial) return fallback;
    const v = initial[key];
    return v === undefined ? fallback : (v as T);
  };
  return {
    capacityProjects: get('capacityProjects', ''),
    archetypes: get('archetypes', {} as Record<string, ProjectArchetypeAnswer | ''>),
    domainConfidence: get('domainConfidence', {} as Record<string, Confidence | ''>),
    realisticTime: get('realisticTime', ''),
    scheduleStart: get('scheduleStart', ''),
    scheduleEnd: get('scheduleEnd', ''),
    daysPerWeek: get('daysPerWeek', ''),
    frameworkBlocker: get('frameworkBlocker', ''),
    topBlocker: get('topBlocker', ''),
    goalsForMay: get('goalsForMay', ''),
    knownLimits: get('knownLimits', ''),
  };
}

function SelfAssessmentForm({
  profileId,
  fullName,
  initial,
  pastProjects,
}: {
  profileId: string;
  fullName: string;
  initial?: Record<string, unknown>;
  pastProjects: string[];
}) {
  const [form, setForm] = useState<FormState>(() => defaultForm(initial));
  const [notes, setNotes] = useState('');
  const [isPending, start] = useTransition();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateArchetype = (key: string, value: ProjectArchetypeAnswer) =>
    setForm((prev) => ({ ...prev, archetypes: { ...prev.archetypes, [key]: value } }));

  const updateDomain = (key: string, value: Confidence) =>
    setForm((prev) => ({ ...prev, domainConfidence: { ...prev.domainConfidence, [key]: value } }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await submitSelfAssessment(
        profileId,
        form as unknown as Record<string, unknown>,
        notes.trim() || null
      );
      if (result.success) {
        toast.success('Assessment saved.');
      } else {
        toast.error(result.error ?? 'Failed to save.');
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">Interview · {fullName}</h2>
        <p className="text-[12px] text-muted-foreground">
          Walk through these together. Honest answers only &mdash; this shapes the May scope, it
          isn&apos;t a test.
        </p>
      </div>

      {/* Capacity */}
      <Field
        label="How many parallel projects can you confidently deliver in a month?"
        help="Be honest. 1 fully delivered beats 4 half-delivered."
      >
        <Input
          inputMode="numeric"
          placeholder="e.g. 2"
          value={form.capacityProjects}
          onChange={(e) => update('capacityProjects', e.target.value)}
          className="max-w-[140px]"
        />
      </Field>

      {/* Archetypes */}
      <Field
        label="For each project type — what's your honest delivery confidence?"
        help='"Solo end-to-end" means: I deliver, Fawzi only sees the final result.'
      >
        <div className="flex flex-col gap-2">
          {ARCHETYPES.map((a) => (
            <div
              key={a.key}
              className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <div className="text-[13px] font-medium">{a.label}</div>
                <div className="text-[11px] text-muted-foreground">{a.help}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['solo', 'review', 'pair', 'no'] as const).map((opt) => {
                  const active = form.archetypes[a.key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateArchetype(a.key, opt)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? ARCHETYPE_TONES[opt]
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {ARCHETYPE_LABELS[opt]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Field>

      {/* Domain confidence */}
      <Field
        label="Self-rate independence by domain (1 = need handholding, 5 = own it)"
        help="There's no penalty for low scores. We'd rather know."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DOMAINS.map((d) => (
            <div
              key={d.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[13px]">{d.label}</span>
              <div className="flex shrink-0 gap-0.5">
                {([1, 2, 3, 4, 5] as const).map((n) => {
                  const active = form.domainConfidence[d.key] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateDomain(d.key, n)}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded font-mono text-[11px] tabular-nums transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      )}
                      aria-label={`${d.label} ${n} of 5`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Field>

      {/* Time estimation grounded in real past projects */}
      {pastProjects.length > 0 ? (
        <Field
          label={`Based on what you delivered (${pastProjects.slice(0, 3).join(', ')}), how long would a similar project take you next time — start to deploy?`}
          help="Days. Be realistic, include reviews and revisions."
        >
          <Input
            placeholder="e.g. 7 days"
            value={form.realisticTime}
            onChange={(e) => update('realisticTime', e.target.value)}
            className="max-w-xs"
          />
        </Field>
      ) : null}

      {/* Schedule */}
      <Field
        label="What's a realistic working schedule for May?"
        help="Mandatory clock-in/out starts May 1. Set a schedule you'll actually keep."
      >
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Start
            </label>
            <Input
              type="time"
              value={form.scheduleStart}
              onChange={(e) => update('scheduleStart', e.target.value)}
              className="w-[120px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              End
            </label>
            <Input
              type="time"
              value={form.scheduleEnd}
              onChange={(e) => update('scheduleEnd', e.target.value)}
              className="w-[120px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Days per week
            </label>
            <Input
              inputMode="numeric"
              placeholder="5"
              value={form.daysPerWeek}
              onChange={(e) => update('daysPerWeek', e.target.value)}
              className="w-[80px]"
            />
          </div>
        </div>
      </Field>

      {/* Framework + blockers + goals */}
      <Field
        label="What stops you from running /qualia-report after every session?"
        help="Friction we should remove vs habit we should build."
      >
        <Textarea
          rows={2}
          value={form.frameworkBlocker}
          onChange={(e) => update('frameworkBlocker', e.target.value)}
          placeholder="forget · slow · don't understand fields · too many prompts · …"
        />
      </Field>

      <Field
        label="What was the #1 thing that slowed you down last month?"
        help="Tooling, scope churn, unclear requirements, your own focus, anything."
      >
        <Textarea
          rows={2}
          value={form.topBlocker}
          onChange={(e) => update('topBlocker', e.target.value)}
        />
      </Field>

      <Field
        label="What do you want to learn or own in May?"
        help="Pick 1–2 things. We'll align scope to push you there."
      >
        <Textarea
          rows={2}
          value={form.goalsForMay}
          onChange={(e) => update('goalsForMay', e.target.value)}
        />
      </Field>

      <Field
        label="What's outside your zone right now? Where do you NOT want to be assigned solo yet?"
        help="Saying it now means we don't put you there blind."
      >
        <Textarea
          rows={2}
          value={form.knownLimits}
          onChange={(e) => update('knownLimits', e.target.value)}
        />
      </Field>

      <Field label="Fawzi's notes (private — not shown to employee)">
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What you observed during the conversation."
        />
      </Field>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? (
            <Sparkles className="size-3.5 animate-pulse" />
          ) : (
            <Save className="size-3.5" />
          )}
          {isPending ? 'Saving…' : 'Save assessment'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium leading-snug">{label}</label>
      {help ? <p className="text-[11px] text-muted-foreground">{help}</p> : null}
      <div className="mt-1">{children}</div>
    </div>
  );
}

/* ======================================================================
   Main view
   ====================================================================== */

export function AuditDetailView({ audit }: { audit: EmployeeAuditPayload }) {
  const { overview, attendance, sessions, reports, projects } = audit;

  const reportRate =
    sessions.totalSessions > 0 ? Math.round((reports.total / sessions.totalSessions) * 100) : 0;

  // Project-derived metrics (the focus)
  const projectsWithHours = projects.filter((p) => p.hoursLogged > 0).length;
  const totalProjectHours = projects.reduce((sum, p) => sum + p.hoursLogged, 0);
  const avgHoursPerProject =
    projectsWithHours > 0 ? Math.round((totalProjectHours / projectsWithHours) * 10) / 10 : 0;
  const heaviestProject = projects[0]; // already sorted by hours desc
  const heaviestShare =
    totalProjectHours > 0 && heaviestProject
      ? Math.round((heaviestProject.hoursLogged / totalProjectHours) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <motion.header
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={0}
        className="flex flex-col gap-2"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Performance audit · hidden surface · admin only
        </span>
        <h1 className="text-[clamp(1.75rem,1.4rem+1.7vw,2.5rem)] font-semibold tracking-tight">
          {overview.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {overview.email} · {overview.daysInCompany} days in company · expected{' '}
          {attendance.expectedDaysPerWeek}-day week ·{' '}
          {overview.firstSession
            ? `first session ${new Date(overview.firstSession).toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })}`
            : 'no sessions yet'}
        </p>
      </motion.header>

      {/* Headline metrics — projects + framework discipline, not vanity hours */}
      <Section title="Snapshot" icon={Sparkles} index={1}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Projects worked"
            value={projects.length.toString()}
            sub={
              projectsWithHours === projects.length
                ? 'all with logged time'
                : `${projectsWithHours} with logged time`
            }
            tone="neutral"
            index={0}
          />
          <MetricCard
            label={`Attendance · ${attendance.expectedDaysPerWeek}d/wk`}
            value={`${attendance.attendancePct}%`}
            sub={`${attendance.attendedWeekdays}/${attendance.expectedWeekdays} days`}
            tone={
              attendance.attendancePct >= 90
                ? 'good'
                : attendance.attendancePct >= 75
                  ? 'warn'
                  : 'bad'
            }
            index={1}
          />
          <MetricCard
            label="Reports / sessions"
            value={`${reports.total} / ${sessions.totalSessions}`}
            sub={`${reportRate}% report rate`}
            tone={reportRate >= 70 ? 'good' : reportRate >= 40 ? 'warn' : 'bad'}
            index={2}
          />
          <MetricCard
            label="Avg hrs / project"
            value={`${avgHoursPerProject.toFixed(1)}h`}
            sub={
              heaviestProject
                ? `${heaviestProject.projectName.slice(0, 18)} = ${heaviestShare}%`
                : '—'
            }
            tone="neutral"
            index={3}
          />
        </div>
      </Section>

      {/* Attendance */}
      <Section
        title="Attendance"
        icon={Clock}
        subtitle={`${attendance.expectedDaysPerWeek}-day week · Cyprus TZ`}
        index={2}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Expected days"
            value={attendance.expectedWeekdays.toString()}
            sub="since first session"
            index={0}
          />
          <MetricCard
            label="Attended"
            value={attendance.attendedWeekdays.toString()}
            sub={`${attendance.missedWeekdays} missed`}
            tone={
              attendance.missedWeekdays <= 2
                ? 'good'
                : attendance.missedWeekdays <= 5
                  ? 'warn'
                  : 'bad'
            }
            index={1}
          />
          <MetricCard
            label="Late after 10am"
            value={attendance.lateAfter10.toString()}
            sub={pct(attendance.lateAfter10, attendance.attendedWeekdays) + ' of attended'}
            tone={
              attendance.lateAfter10 / Math.max(attendance.attendedWeekdays, 1) > 0.4
                ? 'warn'
                : 'neutral'
            }
            index={2}
          />
          <MetricCard
            label="Started after noon"
            value={attendance.veryLateAfterNoon.toString()}
            sub={pct(attendance.veryLateAfterNoon, attendance.attendedWeekdays)}
            tone={
              attendance.veryLateAfterNoon / Math.max(attendance.attendedWeekdays, 1) > 0.3
                ? 'bad'
                : 'neutral'
            }
            index={3}
          />
        </div>
      </Section>

      {/* Framework hygiene */}
      <Section title="Framework hygiene" icon={Flag} subtitle="qualia-report quality" index={3}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Verifications passed"
            value={reports.verifPassed.toString()}
            sub={`${pct(reports.verifPassed, reports.total)} of reports`}
            tone={reports.verifPassed > reports.verifFailed ? 'good' : 'warn'}
            index={0}
          />
          <MetricCard
            label="Verifications failed"
            value={reports.verifFailed.toString()}
            sub={`${pct(reports.verifFailed, reports.total)} of reports`}
            tone={reports.verifFailed > 3 ? 'bad' : 'warn'}
            index={1}
          />
          <MetricCard
            label="No deploy URL"
            value={reports.noDeployUrl.toString()}
            sub={`${pct(reports.noDeployUrl, reports.total)} missing proof of ship`}
            tone={reports.noDeployUrl > reports.total / 2 ? 'bad' : 'warn'}
            index={2}
          />
          <MetricCard
            label="No client_id linked"
            value={reports.noClientId.toString()}
            sub="reports w/o client mapping"
            tone={reports.noClientId === reports.total && reports.total > 0 ? 'bad' : 'warn'}
            index={3}
          />
        </div>
      </Section>

      {/* Session hygiene */}
      <Section
        title="Session hygiene"
        icon={Users}
        subtitle="clock-in / clock-out discipline"
        index={4}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Sessions w/o project"
            value={sessions.noProject.toString()}
            sub={pct(sessions.noProject, sessions.totalSessions) + ' of total'}
            tone={sessions.noProject / Math.max(sessions.totalSessions, 1) > 0.3 ? 'bad' : 'warn'}
            index={0}
          />
          <MetricCard
            label="No planned outcome"
            value={sessions.noPlannedOutcome.toString()}
            sub={pct(sessions.noPlannedOutcome, sessions.totalSessions)}
            tone="warn"
            index={1}
          />
          <MetricCard
            label="No planned duration"
            value={sessions.noPlannedDuration.toString()}
            sub={pct(sessions.noPlannedDuration, sessions.totalSessions)}
            tone="warn"
            index={2}
          />
          <MetricCard
            label="No report URL on close"
            value={sessions.noReportUrl.toString()}
            sub={pct(sessions.noReportUrl, sessions.totalSessions)}
            tone={sessions.noReportUrl / Math.max(sessions.totalSessions, 1) > 0.7 ? 'bad' : 'warn'}
            index={3}
          />
        </div>
      </Section>

      {/* Project history */}
      <Section
        title="Project history"
        icon={Folder}
        subtitle={`${projects.length} projects`}
        index={5}
      >
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No project assignments on record.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    Project
                  </th>
                  <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    Client
                  </th>
                  <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    Hours
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    Tasks
                  </th>
                  <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    Deadline
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const overdue = p.deadlineDate && new Date(p.deadlineDate) < new Date();
                  return (
                    <tr
                      key={`${p.projectId}:${p.deadlineDate ?? 'none'}`}
                      className="border-t border-border"
                    >
                      <td className="px-4 py-2.5 font-medium">{p.projectName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.clientName ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {p.hoursLogged.toFixed(1)}h
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                        {p.tasksDoneOnProject}/{p.tasksOnProject}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2.5 font-mono tabular-nums',
                          overdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                        )}
                      >
                        {p.deadlineDate
                          ? new Date(p.deadlineDate).toLocaleDateString('en-IE', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Observations — fair, evidence-based */}
      <Section
        title="Observations"
        icon={AlertTriangle}
        subtitle="evidence-based, not judgmental"
        index={6}
      >
        <ObservationList audit={audit} />
      </Section>

      {/* Self-assessment form */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={7} className="mt-2">
        <SelfAssessmentForm
          profileId={overview.profileId}
          fullName={overview.fullName ?? 'Employee'}
          initial={audit.latestAssessment?.responses}
          pastProjects={projects.slice(0, 3).map((p) => p.projectName)}
        />
      </motion.div>
    </div>
  );
}

function ObservationList({ audit }: { audit: EmployeeAuditPayload }) {
  const items: Array<{
    tone: Tone;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [];

  const reportRate =
    audit.sessions.totalSessions > 0
      ? Math.round((audit.reports.total / audit.sessions.totalSessions) * 100)
      : 0;

  const projectsWithRealHours = audit.projects.filter((p) => p.hoursLogged >= 1);
  const projectsTouchedNoHours = audit.projects.filter((p) => p.hoursLogged < 1).length;
  const totalProjectHours = audit.projects.reduce((sum, p) => sum + p.hoursLogged, 0);
  const heaviest = audit.projects[0];
  const heaviestShare =
    totalProjectHours > 0 && heaviest
      ? Math.round((heaviest.hoursLogged / totalProjectHours) * 100)
      : 0;

  /* ---------------- Strengths first ---------------- */

  if (audit.attendance.attendancePct >= 90 && audit.attendance.expectedWeekdays >= 15) {
    items.push({
      tone: 'good',
      icon: TrendingUp,
      text: `Reliable attendance: ${audit.attendance.attendancePct}% on a ${audit.attendance.expectedDaysPerWeek}-day week (${audit.attendance.attendedWeekdays}/${audit.attendance.expectedWeekdays}).`,
    });
  }

  if (audit.projects.length >= 3 && projectsWithRealHours.length >= 2) {
    items.push({
      tone: 'good',
      icon: CheckCircle2,
      text: `Worked on ${audit.projects.length} projects total, ${projectsWithRealHours.length} with substantial logged time.`,
    });
  }

  if (heaviest && heaviestShare >= 60 && totalProjectHours > 50) {
    items.push({
      tone: 'good',
      icon: CheckCircle2,
      text: `Specialist pattern: ${heaviestShare}% of logged time on ${heaviest.projectName} (${heaviest.hoursLogged.toFixed(0)}h). Deep on one thing, not scattered.`,
    });
  }

  /* ---------------- Concerns, project + framework focused ---------------- */

  // Reports vs sessions — the central framework discipline metric
  if (reportRate < 50 && audit.sessions.totalSessions >= 10) {
    items.push({
      tone: 'warn',
      icon: TrendingDown,
      text: `Reports cover only ${reportRate}% of sessions (${audit.reports.total} reports / ${audit.sessions.totalSessions} sessions). The framework's data on what was actually shipped is missing for half the work.`,
    });
  } else if (reportRate >= 50 && reportRate < 80 && audit.sessions.totalSessions >= 10) {
    items.push({
      tone: 'warn',
      icon: TrendingDown,
      text: `Reports cover ${reportRate}% of sessions (${audit.reports.total}/${audit.sessions.totalSessions}). Decent — but every clock-out should produce a report.`,
    });
  }

  // Project breadth without depth
  if (projectsTouchedNoHours >= 4) {
    items.push({
      tone: 'warn',
      icon: TrendingDown,
      text: `${projectsTouchedNoHours} projects on the list with no logged hours — assigned but never properly worked. Either scope creep on assignments or they were dropped without being formally removed.`,
    });
  }

  // Time per project — where it goes
  if (heaviest && heaviestShare >= 75 && audit.projects.length >= 3) {
    items.push({
      tone: 'warn',
      icon: TrendingDown,
      text: `${heaviestShare}% of logged time on a single project (${heaviest.projectName}). Heavy concentration — fine if intentional, risky if it means other assignments aren't getting touched.`,
    });
  }

  // Attendance — work-week-aware
  if (audit.attendance.attendancePct < 80 && audit.attendance.expectedWeekdays >= 15) {
    items.push({
      tone: 'warn',
      icon: TrendingDown,
      text: `Missed ${audit.attendance.missedWeekdays} of ${audit.attendance.expectedWeekdays} expected days (${audit.attendance.expectedDaysPerWeek}-day week, ${100 - audit.attendance.attendancePct}% gap). Mandatory clock-in starting May 1 raises the floor — worth understanding the cause before then.`,
    });
  }

  if (
    audit.attendance.veryLateAfterNoon / Math.max(audit.attendance.attendedWeekdays, 1) > 0.4 &&
    audit.attendance.attendedWeekdays >= 10
  ) {
    items.push({
      tone: 'warn',
      icon: TrendingDown,
      text: `Started after noon on ${audit.attendance.veryLateAfterNoon} of ${audit.attendance.attendedWeekdays} attended days. Body's there — morning isn't. Worth agreeing a real start time for May.`,
    });
  }

  // Report content quality (not just count)
  if (audit.reports.noDeployUrl > audit.reports.total / 2 && audit.reports.total >= 5) {
    items.push({
      tone: 'warn',
      icon: TrendingDown,
      text: `${audit.reports.noDeployUrl}/${audit.reports.total} reports have no deploy URL. Without it, "shipped" is a claim, not evidence.`,
    });
  }

  // Session-to-project linkage
  if (audit.sessions.noProject / Math.max(audit.sessions.totalSessions, 1) > 0.25) {
    items.push({
      tone: 'warn',
      icon: TrendingDown,
      text: `${audit.sessions.noProject}/${audit.sessions.totalSessions} sessions had no project linked. Time on those days exists but can't be attributed to a client or deliverable.`,
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Not enough data yet to surface patterns.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => {
        const Icon = item.icon;
        const tone = item.tone;
        return (
          <motion.li
            key={i}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={i}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              tone === 'good' && 'border-emerald-500/20 bg-emerald-500/[0.04]',
              tone === 'warn' && 'border-amber-500/20 bg-amber-500/[0.04]',
              tone === 'bad' && 'border-red-500/20 bg-red-500/[0.04]',
              tone === 'neutral' && 'border-border bg-card'
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', toneClasses(tone))} aria-hidden />
            <p className="text-[13px] leading-relaxed text-foreground/90">{item.text}</p>
          </motion.li>
        );
      })}
    </ul>
  );
}
