'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createFeatureRequest } from '@/app/actions/client-requests';
import { cn } from '@/lib/utils';

interface ClientProjectBriefFormProps {
  projectId: string;
  projectName: string;
  className?: string;
}

interface BriefFields {
  type: string;
  typeNote: string;
  goals: string[];
  goalsNote: string;
  audience: string[];
  audienceNote: string;
  references: string;
  timeline: string;
  timelineNote: string;
  budget: string;
  budgetNote: string;
  notes: string;
}

const INITIAL: BriefFields = {
  type: '',
  typeNote: '',
  goals: [],
  goalsNote: '',
  audience: [],
  audienceNote: '',
  references: '',
  timeline: '',
  timelineNote: '',
  budget: '',
  budgetNote: '',
  notes: '',
};

const TYPE_OPTIONS = [
  { value: 'Website', label: 'Website' },
  { value: 'Web app', label: 'Web app' },
  { value: 'Mobile app', label: 'Mobile app' },
  { value: 'AI agent', label: 'AI agent' },
  { value: 'Voice agent', label: 'Voice agent' },
  { value: 'Other', label: 'Other' },
];

const GOAL_OPTIONS = [
  { value: 'Win new customers', label: 'Win new customers' },
  { value: 'Replace a spreadsheet / manual work', label: 'Replace a spreadsheet' },
  { value: 'Automate replies / support', label: 'Automate replies' },
  { value: 'Look more professional', label: 'Look more professional' },
  { value: 'Sell online', label: 'Sell online' },
  { value: 'Internal team tool', label: 'Internal team tool' },
];

const AUDIENCE_OPTIONS = [
  { value: 'My customers', label: 'My customers' },
  { value: 'My team', label: 'My team' },
  { value: 'Partners / suppliers', label: 'Partners / suppliers' },
  { value: 'The general public', label: 'General public' },
];

const TIMELINE_OPTIONS = [
  { value: 'Now', label: 'Now' },
  { value: 'In the next month', label: 'In the next month' },
  { value: 'In 2 months', label: 'In 2 months' },
  { value: 'LATER', label: 'Later' },
];

const BUDGET_OPTIONS = [
  { value: 'Under €5k', label: 'Under €5k' },
  { value: '€5k–€10k', label: '€5k–€10k' },
  { value: '€10k–€25k', label: '€10k–€25k' },
  { value: '€25k+', label: '€25k+' },
];

type StepKind = 'chips' | 'multi-chips' | 'textarea';

interface Step {
  key: keyof BriefFields;
  noteKey?: keyof BriefFields;
  eyebrow: string;
  title: string;
  hint?: string;
  kind: StepKind;
  options?: { value: string; label: string }[];
  placeholder?: string;
  notePlaceholder?: string;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    key: 'type',
    noteKey: 'typeNote',
    eyebrow: 'Step 1',
    title: 'What are we building?',
    hint: 'Pick the closest match — we can refine later.',
    kind: 'chips',
    options: TYPE_OPTIONS,
    notePlaceholder: 'Anything to add about the type? (optional)',
  },
  {
    key: 'goals',
    noteKey: 'goalsNote',
    eyebrow: 'Step 2',
    title: 'What does success look like?',
    hint: 'Pick everything that fits — pick more than one.',
    kind: 'multi-chips',
    options: GOAL_OPTIONS,
    notePlaceholder: 'Add your own goal in your words (optional)',
  },
  {
    key: 'audience',
    noteKey: 'audienceNote',
    eyebrow: 'Step 3',
    title: 'Who is it for?',
    hint: 'Pick the people who will actually use it.',
    kind: 'multi-chips',
    options: AUDIENCE_OPTIONS,
    notePlaceholder: 'Describe them in a sentence (optional)',
    optional: true,
  },
  {
    key: 'references',
    eyebrow: 'Step 4',
    title: 'Anything similar you love?',
    hint: 'Links, app names, screenshots — anything that nails the vibe.',
    kind: 'textarea',
    placeholder: 'https://… or "the way Linear handles X"',
    optional: true,
  },
  {
    key: 'timeline',
    noteKey: 'timelineNote',
    eyebrow: 'Step 5',
    title: 'When do you want it?',
    kind: 'chips',
    options: TIMELINE_OPTIONS,
    notePlaceholder: 'A specific date or deadline? (optional)',
  },
  {
    key: 'budget',
    noteKey: 'budgetNote',
    eyebrow: 'Step 6',
    title: 'Budget range?',
    hint: 'Helps us scope the right shape of build.',
    kind: 'chips',
    options: BUDGET_OPTIONS,
    notePlaceholder: 'Any context on the budget? (optional)',
  },
  {
    key: 'notes',
    eyebrow: 'Step 7',
    title: 'Anything else we should know?',
    hint: 'Constraints, must-haves, things to avoid.',
    kind: 'textarea',
    placeholder: 'Optional — leave blank if nothing comes to mind.',
    optional: true,
  },
];

