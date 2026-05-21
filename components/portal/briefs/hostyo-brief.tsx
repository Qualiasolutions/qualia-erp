'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { useState } from 'react';
import { toast } from 'sonner';
import { createFeatureRequest } from '@/app/actions/client-requests';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type StepKind = 'multi' | 'single' | 'budget' | 'notes';

interface ChipOption {
  value: string;
  label: string;
}

interface Step {
  key: string;
  eyebrow: string;
  shortLabel: string;
  title: string;
  hint?: string;
  kind: StepKind;
  options?: ChipOption[];
  defaults?: string[];
  notePlaceholder?: string;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    key: 'leadSources',
    eyebrow: 'Step 1',
    shortLabel: 'Lead source',
    title: 'Where do the leads the agent will work come from?',
    hint: 'Pick every source — the agent script changes per source.',
    kind: 'multi',
    defaults: ['Cold purchased property-owner lists'],
    options: [
      { value: 'Cold purchased property-owner lists', label: 'Cold lists' },
      { value: 'Inbound from hostyo.com', label: 'Website inbound' },
      { value: 'Past clients / re-engagement', label: 'Past clients' },
      { value: 'Referrals from existing owners', label: 'Referrals' },
      { value: 'Sophia Ads / paid social', label: 'Paid ads' },
      { value: 'Land registry / portal scrape', label: 'Registry / portals' },
    ],
  },
  {
    key: 'volume',
    eyebrow: 'Step 2',
    shortLabel: 'Daily volume',
    title: 'How many leads should the agent work through per day?',
    hint: 'This sets concurrency and Twilio capacity.',
    kind: 'single',
    options: [
      { value: 'Up to 20 calls/day', label: '≤ 20' },
      { value: '20–50 calls/day', label: '20 – 50' },
      { value: '50–100 calls/day', label: '50 – 100' },
      { value: '100–250 calls/day', label: '100 – 250' },
      { value: '250+ calls/day', label: '250+' },
    ],
  },
  {
    key: 'cadence',
    eyebrow: 'Step 3',
    shortLabel: 'Cadence',
    title: 'What channel order should the agent follow per lead?',
    hint: 'Based on what we discussed — call first, then WhatsApp + email follow-up.',
    kind: 'single',
    options: [
      { value: 'Call → WhatsApp + Email immediately after', label: 'Call → WA + Email (default)' },
      { value: 'WhatsApp first, call only if no reply', label: 'WhatsApp first' },
      { value: 'Email warm-up, then call, then WhatsApp', label: 'Email warm-up' },
      { value: 'All three simultaneously', label: 'Simultaneous' },
    ],
  },
  {
    key: 'qualification',
    eyebrow: 'Step 4',
    shortLabel: 'Qualification',
    title: 'Which questions must the agent confirm before booking the valuation?',
    hint: 'You mentioned condition, furnishing, and legal status — pick anything else.',
    kind: 'multi',
    defaults: [
      'City + neighbourhood',
      'Property type (flat / villa / studio)',
      'Number of rooms',
      'Furnishing (empty / furnished / partially)',
      'Long-term vs short-term availability',
      'Legal status (title deed / share / pending)',
    ],
    options: [
      { value: 'City + neighbourhood', label: 'City' },
      { value: 'Property type (flat / villa / studio)', label: 'Property type' },
      { value: 'Number of rooms', label: 'Rooms' },
      { value: 'Furnishing (empty / furnished / partially)', label: 'Furnishing' },
      { value: 'Long-term vs short-term availability', label: 'Long vs short term' },
      { value: 'Legal status (title deed / share / pending)', label: 'Legal status' },
      { value: 'Owner residency (in Cyprus or abroad)', label: 'Owner residency' },
      { value: 'Current rental income', label: 'Current income' },
      { value: 'Renovation needs', label: 'Renovation' },
      { value: 'Permission to manage on owner’s behalf', label: 'Mgmt permission' },
    ],
  },
  {
    key: 'languages',
    eyebrow: 'Step 5',
    shortLabel: 'Languages',
    title: 'Which voice languages does the agent need?',
    hint: 'You confirmed EN + EL + Cypriot dialect — anything else for owners abroad?',
    kind: 'multi',
    defaults: ['English', 'Greek (standard)', 'Cypriot Greek dialect'],
    options: [
      { value: 'English', label: 'English' },
      { value: 'Greek (standard)', label: 'Greek' },
      { value: 'Cypriot Greek dialect', label: 'Cypriot dialect' },
      { value: 'Russian', label: 'Russian' },
      { value: 'Arabic', label: 'Arabic' },
      { value: 'Hebrew', label: 'Hebrew' },
      { value: 'German', label: 'German' },
    ],
  },
  {
    key: 'hours',
    eyebrow: 'Step 6',
    shortLabel: 'Hours',
    title: 'When should the agent run?',
    hint: 'Cold pickup rates differ by hour — local Cyprus number recommended.',
    kind: 'single',
    options: [
      { value: 'Cyprus business hours (09:00 – 18:00 EET)', label: 'CY business hrs' },
      { value: 'Extended hours (08:00 – 21:00 EET)', label: 'Extended 8–9pm' },
      { value: '24/7 with smart quiet-hours per timezone', label: '24/7 smart' },
      { value: 'Match each owner’s local timezone', label: 'Per-owner TZ' },
    ],
  },
  {
    key: 'deployment',
    eyebrow: 'Step 7',
    shortLabel: 'Deployment',
    title: 'Cloud or on-prem model?',
    hint: 'Offline / fine-tuned keeps owner data in-house but adds setup cost.',
    kind: 'single',
    options: [
      { value: 'Cloud (OpenAI / Anthropic via OpenRouter)', label: 'Cloud' },
      { value: 'On-prem fine-tuned (data stays in-house)', label: 'On-prem' },
      { value: 'Hybrid — cloud LLM, on-prem data store', label: 'Hybrid' },
    ],
  },
  {
    key: 'agents',
    eyebrow: 'Step 8',
    shortLabel: 'Agents',
    title: 'Which agent roles do you need at launch?',
    hint: 'Each role is a separately tunable persona.',
    kind: 'multi',
    defaults: [
      'Outbound sales agent (qualifies + books valuation)',
      'WhatsApp follow-up agent (PDF + Calendly send)',
    ],
    options: [
      { value: 'Outbound sales agent (qualifies + books valuation)', label: 'Outbound sales' },
      { value: 'WhatsApp follow-up agent (PDF + Calendly send)', label: 'WhatsApp follow-up' },
      { value: 'Inbound receptionist (24/7 incoming calls)', label: 'Inbound receptionist' },
      { value: 'Re-engagement agent (lapsed leads)', label: 'Re-engagement' },
      { value: 'Booking confirmation agent (day-before reminders)', label: 'Booking confirmer' },
    ],
  },
  {
    key: 'integrations',
    eyebrow: 'Step 9',
    shortLabel: 'Integrations',
    title: 'Tools to wire up at launch',
    hint: 'Close CRM and Twilio are locked in from the call. Pick anything else.',
    kind: 'multi',
    defaults: [
      'Close CRM (lead pipeline progression)',
      'Twilio (local Cyprus number for outbound)',
      'WhatsApp Business API',
      'Calendly (free valuation booking)',
    ],
    options: [
      { value: 'Close CRM (lead pipeline progression)', label: 'Close CRM' },
      { value: 'Twilio (local Cyprus number for outbound)', label: 'Twilio' },
      { value: 'WhatsApp Business API', label: 'WhatsApp Biz' },
      { value: 'Calendly (free valuation booking)', label: 'Calendly' },
      { value: 'ElevenLabs voice clone (your voice / brand voice)', label: 'Voice clone' },
      { value: 'Email open + click tracking (Resend / Postmark)', label: 'Email tracking' },
      { value: 'Recording transcript storage (S3 / Supabase)', label: 'Transcript store' },
      { value: 'Owner dashboard (live call logs)', label: 'Owner dashboard' },
      { value: 'Spam-folder SMS reminder', label: 'Spam reminder' },
    ],
  },
  {
    key: 'budget',
    eyebrow: 'Step 10',
    shortLabel: 'Budget',
    title: 'Pick a build-budget range',
    hint: 'Slide both handles — we shape v1 scope around this.',
    kind: 'budget',
  },
  {
    key: 'timeline',
    eyebrow: 'Step 11',
    shortLabel: 'Timeline',
    title: 'When should v1 go live?',
    hint: 'We can start the build the moment the brief is in.',
    kind: 'single',
    options: [
      { value: 'Start now — go live by 11 May 2026', label: 'Start 11 May' },
      { value: 'Live in June 2026', label: 'June 2026' },
      { value: 'Live in Q3 2026 (Jul–Sep)', label: 'Q3 2026' },
      { value: 'Live in Q4 2026 (Oct–Dec)', label: 'Q4 2026' },
      { value: 'Live in 2027', label: '2027' },
    ],
  },
  {
    key: 'notes',
    eyebrow: 'Step 12',
    shortLabel: 'Anything else',
    title: 'Anything specific about Hostyo we should know?',
    hint: 'Existing scripts, tone, owners profile, deal-breakers.',
    kind: 'notes',
    notePlaceholder:
      'Existing call scripts, your dealbreakers, owners’ typical objections — anything that helps us nail v1.',
    optional: true,
  },
];

