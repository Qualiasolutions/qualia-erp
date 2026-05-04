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

type RadioChoice<T extends string> = { value: T; label: string; help?: string };

type TenMilestoneTime = '<2w' | '2-4w' | '1-2m' | '2-3m' | '3m+' | 'never';
type Confidence4 = 'confident' | 'light_review' | 'partial' | 'no';
type Frequency4 = 'always' | 'usually' | 'sometimes' | 'no';
type SoloCount = 'many' | 'few' | 'once' | 'never';

type FormState = {
  // Multi-select tick boxes
  frameworkCommandsMastered: string[];
  soloCapableProjectTypes: string[];
  weakSpots: string[];

  // Single-choice radios
  tenMilestoneTime: TenMilestoneTime | '';
  clientCommsAlone: Confidence4 | '';
  gapClosureAlone: Frequency4 | '';
  shippedSoloCount: SoloCount | '';
  debugComfort: Frequency4 | '';

  // Scales (1-10)
  frameworkAddonScore: number | null;
  overallMastery: number | null;
  clientHandoffConfidence: number | null;

  // Written
  lastSoloProject: string;
  wishedCommand: string;
  unclearOrBroken: string;
  yesGiveMeSolo: string;
};

const FRAMEWORK_COMMANDS: Array<{ key: string; label: string; help: string }> = [
  { key: 'qualia', label: '/qualia', help: 'state router' },
  { key: 'qualia-new', label: '/qualia-new', help: 'set up a project from scratch' },
  { key: 'qualia-plan', label: '/qualia-plan', help: 'break a phase into tasks' },
  { key: 'qualia-build', label: '/qualia-build', help: 'execute planned tasks in waves' },
  { key: 'qualia-verify', label: '/qualia-verify', help: 'goal-backward verification' },
  { key: 'qualia-polish', label: '/qualia-polish', help: 'design pass · critique · fix' },
  { key: 'qualia-ship', label: '/qualia-ship', help: 'deploy + post-deploy verify' },
  { key: 'qualia-handoff', label: '/qualia-handoff', help: 'archive phase · update STATE' },
  { key: 'qualia-report', label: '/qualia-report', help: 'clock-out + ERP sync' },
  { key: 'qualia-debug', label: '/qualia-debug', help: 'investigative debugging' },
  { key: 'qualia-quick', label: '/qualia-quick', help: 'small fixes / tweaks' },
  { key: 'qualia-task', label: '/qualia-task', help: 'single focused task' },
  { key: 'qualia-test', label: '/qualia-test', help: 'tests + TDD loop' },
  { key: 'qualia-review', label: '/qualia-review', help: 'production audit' },
  { key: 'qualia-optimize', label: '/qualia-optimize', help: 'deep optimization pass' },
  { key: 'qualia-discuss', label: '/qualia-discuss', help: 'alignment interview before plan' },
  { key: 'qualia-research', label: '/qualia-research', help: 'deep research a domain' },
  { key: 'qualia-milestone', label: '/qualia-milestone', help: 'close + open milestones' },
  { key: 'qualia-pause', label: '/qualia-pause', help: 'save context + handoff' },
  { key: 'qualia-resume', label: '/qualia-resume', help: 'restore prior session context' },
];

const PROJECT_TYPES: Array<{ key: string; label: string; help: string }> = [
  { key: 'one_pager', label: 'Single-page marketing site', help: 'hero · features · contact' },
  { key: 'multi_page_site', label: 'Multi-page marketing site', help: '5–10 pages · CMS-light' },
  { key: 'dashboard', label: 'Web app with auth + dashboard', help: 'Supabase · Next.js' },
  { key: 'ai_chat', label: 'AI chatbot integration', help: 'Gemini / OpenRouter / RAG' },
  { key: 'voice_agent', label: 'Voice agent', help: 'Retell + ElevenLabs + Telnyx' },
  { key: 'integration', label: 'Custom integration', help: 'Zoho / Stripe / Calendar APIs' },
  { key: 'wordpress', label: 'WordPress / CMS site', help: 'theme · plugins · content' },
  { key: 'mobile_expo', label: 'React Native / Expo', help: 'iOS / Android' },
];