const STEP_LABELS = ['Type', 'Goal', 'Audience', 'Refs', 'Timeline', 'Budget', 'Notes'];

function buildDescription(f: BriefFields): string {
  const sections: string[] = [];
  if (f.type) {
    sections.push(
      `**Project type**\n${f.type}${f.typeNote.trim() ? `\n_${f.typeNote.trim()}_` : ''}`
    );
  }
  if (f.goals.length > 0) {
    sections.push(
      `**Goals**\n${f.goals.join(', ')}${f.goalsNote.trim() ? `\n_${f.goalsNote.trim()}_` : ''}`
    );
  }
  if (f.audience.length > 0 || f.audienceNote.trim()) {
    const audience = f.audience.length > 0 ? f.audience.join(', ') : '(see note)';
    sections.push(
      `**Target audience**\n${audience}${
        f.audienceNote.trim() ? `\n_${f.audienceNote.trim()}_` : ''
      }`
    );
  }
  if (f.references.trim()) sections.push(`**References / inspiration**\n${f.references.trim()}`);
  if (f.timeline) {
    sections.push(
      `**Timeline**\n${f.timeline}${f.timelineNote.trim() ? `\n_${f.timelineNote.trim()}_` : ''}`
    );
  }
  if (f.budget) {
    sections.push(
      `**Budget**\n${f.budget}${f.budgetNote.trim() ? `\n_${f.budgetNote.trim()}_` : ''}`
    );
  }
  if (f.notes.trim()) sections.push(`**Anything else**\n${f.notes.trim()}`);
  return sections.join('\n\n');
}

