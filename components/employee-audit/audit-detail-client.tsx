'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { submitSelfAssessment, type AuditExamPayload } from '@/app/actions/employee-audit';

/* ======================================================================
   Constants
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
  // Scenario questions — capability assessment, first-instinct answers
  scenarioInheritProject: string;
  scenarioWhitePageMobile: string;
  scenarioCodeYouProud: string;
  scenarioClientAIBrief: string;
  scenarioStuckTwoHours: string;
  scenarioSlowPage: string;
  scenarioPRReview: string;
  scenarioVagueRequest: string;
  scenarioRiskyMigration: string;
  scenarioFirstCommit: string;
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

const TOTAL_QUESTIONS = 25;
const TOTAL_SLIDES = 27; // 0=intro, 1-25=questions, 26=submit

// Deterministic shuffle keyed by profileId so each person sees a stable order
// (Hasan and Moayad each get a different order — they can't compare "what was Q5?")
function hashStringToInt(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
    scenarioInheritProject: get('scenarioInheritProject', ''),
    scenarioWhitePageMobile: get('scenarioWhitePageMobile', ''),
    scenarioCodeYouProud: get('scenarioCodeYouProud', ''),
    scenarioClientAIBrief: get('scenarioClientAIBrief', ''),
    scenarioStuckTwoHours: get('scenarioStuckTwoHours', ''),
    scenarioSlowPage: get('scenarioSlowPage', ''),
    scenarioPRReview: get('scenarioPRReview', ''),
    scenarioVagueRequest: get('scenarioVagueRequest', ''),
    scenarioRiskyMigration: get('scenarioRiskyMigration', ''),
    scenarioFirstCommit: get('scenarioFirstCommit', ''),
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
  if (form.scenarioInheritProject.trim()) n++;
  if (form.scenarioWhitePageMobile.trim()) n++;
  if (form.scenarioCodeYouProud.trim()) n++;
  if (form.scenarioClientAIBrief.trim()) n++;
  if (form.scenarioStuckTwoHours.trim()) n++;
  if (form.scenarioSlowPage.trim()) n++;
  if (form.scenarioPRReview.trim()) n++;
  if (form.scenarioVagueRequest.trim()) n++;
  if (form.scenarioRiskyMigration.trim()) n++;
  if (form.scenarioFirstCommit.trim()) n++;
  return n;
}

/* ======================================================================
   Building blocks
   ====================================================================== */