const WEAK_SPOTS: Array<{ key: string; label: string }> = [
  { key: 'rls', label: 'Supabase RLS / auth policies' },
  { key: 'migrations', label: 'Schema migrations' },
  { key: 'rag', label: 'RAG / embeddings / pgvector' },
  { key: 'ai_tools', label: 'AI tool-use / function calling' },
  { key: 'voice', label: 'Voice agent integrations' },
  { key: 'payments', label: 'Stripe / billing flows' },
  { key: 'animations', label: 'Animations / motion design' },
  { key: 'responsive', label: 'Responsive / mobile layouts' },
  { key: 'a11y', label: 'Accessibility (WCAG, keyboard nav)' },
  { key: 'devops', label: 'DevOps / Vercel / env management' },
  { key: 'testing', label: 'Tests (unit / e2e)' },
  { key: 'client_comms', label: 'Talking to clients directly' },
];

const TEN_MILESTONE_CHOICES: RadioChoice<TenMilestoneTime>[] = [
  { value: '<2w', label: 'Under 2 weeks' },
  { value: '2-4w', label: '2–4 weeks' },
  { value: '1-2m', label: '1–2 months' },
  { value: '2-3m', label: '2–3 months' },
  { value: '3m+', label: '3+ months' },
  { value: 'never', label: 'Never done one' },
];

const CLIENT_COMMS_CHOICES: RadioChoice<Confidence4>[] = [
  { value: 'confident', label: 'Yes — confidently, kickoff to handoff' },
  { value: 'light_review', label: 'Yes, but I want light review on emails / scope' },
  { value: 'partial', label: 'Partial — I can do mid-project, not kickoff or handoff' },
  { value: 'no', label: 'No — I need full support on client comms' },
];

const GAP_CLOSURE_CHOICES: RadioChoice<Frequency4>[] = [
  { value: 'always', label: 'Always — I close gaps without help' },
  { value: 'usually', label: 'Usually — sometimes I get stuck' },
  { value: 'sometimes', label: 'Sometimes — I often need a hand' },
  { value: 'no', label: 'No — I escalate as soon as it fails' },
];

const SHIPPED_SOLO_CHOICES: RadioChoice<SoloCount>[] = [
  { value: 'many', label: 'Yes, many times' },
  { value: 'few', label: 'A few times' },
  { value: 'once', label: 'Once' },
  { value: 'never', label: 'Never' },
];

const DEBUG_COMFORT_CHOICES: RadioChoice<Frequency4>[] = [
  { value: 'always', label: 'Full — I open /qualia-debug and root-cause it' },
  { value: 'usually', label: 'Usually — I get there with one or two prompts' },
  { value: 'sometimes', label: 'Sometimes — depends on the bug' },
  { value: 'no', label: 'I escalate before debugging' },
];

function defaultForm(initial?: Record<string, unknown>): FormState {
  const get = <T,>(key: string, fallback: T): T => {
    if (!initial) return fallback;
    const v = initial[key];
    return v === undefined ? fallback : (v as T);
  };
  return {
    frameworkCommandsMastered: get('frameworkCommandsMastered', [] as string[]),
    soloCapableProjectTypes: get('soloCapableProjectTypes', [] as string[]),
    weakSpots: get('weakSpots', [] as string[]),
    tenMilestoneTime: get('tenMilestoneTime', '' as TenMilestoneTime | ''),
    clientCommsAlone: get('clientCommsAlone', '' as Confidence4 | ''),
    gapClosureAlone: get('gapClosureAlone', '' as Frequency4 | ''),
    shippedSoloCount: get('shippedSoloCount', '' as SoloCount | ''),
    debugComfort: get('debugComfort', '' as Frequency4 | ''),
    frameworkAddonScore: get('frameworkAddonScore', null as number | null),
    overallMastery: get('overallMastery', null as number | null),
    clientHandoffConfidence: get('clientHandoffConfidence', null as number | null),
    lastSoloProject: get('lastSoloProject', ''),
    wishedCommand: get('wishedCommand', ''),
    unclearOrBroken: get('unclearOrBroken', ''),
    yesGiveMeSolo: get('yesGiveMeSolo', ''),
  };
}