const BUDGET_MIN = 3000;
const BUDGET_MAX = 60000;
const BUDGET_STEP = 500;

const eur = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

interface FormState {
  leadSources: string[];
  volume: string;
  cadence: string;
  qualification: string[];
  languages: string[];
  hours: string;
  deployment: string;
  agents: string[];
  integrations: string[];
  budget: [number, number];
  timeline: string;
  notes: string;
}

function initialState(): FormState {
  return {
    leadSources: ['Cold purchased property-owner lists'],
    volume: '',
    cadence: '',
    qualification: [
      'City + neighbourhood',
      'Property type (flat / villa / studio)',
      'Number of rooms',
      'Furnishing (empty / furnished / partially)',
      'Long-term vs short-term availability',
      'Legal status (title deed / share / pending)',
    ],
    languages: ['English', 'Greek (standard)', 'Cypriot Greek dialect'],
    hours: '',
    deployment: '',
    agents: [
      'Outbound sales agent (qualifies + books valuation)',
      'WhatsApp follow-up agent (PDF + Calendly send)',
    ],
    integrations: [
      'Close CRM (lead pipeline progression)',
      'Twilio (local Cyprus number for outbound)',
      'WhatsApp Business API',
      'Calendly (free valuation booking)',
    ],
    budget: [10000, 25000],
    timeline: '',
    notes: '',
  };
}