function SlideHeader({ number, prompt, hint }: { number: number; prompt: string; hint?: string }) {
  return (
    <header className="mb-7">
      <div className="mb-3 flex items-baseline gap-2.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Q{String(number).padStart(2, '0')}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          / {String(TOTAL_QUESTIONS).padStart(2, '0')}
        </span>
      </div>
      <h2 className="text-[clamp(1.15rem,0.95rem+0.9vw,1.5rem)] font-semibold leading-snug tracking-tight">
        {prompt}
      </h2>
      {hint ? (
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </header>
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
   Slide animation config
   ====================================================================== */

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 64 : -64,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
  }),
};

/* ======================================================================
   Exam view
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  // Slide-position 1..25 → underlying question case ID 1..25
  // Stable per profile: same person sees the same order across reloads,
  // different people see different orders (so they can't compare "what was Q5?")
  const slideToCaseId = useMemo(() => {
    const seed = hashStringToInt(audit.profileId);
    const ids = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i + 1);
    return seededShuffle(ids, seed);
  }, [audit.profileId]);

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

  const goTo = useCallback(
    (n: number) => {
      setDirection(n > currentSlide ? 1 : -1);
      setCurrentSlide(n);
    },
    [currentSlide]
  );

  const goNext = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) goTo(currentSlide + 1);
  }, [currentSlide, goTo]);

  const goBack = useCallback(() => {
    if (currentSlide > 0) goTo(currentSlide - 1);
  }, [currentSlide, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goBack]);

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

  // Progress bar: position through slides (not answered count)
  const positionPct = Math.round((currentSlide / (TOTAL_SLIDES - 1)) * 100);

  // Slide label for progress area
  const slideLabel =
    currentSlide === 0
      ? 'Intro'
      : currentSlide === TOTAL_SLIDES - 1
        ? 'Submit'
        : `Q${currentSlide} / ${TOTAL_QUESTIONS}`;

  const slideContent = useMemo(() => {
    // Slide 0 — intro (full-bleed two-column hero)
    if (currentSlide === 0) {
      return (
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          {/* Left column — copy + start */}
          <div className="flex flex-col gap-6">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Self-evaluation · Qualia framework
            </span>
            <h1 className="text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] font-semibold leading-[1.02] tracking-tight">
              Where are you,
              <br />
              <span className="text-primary">really?</span>
            </h1>
            <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">
              For <span className="font-medium text-foreground">{fullName}</span>. 25 questions —
              your honest read of how comfortable you are with the framework, the project types, and
              the real situations a client throws at you. No wrong answers. No time limit. Partial
              saves welcome.
            </p>
            <p className="max-w-prose text-[14px] leading-relaxed text-muted-foreground/80">
              First instinct beats polished prose. Don&apos;t research, don&apos;t ask Claude — we
              want what comes out of your head right now.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button type="button" size="lg" className="gap-2" onClick={goNext}>
                Start <ArrowRight className="size-4" />
              </Button>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                ← → keys to navigate · auto-saves as you go
              </span>
            </div>
          </div>

          {/* Right column — visual breakdown of what's coming */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              {[
                { count: '11', label: 'Skill ratings', help: 'Self-rate where you are' },
                { count: '4', label: 'Quick selects', help: 'Tick what applies' },
                { count: '10', label: 'Real scenarios', help: 'Walk us through your move' },
                { count: '~12 min', label: 'Total time', help: 'No rush' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 rounded-xl border border-border bg-card/40 p-4"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="font-mono text-[clamp(1.5rem,1rem+1.2vw,2rem)] font-semibold tracking-tight text-foreground">
                    {item.count}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{item.help}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Why we&apos;re asking
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                This shapes what we route to you solo, what we pair on, and where the framework is
                failing you. Useful only if you&apos;re honest.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Slide 16 — submit
    if (currentSlide === TOTAL_SLIDES - 1) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <CheckCircle2
              className={cn(
                'size-8',
                answered === TOTAL_QUESTIONS ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <div>
              <h2 className="text-[clamp(1.4rem,1.1rem+1.2vw,2rem)] font-semibold leading-snug tracking-tight">
                {answered === TOTAL_QUESTIONS ? 'All done.' : 'Ready to submit'}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {answered} of {TOTAL_QUESTIONS} answered
                {answered < TOTAL_QUESTIONS && ' — partial answers are saved'}
              </p>
            </div>
          </div>

          {canWritePrivateNotes ? (
            <section className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
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

          <Button type="submit" disabled={isPending} size="lg" className="w-fit gap-2">
            {isPending ? (
              <Sparkles className="size-4 animate-pulse" />
            ) : (
              <Save className="size-4" />
            )}
            {isPending ? 'Submitting…' : 'Submit assessment'}
          </Button>

          {audit.latestAssessment ? (
            <p className="text-[11px] text-muted-foreground">
              Last submission:{' '}
              {new Date(audit.latestAssessment.submittedAt).toLocaleString('en-IE', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          ) : null}
        </div>
      );
    }

    // Questions 1-25 — slide position maps to a stable shuffled case ID
    const caseId = slideToCaseId[currentSlide - 1] ?? currentSlide;
    const slideNum = currentSlide; // displayed as "Q01 / 25" using slide position
    switch (caseId) {
      case 1:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="Which framework commands have you mastered?"
              hint='"Mastered" = you reach for it without checking docs and it works. Tick all that apply.'
            />
            <CheckGrid
              options={FRAMEWORK_COMMANDS}
              selected={form.frameworkCommandsMastered}
              onToggle={(k) => toggleInList('frameworkCommandsMastered', k)}
              tone="primary"
            />
          </>
        );
      case 2:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="Which project types can you take from 0 → handoff alone?"
              hint="Solo = kickoff, build, deploy, handoff — without me stepping in."
            />
            <CheckGrid
              options={PROJECT_TYPES}
              selected={form.soloCapableProjectTypes}
              onToggle={(k) => toggleInList('soloCapableProjectTypes', k)}
              tone="emerald"
            />
          </>
        );
      case 3:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="With Qualia V5, how long would you need to complete a 10-milestone project from scratch?"
              hint="Be realistic. Include planning, building, polish, verify, ship, handoff."
            />
            <RadioGroup
              choices={TEN_MILESTONE_CHOICES}
              value={form.tenMilestoneTime}
              onChange={(v) => update('tenMilestoneTime', v)}
            />
          </>
        );
      case 4:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="If you're assigned a project from 0 → handoff, can you handle client communication without backup?"
              hint="Kickoff calls, scope discussions, status updates, handoff."
            />
            <RadioGroup
              choices={CLIENT_COMMS_CHOICES}
              value={form.clientCommsAlone}
              onChange={(v) => update('clientCommsAlone', v)}
            />
          </>
        );
      case 5:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="When /qualia-verify returns FAIL, can you close the gaps without help?"
            />
            <RadioGroup
              choices={GAP_CLOSURE_CHOICES}
              value={form.gapClosureAlone}
              onChange={(v) => update('gapClosureAlone', v)}
            />
          </>
        );
      case 6:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="Have you ever shipped a phase to production solo (no review)?"
            />
            <RadioGroup
              choices={SHIPPED_SOLO_CHOICES}
              value={form.shippedSoloCount}
              onChange={(v) => update('shippedSoloCount', v)}
            />
          </>
        );
      case 7:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="When something breaks in production, what's your default move?"
            />
            <RadioGroup
              choices={DEBUG_COMFORT_CHOICES}
              value={form.debugComfort}
              onChange={(v) => update('debugComfort', v)}
            />
          </>
        );
      case 8:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="From 1 to 10, how well can you talk to the framework to extend a project beyond the planned milestones?"
              hint="Add-ons, design polish outside the milestone scope, refactors, bonus features."
            />
            <Scale10
              value={form.frameworkAddonScore}
              onChange={(v) => update('frameworkAddonScore', v)}
            />
          </>
        );
      case 9:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="From 1 to 10, your overall mastery of Qualia Framework V5 right now"
              hint="1 = I copy commands without understanding. 10 = I know what each command does, when to skip it, and how to recover when it goes wrong."
            />
            <Scale10 value={form.overallMastery} onChange={(v) => update('overallMastery', v)} />
          </>
        );
      case 10:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="From 1 to 10, your confidence handing a finished project to a real client"
              hint="Walking them through what was built, answering their questions, taking responsibility if something breaks."
            />
            <Scale10
              value={form.clientHandoffConfidence}
              onChange={(v) => update('clientHandoffConfidence', v)}
            />
          </>
        );
      case 11:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="Where do you NOT want to be assigned solo yet?"
              hint="Tick all that apply. Knowing the gaps now means we don't drop you in blind."
            />
            <CheckGrid
              options={WEAK_SPOTS}
              selected={form.weakSpots}
              onToggle={(k) => toggleInList('weakSpots', k)}
              tone="amber"
            />
          </>
        );
      case 12:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="Last project you took 0 → handoff alone (or closest)"
              hint="Project name + a sentence on the result. If none yet, write 'none'."
            />
            <Input
              value={form.lastSoloProject}
              onChange={(e) => update('lastSoloProject', e.target.value)}
              placeholder="e.g. Velicor Consulting — shipped, M3 closed, awaiting client DNS cutover"
              autoFocus
            />
          </>
        );
      case 13:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="One framework command you wish existed"
              hint="Something you keep needing that no /qualia-* command does today."
            />
            <Textarea
              rows={4}
              value={form.wishedCommand}
              onChange={(e) => update('wishedCommand', e.target.value)}
              placeholder="e.g. /qualia-translate to swap the project to a new language"
              autoFocus
            />
          </>
        );
      case 14:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="What in the framework feels broken, unclear, or slows you down?"
              hint="Be specific. This is how we improve V6."
            />
            <Textarea
              rows={4}
              value={form.unclearOrBroken}
              onChange={(e) => update('unclearOrBroken', e.target.value)}
              placeholder="e.g. /qualia-verify gap-cycle limit triggers too early on design phases"
              autoFocus
            />
          </>
        );
      case 15:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="If I gave you a brand-new client tomorrow, what kind of project would you say 'yes, give me solo'?"
              hint="One concrete example. This is the kind of work we'll route to you first."
            />
            <Textarea
              rows={4}
              value={form.yesGiveMeSolo}
              onChange={(e) => update('yesGiveMeSolo', e.target.value)}
              placeholder="e.g. A multi-page marketing site with a contact form and Calendly booking, EN-only, deploy to Vercel"
              autoFocus
            />
          </>
        );

      // ─────────────────────────────────────────────────────────────────
      // Scenarios — first instinct only, don't look anything up
      // ─────────────────────────────────────────────────────────────────

      case 16:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="You inherit a Qualia project mid-build. Previous engineer is gone. You've never seen the codebase. What are the first 3 commands you run, in order, and why?"
              hint="First instinct. Sequence matters more than the exact answer."
            />
            <Textarea
              rows={6}
              value={form.scenarioInheritProject}
              onChange={(e) => update('scenarioInheritProject', e.target.value)}
              placeholder="1. /qualia-...&#10;2. /qualia-...&#10;3. /qualia-...&#10;&#10;Why this order:"
              autoFocus
            />
          </>
        );

      case 17:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt='A client says: "the site deploys fine, but on my phone the whole page is blank." Walk me through what you do, step by step, until you have it fixed.'
              hint="Process > answer. We want to see how you actually debug."
            />
            <Textarea
              rows={6}
              value={form.scenarioWhitePageMobile}
              onChange={(e) => update('scenarioWhitePageMobile', e.target.value)}
              placeholder="Step 1: …&#10;Step 2: …&#10;Step 3: …"
              autoFocus
            />
          </>
        );

      case 18:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="Paste one piece of code, query, or component you wrote in the last 30 days that you're proud of. In 2-3 sentences, explain why it's good."
              hint="The reason matters more than the code. What makes it good in your eyes?"
            />
            <Textarea
              rows={10}
              value={form.scenarioCodeYouProud}
              onChange={(e) => update('scenarioCodeYouProud', e.target.value)}
              placeholder="```ts&#10;// paste your code here&#10;```&#10;&#10;Why it's good:"
              autoFocus
            />
          </>
        );

      case 19:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt='A new client tells you: "I want an AI agent for [their use case]." What are the first 3 questions you ask BEFORE writing any code?'
              hint="Before tools, before architecture, before models — what do you need to know?"
            />
            <Textarea
              rows={6}
              value={form.scenarioClientAIBrief}
              onChange={(e) => update('scenarioClientAIBrief', e.target.value)}
              placeholder="1. …&#10;2. …&#10;3. …"
              autoFocus
            />
          </>
        );

      case 20:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="You've been on a single bug for 2 hours and made zero progress. What's your next move and why?"
              hint="Specific. Not 'I'd ask for help' — what kind of help, from whom, with what context?"
            />
            <Textarea
              rows={5}
              value={form.scenarioStuckTwoHours}
              onChange={(e) => update('scenarioStuckTwoHours', e.target.value)}
              placeholder="My next move:&#10;&#10;Why:"
              autoFocus
            />
          </>
        );

      case 21:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="A page takes 8 seconds to load. The client wants it under 2. Where do you start looking, in order?"
              hint="No need to fix it. Just tell us how you'd diagnose where the time is going."
            />
            <Textarea
              rows={6}
              value={form.scenarioSlowPage}
              onChange={(e) => update('scenarioSlowPage', e.target.value)}
              placeholder="First place I check:&#10;Then:&#10;Then:"
              autoFocus
            />
          </>
        );

      case 22:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="A teammate sends you a PR. What are the first 3 things you check before approving?"
              hint="Pretend you have 5 minutes — what's worth your attention first?"
            />
            <Textarea
              rows={5}
              value={form.scenarioPRReview}
              onChange={(e) => update('scenarioPRReview', e.target.value)}
              placeholder="1. …&#10;2. …&#10;3. …"
              autoFocus
            />
          </>
        );

      case 23:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt='A client says "I want it to pop more." What do you ask?'
              hint="They will not give you a useful answer to 'what do you mean by pop?'. What questions actually unblock the work?"
            />
            <Textarea
              rows={5}
              value={form.scenarioVagueRequest}
              onChange={(e) => update('scenarioVagueRequest', e.target.value)}
              placeholder="My questions:"
              autoFocus
            />
          </>
        );

      case 24:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="You need to add a NOT NULL column to a 10-million-row production table that's actively being written to. What's your plan?"
              hint="Walk through the migration order. What could go wrong?"
            />
            <Textarea
              rows={6}
              value={form.scenarioRiskyMigration}
              onChange={(e) => update('scenarioRiskyMigration', e.target.value)}
              placeholder="My migration plan:&#10;&#10;Risks I'd watch:"
              autoFocus
            />
          </>
        );

      case 25:
        return (
          <>
            <SlideHeader
              number={slideNum}
              prompt="Day 1 of a brand-new client project. Empty repo. What does your first commit look like?"
              hint="Be specific about what's IN that commit. We're testing your starting discipline."
            />
            <Textarea
              rows={6}
              value={form.scenarioFirstCommit}
              onChange={(e) => update('scenarioFirstCommit', e.target.value)}
              placeholder="What's in my first commit:&#10;&#10;Why I start there:"
              autoFocus
            />
          </>
        );

      default:
        return null;
    }
  }, [
    currentSlide,
    slideToCaseId,
    form,
    fullName,
    answered,
    isPending,
    canWritePrivateNotes,
    notes,
    audit.latestAssessment,
    toggleInList,
    update,
    goNext,
  ]);

  // Narrow column for questions, full-bleed for intro/submit
  const isWideSlide = currentSlide === 0;
  const slideContainerClass = isWideSlide
    ? 'mx-auto w-full max-w-6xl overflow-hidden px-5 pb-32 pt-12 md:px-10 md:pt-16'
    : 'mx-auto w-full max-w-[720px] overflow-hidden px-5 pb-32 pt-12 md:px-8 md:pt-14';

  return (
    <div className="relative min-h-dvh bg-background">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-3 md:px-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Qualia
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${positionPct}%` }}
              aria-valuenow={positionPct}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
          <span className="min-w-[5.5rem] text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            {slideLabel}
          </span>
        </div>
      </div>

      {/* Slide area */}
      <form id="audit-form" onSubmit={onSubmit} className={slideContainerClass}>
        <AnimatePresence mode="wait" custom={direction}>
          <m.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {slideContent}
          </m.div>
        </AnimatePresence>
      </form>

      {/* Fixed bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        aria-label="Question navigation"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={currentSlide === 0}
            className="gap-1.5 font-mono text-[12px]"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Button>

          {/* Step dots — windowed for 27 slides so they fit at any width */}
          <div className="flex flex-1 items-center justify-center gap-1" role="presentation">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => {
              const isActive = i === currentSlide;
              const isPast = i < currentSlide;
              // Show all dots above 720px; on smaller screens only show ±4 around active
              const distance = Math.abs(i - currentSlide);
              const isEndpoint = i === 0 || i === TOTAL_SLIDES - 1;
              const visibleSm = distance <= 3 || isEndpoint;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={
                    i === 0 ? 'Intro' : i === TOTAL_SLIDES - 1 ? 'Submit' : `Question ${i}`
                  }
                  className={cn(
                    'rounded-full transition-all duration-200',
                    isActive
                      ? 'h-2 w-5 bg-primary'
                      : isPast
                        ? 'h-1.5 w-1.5 bg-primary/40 hover:bg-primary/60'
                        : 'h-1.5 w-1.5 bg-border hover:bg-muted-foreground/40',
                    !visibleSm && 'hidden sm:inline-block'
                  )}
                />
              );
            })}
          </div>

          {currentSlide < TOTAL_SLIDES - 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={goNext}
              className="gap-1.5 font-mono text-[12px]"
            >
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              form="audit-form"
              size="sm"
              disabled={isPending}
              className="gap-1.5 font-mono text-[12px]"
            >
              {isPending ? (
                <Sparkles className="size-3.5 animate-pulse" />
              ) : (
                <Save className="size-3.5" />
              )}
              {isPending ? 'Saving…' : 'Submit'}
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
