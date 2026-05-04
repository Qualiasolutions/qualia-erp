'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { submitSelfAssessment, type AuditExamPayload } from '@/app/actions/employee-audit';

/* ======================================================================
   Constants — questionnaire content
   ====================================================================== */

type RadioChoice<T extends string> = { value: T; label: string };

type TenMilestoneTime = '<2w' | '2-4w' | '1-2m' | '2-3m' | '3m+' | 'never';
type Confidence4 = 'confident' | 'light_review' | 'partial' | 'no';
type Frequency4 = 'always' | 'usually' | 'sometimes' | 'no';
type SoloCount = 'many' | 'few' | 'once' | 'never';

type FormState = {
  frameworkCommandsMastered: string[];
  soloCapableProjectTypes: string[];
  weakSpots: string[];
  tenMilestoneTime: TenMilestoneTime | '';
  clientCommsAlone: Confidence4 | '';
  gapClosureAlone: Frequency4 | '';
  shippedSoloCount: SoloCount | '';
  debugComfort: Frequency4 | '';
  frameworkAddonScore: number | null;
  overallMastery: number | null;
  clientHandoffConfidence: number | null;
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

const TOTAL_QUESTIONS = 15;

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

function answeredCount(form: FormState): number {
  let n = 0;
  if (form.frameworkCommandsMastered.length > 0) n++;
  if (form.soloCapableProjectTypes.length > 0) n++;
  if (form.weakSpots.length > 0) n++;
  if (form.tenMilestoneTime) n++;
  if (form.clientCommsAlone) n++;
  if (form.gapClosureAlone) n++;
  if (form.shippedSoloCount) n++;
  if (form.debugComfort) n++;
  if (form.frameworkAddonScore !== null) n++;
  if (form.overallMastery !== null) n++;
  if (form.clientHandoffConfidence !== null) n++;
  if (form.lastSoloProject.trim()) n++;
  if (form.wishedCommand.trim()) n++;
  if (form.unclearOrBroken.trim()) n++;
  if (form.yesGiveMeSolo.trim()) n++;
  return n;
}

/* ======================================================================
   Building blocks
   ====================================================================== */

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function Question({
  number,
  prompt,
  hint,
  children,
  index,
}: {
  number: number;
  prompt: string;
  hint?: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      className="border-t border-border/60 pt-8"
    >
      <header className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Q{String(number).padStart(2, '0')}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          / {String(TOTAL_QUESTIONS).padStart(2, '0')}
        </span>
      </header>
      <h2 className="mt-2 text-[clamp(1.05rem,0.92rem+0.6vw,1.35rem)] font-semibold leading-snug tracking-tight">
        {prompt}
      </h2>
      {hint ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

function CheckGrid({
  options,
  selected,
  onToggle,
  tone = 'primary',
}: {
  options: Array<{ key: string; label: string; help?: string }>;
  selected: string[];
  onToggle: (key: string) => void;
  tone?: 'primary' | 'emerald' | 'amber';
}) {
  const toneClasses = {
    primary: {
      active: 'border-primary/60 bg-primary/10',
      activeBox: 'border-primary bg-primary text-primary-foreground',
      hover: 'hover:border-primary/30',
    },
    emerald: {
      active: 'border-emerald-500/50 bg-emerald-500/10',
      activeBox: 'border-emerald-500 bg-emerald-500 text-white',
      hover: 'hover:border-emerald-500/30',
    },
    amber: {
      active: 'border-amber-500/50 bg-amber-500/10',
      activeBox: 'border-amber-500 bg-amber-500 text-white',
      hover: 'hover:border-amber-500/30',
    },
  }[tone];

  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {options.map((opt) => {
        const active = selected.includes(opt.key);
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onToggle(opt.key)}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border bg-background px-3.5 py-2.5 text-left transition-colors',
              active ? toneClasses.active : `border-border ${toneClasses.hover}`
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                active ? toneClasses.activeBox : 'border-border'
              )}
              aria-hidden
            >
              {active ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium">{opt.label}</span>
              {opt.help ? (
                <span className="block text-[11px] text-muted-foreground">{opt.help}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RadioGroup<T extends string>({
  choices,
  value,
  onChange,
}: {
  choices: RadioChoice<T>[];
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {choices.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={cn(
              'flex items-center gap-3 rounded-lg border bg-background px-3.5 py-3 text-left text-[13px] transition-colors',
              active
                ? 'border-primary/60 bg-primary/10 text-foreground'
                : 'border-border hover:border-primary/30'
            )}
          >
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
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
  );
}

function Scale10({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-[13px] tabular-nums transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
              aria-label={`${n} of 10`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        <span>1 · no idea</span>
        <span>10 · master</span>
      </div>
    </div>
  );
}

/* ======================================================================
   Exam view (the only export)
   ====================================================================== */

export function AuditExamView({
  audit,
  canWritePrivateNotes = false,
}: {
  audit: AuditExamPayload;
  canWritePrivateNotes?: boolean;
}) {
  const [form, setForm] = useState<FormState>(() => defaultForm(audit.latestAssessment?.responses));
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

  const answered = useMemo(() => answeredCount(form), [form]);
  const progressPct = Math.round((answered / TOTAL_QUESTIONS) * 100);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await submitSelfAssessment(
        audit.profileId,
        form as unknown as Record<string, unknown>,
        notes.trim() || null
      );
      if (result.success) {
        toast.success('Submitted. Thanks for the honesty.');
      } else {
        toast.error(result.error ?? 'Failed to save.');
      }
    });
  };

  const fullName = audit.fullName ?? 'Employee';

  return (
    <div className="relative">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-[680px] items-center gap-3 px-5 py-3 md:px-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Qualia
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {answered}/{TOTAL_QUESTIONS}
          </span>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-[680px] px-5 pb-32 pt-12 md:px-8 md:pt-16"
      >
        {/* Header */}
        <motion.header
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-12 flex flex-col gap-3"
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Self-evaluation
          </span>
          <h1 className="text-[clamp(1.75rem,1.3rem+1.8vw,2.75rem)] font-semibold leading-[1.05] tracking-tight">
            Qualia Framework V5
            <br />
            capability audit
          </h1>
          <p className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
            For <span className="font-medium text-foreground">{fullName}</span>. 15 questions, no
            time limit, no wrong answers. Your honest read of where you are right now is exactly
            what we&apos;re looking for — this is how we figure out what to give you solo, what to
            pair on, and where the framework is failing you.
          </p>
        </motion.header>

        {/* 01 — Framework commands mastered */}
        <Question
          number={1}
          index={0}
          prompt="Which framework commands have you mastered?"
          hint='"Mastered" = you reach for it without checking docs and it works. Tick all that apply.'
        >
          <CheckGrid
            options={FRAMEWORK_COMMANDS}
            selected={form.frameworkCommandsMastered}
            onToggle={(k) => toggleInList('frameworkCommandsMastered', k)}
            tone="primary"
          />
        </Question>

        {/* 02 — Project types you can take solo */}
        <Question
          number={2}
          index={1}
          prompt="Which project types can you take from 0 → handoff alone?"
          hint="Solo = kickoff, build, deploy, handoff — without me stepping in."
        >
          <CheckGrid
            options={PROJECT_TYPES}
            selected={form.soloCapableProjectTypes}
            onToggle={(k) => toggleInList('soloCapableProjectTypes', k)}
            tone="emerald"
          />
        </Question>

        {/* 03 — 10-milestone time */}
        <Question
          number={3}
          index={2}
          prompt="With Qualia V5, how long would you need to complete a 10-milestone project from scratch?"
          hint="Be realistic. Include planning, building, polish, verify, ship, handoff."
        >
          <RadioGroup
            choices={TEN_MILESTONE_CHOICES}
            value={form.tenMilestoneTime}
            onChange={(v) => update('tenMilestoneTime', v)}
          />
        </Question>

        {/* 04 — Client communication */}
        <Question
          number={4}
          index={3}
          prompt="If you're assigned a project from 0 → handoff, can you handle client communication without backup?"
          hint="Kickoff calls, scope discussions, status updates, handoff."
        >
          <RadioGroup
            choices={CLIENT_COMMS_CHOICES}
            value={form.clientCommsAlone}
            onChange={(v) => update('clientCommsAlone', v)}
          />
        </Question>

        {/* 05 — Gap closure */}
        <Question
          number={5}
          index={4}
          prompt="When /qualia-verify returns FAIL, can you close the gaps without help?"
        >
          <RadioGroup
            choices={GAP_CLOSURE_CHOICES}
            value={form.gapClosureAlone}
            onChange={(v) => update('gapClosureAlone', v)}
          />
        </Question>

        {/* 06 — Shipped solo */}
        <Question
          number={6}
          index={5}
          prompt="Have you ever shipped a phase to production solo (no review)?"
        >
          <RadioGroup
            choices={SHIPPED_SOLO_CHOICES}
            value={form.shippedSoloCount}
            onChange={(v) => update('shippedSoloCount', v)}
          />
        </Question>

        {/* 07 — Debug comfort */}
        <Question
          number={7}
          index={6}
          prompt="When something breaks in production, what's your default move?"
        >
          <RadioGroup
            choices={DEBUG_COMFORT_CHOICES}
            value={form.debugComfort}
            onChange={(v) => update('debugComfort', v)}
          />
        </Question>

        {/* 08 — Add-on / extension fluency 1-10 */}
        <Question
          number={8}
          index={7}
          prompt="From 1 to 10, how well can you talk to the framework to extend a project beyond the planned milestones?"
          hint="Add-ons, design polish outside the milestone scope, refactors, bonus features."
        >
          <Scale10
            value={form.frameworkAddonScore}
            onChange={(v) => update('frameworkAddonScore', v)}
          />
        </Question>

        {/* 09 — Overall mastery 1-10 */}
        <Question
          number={9}
          index={8}
          prompt="From 1 to 10, your overall mastery of Qualia Framework V5 right now"
          hint="1 = I copy commands without understanding. 10 = I know what each command does, when to skip it, and how to recover when it goes wrong."
        >
          <Scale10 value={form.overallMastery} onChange={(v) => update('overallMastery', v)} />
        </Question>

        {/* 10 — Client handoff confidence 1-10 */}
        <Question
          number={10}
          index={9}
          prompt="From 1 to 10, your confidence handing a finished project to a real client"
          hint="Walking them through what was built, answering their questions, taking responsibility if something breaks."
        >
          <Scale10
            value={form.clientHandoffConfidence}
            onChange={(v) => update('clientHandoffConfidence', v)}
          />
        </Question>

        {/* 11 — Weak spots */}
        <Question
          number={11}
          index={10}
          prompt="Where do you NOT want to be assigned solo yet?"
          hint="Tick all that apply. Knowing the gaps now means we don't drop you in blind."
        >
          <CheckGrid
            options={WEAK_SPOTS}
            selected={form.weakSpots}
            onToggle={(k) => toggleInList('weakSpots', k)}
            tone="amber"
          />
        </Question>

        {/* 12 — Last solo project (text) */}
        <Question
          number={12}
          index={11}
          prompt="Last project you took 0 → handoff alone (or closest)"
          hint="Project name + a sentence on the result. If none yet, write 'none'."
        >
          <Input
            value={form.lastSoloProject}
            onChange={(e) => update('lastSoloProject', e.target.value)}
            placeholder="e.g. Velicor Consulting — shipped, M3 closed, awaiting client DNS cutover"
          />
        </Question>

        {/* 13 — Wished command */}
        <Question
          number={13}
          index={12}
          prompt="One framework command you wish existed"
          hint="Something you keep needing that no /qualia-* command does today."
        >
          <Textarea
            rows={2}
            value={form.wishedCommand}
            onChange={(e) => update('wishedCommand', e.target.value)}
            placeholder="e.g. /qualia-translate to swap the project to a new language"
          />
        </Question>

        {/* 14 — What feels broken */}
        <Question
          number={14}
          index={13}
          prompt="What in the framework feels broken, unclear, or slows you down?"
          hint="Be specific. This is how we improve V6."
        >
          <Textarea
            rows={3}
            value={form.unclearOrBroken}
            onChange={(e) => update('unclearOrBroken', e.target.value)}
            placeholder="e.g. /qualia-verify gap-cycle limit triggers too early on design phases"
          />
        </Question>

        {/* 15 — Yes give me solo */}
        <Question
          number={15}
          index={14}
          prompt="If I gave you a brand-new client tomorrow, what kind of project would you say 'yes, give me solo'?"
          hint="One concrete example. This is the kind of work we'll route to you first."
        >
          <Textarea
            rows={2}
            value={form.yesGiveMeSolo}
            onChange={(e) => update('yesGiveMeSolo', e.target.value)}
            placeholder="e.g. A multi-page marketing site with a contact form and Calendly booking, EN-only, deploy to Vercel"
          />
        </Question>

        {canWritePrivateNotes ? (
          <section className="mt-12 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
            <h3 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
              Admin private notes
            </h3>
            <p className="mb-2 text-[12px] text-muted-foreground">
              Only visible to admins. Not shown to the employee.
            </p>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations from the conversation."
            />
          </section>
        ) : null}

        {/* Submit row */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={16}
          className="mt-14 flex flex-col items-stretch gap-3 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-[12px] text-muted-foreground">
            {answered === TOTAL_QUESTIONS ? (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="size-3.5" /> All 15 answered. You can submit.
              </span>
            ) : (
              <>
                {answered} of {TOTAL_QUESTIONS} answered. You can submit anytime — partial answers
                are saved.
              </>
            )}
          </p>
          <Button type="submit" disabled={isPending} size="lg" className="gap-2">
            {isPending ? (
              <Sparkles className="size-4 animate-pulse" />
            ) : (
              <Save className="size-4" />
            )}
            {isPending ? 'Submitting…' : 'Submit assessment'}
          </Button>
        </motion.div>

        {audit.latestAssessment ? (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Last submission:{' '}
            {new Date(audit.latestAssessment.submittedAt).toLocaleString('en-IE', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        ) : null}
      </form>
    </div>
  );
}