function buildDescription(state: FormState): string {
  const sec = (label: string, body: string) => `**${label}**\n${body}`;
  const lines: string[] = [];
  if (state.leadSources.length) lines.push(sec('Lead sources', state.leadSources.join(', ')));
  if (state.volume) lines.push(sec('Daily volume', state.volume));
  if (state.cadence) lines.push(sec('Channel cadence', state.cadence));
  if (state.qualification.length)
    lines.push(sec('Qualification questions', state.qualification.join(', ')));
  if (state.languages.length) lines.push(sec('Languages', state.languages.join(', ')));
  if (state.hours) lines.push(sec('Operating hours', state.hours));
  if (state.deployment) lines.push(sec('Model deployment', state.deployment));
  if (state.agents.length) lines.push(sec('Agent roles', state.agents.join(', ')));
  if (state.integrations.length) lines.push(sec('Integrations', state.integrations.join(', ')));
  lines.push(sec('Budget range', `${eur(state.budget[0])} – ${eur(state.budget[1])}`));
  if (state.timeline) lines.push(sec('Timeline', state.timeline));
  if (state.notes.trim()) lines.push(sec('Notes', state.notes.trim()));
  return lines.join('\n\n');
}

export function HostyoBrief({
  projectId,
  projectName,
  className,
}: {
  projectId: string;
  projectName: string;
  className?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<FormState>(() => initialState());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  function toggleMulti(key: keyof FormState, value: string) {
    setState((prev) => {
      const cur = prev[key];
      if (!Array.isArray(cur)) return prev;
      const arr = cur as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next } as FormState;
    });
  }

  function setSingle(key: keyof FormState, value: string) {
    setState((prev) => ({ ...prev, [key]: value }) as FormState);
  }

  function isStepFilled(s: Step): boolean {
    if (s.optional) return true;
    if (s.kind === 'budget') return state.budget[0] < state.budget[1];
    if (s.kind === 'notes') return true;
    const v = state[s.key as keyof FormState];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return false;
  }

  function goNext() {
    if (!isStepFilled(step)) {
      toast.error('Pick an option to continue');
      return;
    }
    if (isLast) {
      void handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const result = await createFeatureRequest({
      project_id: projectId,
      title: `Project brief — ${projectName}`,
      description: buildDescription(state),
      priority: 'medium',
    });
    setSubmitting(false);
    if (result.success) {
      toast.success('Brief sent — we’ll come back with a proposal shortly');
      setSubmitted(true);
    } else {
      toast.error(result.error || 'Failed to send brief');
    }
  }

  if (submitted) {
    return (
      <div
        className={cn(
          'mx-auto flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-card p-6 text-left shadow-elevation-1 sm:flex-row sm:items-center',
          className
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary ring-1 ring-primary/15">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-6 w-6"
          >
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Brief received</h3>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            We have everything we need. Expect a proposal in your inbox within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-elevation-1',
        className
      )}
    >
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
            {step.eyebrow} of {STEPS.length}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/65">
            Hostyo AI Sales Agent · {step.shortLabel}
          </p>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border/50">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <h2 className="mt-4 text-lg font-semibold leading-tight tracking-tight text-foreground">
          {step.title}
        </h2>
        {step.hint && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.hint}</p>
        )}
      </div>

      <div key={stepIndex} className="animate-[stepIn_240ms_ease-out_both] space-y-4 px-5 py-5">
        {step.kind === 'multi' && step.options && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {step.options.map((opt) => {
              const raw = state[step.key as keyof FormState];
              const selected = Array.isArray(raw) && (raw as string[]).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMulti(step.key as keyof FormState, opt.value)}
                  className={cn(
                    'group relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    selected
                      ? 'border-primary/40 bg-primary/[0.08] text-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.04] hover:text-foreground'
                  )}
                >
                  {opt.label}
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="h-2.5 w-2.5"
                      >
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {step.kind === 'single' && step.options && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {step.options.map((opt) => {
              const selected = state[step.key as keyof FormState] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSingle(step.key as keyof FormState, opt.value)}
                  className={cn(
                    'group relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    selected
                      ? 'border-primary/40 bg-primary/[0.08] text-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.04] hover:text-foreground'
                  )}
                >
                  {opt.label}
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="h-2.5 w-2.5"
                      >
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {step.kind === 'budget' && (
          <div className="space-y-6 px-1 pt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                Range
              </span>
              <span className="text-[20px] font-semibold tabular-nums tracking-tight text-foreground">
                {eur(state.budget[0])} <span className="text-muted-foreground/60">–</span>{' '}
                {eur(state.budget[1])}
              </span>
            </div>

            <SliderPrimitive.Root
              className="relative flex h-6 w-full touch-none select-none items-center"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={BUDGET_STEP}
              minStepsBetweenThumbs={2}
              value={state.budget}
              onValueChange={(v) =>
                setState((prev) => ({ ...prev, budget: [v[0], v[1]] as [number, number] }))
              }
            >
              <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border/50">
                <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb
                className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-card shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 active:cursor-grabbing"
                aria-label="Minimum budget"
              />
              <SliderPrimitive.Thumb
                className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-card shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 active:cursor-grabbing"
                aria-label="Maximum budget"
              />
            </SliderPrimitive.Root>

            <div className="flex justify-between text-[11px] font-medium tabular-nums tracking-wide text-muted-foreground/60">
              <span>{eur(BUDGET_MIN)}</span>
              <span>{eur((BUDGET_MIN + BUDGET_MAX) / 2)}</span>
              <span>{eur(BUDGET_MAX)}+</span>
            </div>
          </div>
        )}

        {step.kind === 'notes' && (
          <Textarea
            value={state.notes}
            onChange={(e) => setState((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder={step.notePlaceholder}
            className="min-h-[140px] resize-none rounded-lg text-sm leading-relaxed"
            autoFocus
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
        <div className="flex items-center gap-3">
          {!isFirst ? (
            <button
              type="button"
              onClick={goBack}
              className="group flex min-h-[40px] cursor-pointer items-center gap-1 text-[12px] font-medium text-muted-foreground/75 transition-colors duration-150 hover:text-foreground"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
                ←
              </span>
              Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>

        <Button
          onClick={goNext}
          disabled={submitting}
          className="group h-10 min-w-[130px] gap-1.5 rounded-lg px-5 text-[12.5px] font-medium shadow-sm transition-all duration-200 hover:shadow-md"
        >
          {submitting ? (
            'Sending…'
          ) : isLast ? (
            <>
              Send brief
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </>
          ) : (
            <>
              Continue
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </>
          )}
        </Button>
      </div>

      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes stepIn {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
    </div>
  );
}