export function ClientProjectBriefForm({
  projectId,
  projectName,
  className,
}: ClientProjectBriefFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [fields, setFields] = useState<BriefFields>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const value = fields[step.key];
  const noteValue =
    step.noteKey && typeof fields[step.noteKey] === 'string'
      ? (fields[step.noteKey] as string)
      : '';
  const hasPrimary =
    step.kind === 'multi-chips'
      ? Array.isArray(value) && value.length > 0
      : typeof value === 'string' && value.trim().length > 0;
  const canAdvance = step.optional || hasPrimary || noteValue.trim().length > 0;
  const hasContent =
    fields.type ||
    fields.goals.length > 0 ||
    fields.audience.length > 0 ||
    [
      fields.typeNote,
      fields.goalsNote,
      fields.audienceNote,
      fields.references,
      fields.timeline,
      fields.timelineNote,
      fields.budget,
      fields.budgetNote,
      fields.notes,
    ].some((v) => v.trim().length > 0);

  function update<K extends keyof BriefFields>(key: K, next: BriefFields[K]) {
    setFields((prev) => ({ ...prev, [key]: next }));
  }

  function toggleMulti(key: keyof BriefFields, optionValue: string) {
    setFields((prev) => {
      const current = prev[key];
      if (!Array.isArray(current)) return prev;
      const exists = current.includes(optionValue);
      const next = exists ? current.filter((v) => v !== optionValue) : [...current, optionValue];
      return { ...prev, [key]: next } as BriefFields;
    });
  }

  function goNext() {
    if (!canAdvance) {
      toast.error('Pick an option to continue');
      return;
    }
    if (isLast) {
      handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function skipStep() {
    if (isLast) {
      handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    if (!hasContent) {
      toast.error('Add at least one detail before sending');
      return;
    }

    setSubmitting(true);
    const description = buildDescription(fields);
    const result = await createFeatureRequest({
      project_id: projectId,
      title: `Project brief — ${projectName}`,
      description,
      priority: 'medium',
    });
    setSubmitting(false);

    if (result.success) {
      toast.success('Brief sent — we’ll review and get back to you');
      setSubmitted(true);
      setFields(INITIAL);
      setStepIndex(0);
    } else {
      toast.error(result.error || 'Failed to send brief');
    }
  }

  if (submitted) {
    return (
      <div
        className={cn(
          'mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border border-primary/20 bg-primary/[0.04] px-8 py-12 text-center',
          className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
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
          <p className="mt-1.5 text-sm text-muted-foreground">
            We&apos;ll review your input and reach out shortly. You can always add more via
            Requests.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSubmitted(false)}
          className="mt-2 h-9 rounded-lg"
        >
          Send another note
        </Button>
      </div>
    );
  }

  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-b from-primary/[0.04] to-transparent px-7 pb-5 pt-6">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
            {step.eyebrow} of {STEPS.length}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/65">
            {STEP_LABELS[stepIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-muted-foreground/12 mt-3 h-[3px] w-full overflow-hidden rounded-full">
          <div
            className="duration-[420ms] ease-[cubic-bezier(0.19,1,0.22,1)] h-full rounded-full bg-gradient-to-r from-primary/70 to-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)] transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <h2 className="mt-5 text-[20px] font-semibold leading-tight tracking-tight text-foreground sm:text-[22px]">
          {step.title}
        </h2>
        {step.hint && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.hint}</p>
        )}
      </div>

      {/* Body */}
      <div
        key={stepIndex}
        className="animate-[stepIn_320ms_cubic-bezier(0.19,1,0.22,1)_both] space-y-5 px-7 py-7"
      >
        {step.kind === 'chips' && step.options && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {step.options.map((opt) => {
              const selected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update(step.key, opt.value as BriefFields[typeof step.key])}
                  className={cn(
                    'group relative flex h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-[13.5px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    selected
                      ? 'border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.6),0_8px_24px_-6px_hsl(var(--primary)/0.45)]'
                      : 'border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.04] hover:text-foreground'
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

        {step.kind === 'multi-chips' && step.options && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {step.options.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMulti(step.key, opt.value)}
                  className={cn(
                    'group relative flex h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-[13.5px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    selected
                      ? 'border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.6),0_8px_24px_-6px_hsl(var(--primary)/0.45)]'
                      : 'border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.04] hover:text-foreground'
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

        {step.kind === 'textarea' && (
          <Textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => update(step.key, e.target.value as BriefFields[typeof step.key])}
            placeholder={step.placeholder}
            className="min-h-[140px] resize-none rounded-xl text-[14px] leading-relaxed"
            autoFocus
          />
        )}

        {/* Optional extra-text under chip-style steps */}
        {(step.kind === 'chips' || step.kind === 'multi-chips') && step.noteKey && (
          <Textarea
            value={noteValue}
            onChange={(e) => update(step.noteKey as keyof BriefFields, e.target.value as never)}
            placeholder={step.notePlaceholder ?? 'Anything to add? (optional)'}
            className="min-h-[80px] resize-none rounded-xl text-[13.5px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/55"
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-7 py-4">
        <div className="flex items-center gap-3">
          {!isFirst ? (
            <button
              type="button"
              onClick={goBack}
              className="group flex min-h-[40px] cursor-pointer items-center gap-1 text-[12px] font-medium text-muted-foreground/75 transition-colors duration-150 hover:text-foreground focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
                ←
              </span>
              Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          {step.optional && !isLast && (
            <button
              type="button"
              onClick={skipStep}
              className="cursor-pointer text-[12px] text-muted-foreground/55 transition-colors duration-150 hover:text-foreground/80 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Skip
            </button>
          )}
        </div>

        <Button
          onClick={goNext}
          disabled={submitting || (!canAdvance && !step.optional)}
          className="group h-10 min-w-[130px] gap-1.5 rounded-xl px-5 text-[12.5px] font-medium shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.45)] transition-all duration-200 hover:shadow-[0_8px_28px_-4px_hsl(var(--primary)/0.55)] hover:brightness-110"
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