function SelfAssessmentForm({
  profileId,
  fullName,
  initial,
  canWritePrivateNotes,
}: {
  profileId: string;
  fullName: string;
  initial?: Record<string, unknown>;
  canWritePrivateNotes: boolean;
}) {
  const [form, setForm] = useState<FormState>(() => defaultForm(initial));
  const [notes, setNotes] = useState('');
  const [isPending, start] = useTransition();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleInList = (
    key: 'frameworkCommandsMastered' | 'soloCapableProjectTypes' | 'weakSpots',
    item: string
  ) =>
    setForm((prev) => {
      const list = prev[key];
      const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
      return { ...prev, [key]: next };
    });

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
        <h2 className="text-base font-semibold tracking-tight">
          Capability audit · Qualia Framework V5 · {fullName}
        </h2>
        <p className="text-[12px] text-muted-foreground">
          Honest answers — we use this to figure out what you can own solo, what you need backup on,
          and where the framework is failing you. There&apos;s no wrong answer.
        </p>
      </div>

      {/* Framework commands mastered — multi-select */}
      <Field
        label="Which framework commands have you mastered?"
        help='"Mastered" = you reach for it without checking docs and it works. Tick all that apply.'
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {FRAMEWORK_COMMANDS.map((cmd) => {
            const active = form.frameworkCommandsMastered.includes(cmd.key);
            return (
              <button
                key={cmd.key}
                type="button"
                onClick={() => toggleInList('frameworkCommandsMastered', cmd.key)}
                className={cn(
                  'flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                  active
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border bg-background hover:border-primary/30'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  )}
                  aria-hidden
                >
                  {active ? <CheckCircle2 className="size-3" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[12px] font-semibold">{cmd.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{cmd.help}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Project types you can take solo — multi-select */}
      <Field
        label="Which project types can you take from 0 → handoff alone?"
        help="Tick all that apply. Solo means: kickoff, build, deploy, handoff — without me stepping in."
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {PROJECT_TYPES.map((pt) => {
            const active = form.soloCapableProjectTypes.includes(pt.key);
            return (
              <button
                key={pt.key}
                type="button"
                onClick={() => toggleInList('soloCapableProjectTypes', pt.key)}
                className={cn(
                  'flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                  active
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground'
                    : 'border-border bg-background hover:border-emerald-500/30'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                    active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border'
                  )}
                  aria-hidden
                >
                  {active ? <CheckCircle2 className="size-3" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium">{pt.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{pt.help}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Time to complete a 10-milestone project on V5 — single choice */}
      <RadioField
        label="With Qualia V5, how long would you need to complete a 10-milestone project from scratch?"
        help="Be realistic. Include planning, building, polish, verify, ship, handoff."
        choices={TEN_MILESTONE_CHOICES}
        value={form.tenMilestoneTime}
        onChange={(v) => update('tenMilestoneTime', v)}
      />

      {/* Client communication — single choice */}
      <RadioField
        label="If you're assigned a project from 0 → handoff, can you handle client communication without backup?"
        help="Kickoff calls, scope discussions, status updates, handoff."
        choices={CLIENT_COMMS_CHOICES}
        value={form.clientCommsAlone}
        onChange={(v) => update('clientCommsAlone', v)}
      />

      {/* Gap closure — single choice */}
      <RadioField
        label="When /qualia-verify returns FAIL, can you close the gaps without help?"
        choices={GAP_CLOSURE_CHOICES}
        value={form.gapClosureAlone}
        onChange={(v) => update('gapClosureAlone', v)}
      />

      {/* Shipped solo — single choice */}
      <RadioField
        label="Have you ever shipped a phase to production solo (no review)?"
        choices={SHIPPED_SOLO_CHOICES}
        value={form.shippedSoloCount}
        onChange={(v) => update('shippedSoloCount', v)}
      />

      {/* Debug comfort — single choice */}
      <RadioField
        label="When something breaks in production, what's your default move?"
        choices={DEBUG_COMFORT_CHOICES}
        value={form.debugComfort}
        onChange={(v) => update('debugComfort', v)}
      />

      {/* 1-10 scales */}
      <ScaleField
        label="From 1 to 10, how well can you talk to the framework to extend a project beyond the planned milestones?"
        help="Add-ons, design polish outside the milestone scope, refactors, bonus features. 1 = no idea, 10 = I improvise freely and the framework cooperates."
        value={form.frameworkAddonScore}
        onChange={(v) => update('frameworkAddonScore', v)}
      />

      <ScaleField
        label="From 1 to 10, your overall mastery of Qualia Framework V5 right now"
        help="1 = I copy commands without understanding. 10 = I know what each command does, when to skip it, and how to recover when it goes wrong."
        value={form.overallMastery}
        onChange={(v) => update('overallMastery', v)}
      />

      <ScaleField
        label="From 1 to 10, your confidence handing a finished project to a real client"
        help="Walking them through what was built, answering their questions, taking responsibility if something breaks."
        value={form.clientHandoffConfidence}
        onChange={(v) => update('clientHandoffConfidence', v)}
      />

      {/* Weak spots — multi-select */}
      <Field
        label="Where do you NOT want to be assigned solo yet? Tick all that apply."
        help="Knowing the gaps now means we don't drop you in blind. There's no penalty for ticking these."
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {WEAK_SPOTS.map((w) => {
            const active = form.weakSpots.includes(w.key);
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => toggleInList('weakSpots', w.key)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition-colors',
                  active
                    ? 'border-amber-500/50 bg-amber-500/10 text-foreground'
                    : 'border-border bg-background hover:border-amber-500/30'
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border',
                    active ? 'border-amber-500 bg-amber-500 text-white' : 'border-border'
                  )}
                  aria-hidden
                >
                  {active ? <CheckCircle2 className="size-3" /> : null}
                </span>
                <span>{w.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Open-text */}
      <Field
        label="Last project you took 0 → handoff alone (or closest)"
        help="Project name + a sentence on the result. If none yet, write 'none'."
      >
        <Input
          value={form.lastSoloProject}
          onChange={(e) => update('lastSoloProject', e.target.value)}
          placeholder="e.g. Velicor Consulting — shipped, M3 closed, awaiting client DNS cutover"
        />
      </Field>

      <Field
        label="One framework command you wish existed"
        help="Something you keep needing that no /qualia-* command does today."
      >
        <Textarea
          rows={2}
          value={form.wishedCommand}
          onChange={(e) => update('wishedCommand', e.target.value)}
          placeholder="e.g. /qualia-translate to swap the project to a new language"
        />
      </Field>

      <Field
        label="What in the framework feels broken, unclear, or slows you down?"
        help="Be specific. This is how we improve V6."
      >
        <Textarea
          rows={3}
          value={form.unclearOrBroken}
          onChange={(e) => update('unclearOrBroken', e.target.value)}
          placeholder="e.g. /qualia-verify gap-cycle limit triggers too early on design phases"
        />
      </Field>

      <Field
        label="If I gave you a brand-new client tomorrow, what kind of project would you say 'yes, give me solo'?"
        help="One concrete example. This is the kind of work we'll route to you first."
      >
        <Textarea
          rows={2}
          value={form.yesGiveMeSolo}
          onChange={(e) => update('yesGiveMeSolo', e.target.value)}
          placeholder="e.g. A multi-page marketing site with a contact form and Calendly booking, EN-only, deploy to Vercel"
        />
      </Field>

      {canWritePrivateNotes ? (
        <Field label="Private notes (admin only — not shown to employee)">
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations from the conversation."
          />
        </Field>
      ) : null}

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

function RadioField<T extends string>({
  label,
  help,
  choices,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  choices: RadioChoice<T>[];
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <Field label={label} help={help}>
      <div className="flex flex-col gap-1.5">
        {choices.map((c) => {
          const active = value === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange(c.value)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors',
                active
                  ? 'border-primary/60 bg-primary/10 text-foreground'
                  : 'border-border bg-background hover:border-primary/30'
              )}
            >
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border',
                  active ? 'border-primary' : 'border-border'
                )}
                aria-hidden
              >
                {active ? <span className="size-2 rounded-full bg-primary" /> : null}
              </span>
              <span className="flex-1">{c.label}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function ScaleField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} help={help}>
      <div className="flex flex-wrap gap-1.5">
        {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md border font-mono text-[12px] tabular-nums transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
              aria-label={`${n} of 10`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </Field>
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

export function AuditDetailView({
  audit,
  canWritePrivateNotes = false,
}: {
  audit: EmployeeAuditPayload;
  canWritePrivateNotes?: boolean;
}) {
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
          Capability audit · Qualia Framework V5
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
          canWritePrivateNotes={canWritePrivateNotes}
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
