'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createFeatureRequest } from '@/app/actions/client-requests';
import { cn } from '@/lib/utils';
import type { BriefData, BriefSection } from '@/lib/validation';

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
  geography: string[];
  geographyNote: string;
  integrations: string[];
  integrationsNote: string;
  references: string;
  timeline: string;
  timelineNote: string;
  budget: string;
  budgetNote: string;
  ownership: string;
  ownershipNote: string;
  notes: string;
}

const INITIAL: BriefFields = {
  type: '',
  typeNote: '',
  goals: [],
  goalsNote: '',
  audience: [],
  audienceNote: '',
  geography: [],
  geographyNote: '',
  integrations: [],
  integrationsNote: '',
  references: '',
  timeline: '',
  timelineNote: '',
  budget: '',
  budgetNote: '',
  ownership: '',
  ownershipNote: '',
  notes: '',
};

const TYPE_OPTIONS = [
  { value: 'Booking / ticketing platform', label: 'Booking / ticketing' },
  { value: 'Marketplace / multi-vendor', label: 'Marketplace' },
  { value: 'Custom SaaS / dashboard', label: 'Custom SaaS' },
  { value: 'E-commerce store', label: 'E-commerce' },
  { value: 'Mobile app (React Native)', label: 'Mobile app' },
  { value: 'Internal admin tool', label: 'Admin tool' },
  { value: 'Other', label: 'Other' },
];

const GOAL_OPTIONS = [
  { value: 'Sell tickets / drive event signups', label: 'Sell tickets / events' },
  { value: 'Launch a new revenue stream', label: 'New revenue stream' },
  { value: 'Showcase a service / generate leads', label: 'Generate leads' },
  { value: 'Replace a manual / spreadsheet process', label: 'Replace manual process' },
  { value: 'Demo for partners / investors', label: 'Partner / investor demo' },
  { value: 'White-label & resell to clients', label: 'White-label & resell' },
];

const AUDIENCE_OPTIONS = [
  { value: 'Event-goers / ticket buyers', label: 'Event-goers' },
  { value: 'Vendors managing their own page', label: 'Vendors' },
  { value: 'Internal admin team', label: 'Admin team' },
  { value: 'End customers buying products', label: 'End customers' },
  { value: 'Referral / affiliate users', label: 'Affiliates' },
];

const GEOGRAPHY_OPTIONS = [
  { value: 'Cyprus', label: 'Cyprus' },
  { value: 'UAE', label: 'UAE' },
  { value: 'Jordan', label: 'Jordan' },
  { value: 'Italy', label: 'Italy' },
  { value: 'USA', label: 'USA' },
  { value: 'Multi-region', label: 'Multi-region' },
];

const INTEGRATION_OPTIONS = [
  { value: 'JCC payment gateway', label: 'JCC' },
  { value: 'Revolut payment links', label: 'Revolut' },
  { value: 'Stripe', label: 'Stripe' },
  { value: 'Email (Resend / SendGrid)', label: 'Email' },
  { value: 'SMS / WhatsApp', label: 'SMS / WhatsApp' },
  { value: 'Google Calendar', label: 'Calendar' },
  { value: 'Referral / affiliate program', label: 'Referrals' },
  { value: 'Ticketing engine', label: 'Ticketing engine' },
  { value: 'Analytics (GA / Posthog)', label: 'Analytics' },
  { value: 'WordPress / CMS', label: 'CMS' },
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
  { value: '€10k–€20k', label: '€10k–€20k' },
  { value: '€20k+', label: '€20k+' },
];

const OWNERSHIP_OPTIONS = [
  { value: 'Full handover (code + hosting + docs to me)', label: 'Full handover' },
  { value: 'Qualia-managed (you host + support)', label: 'Qualia-managed' },
  { value: 'Hybrid (Qualia hosts year 1, then hand over)', label: 'Hybrid' },
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
    title: 'What kind of platform are we building?',
    hint: 'Pick the closest match — we can refine later.',
    kind: 'chips',
    options: TYPE_OPTIONS,
    notePlaceholder: 'A specific platform name or scope detail? (optional)',
  },
  {
    key: 'goals',
    noteKey: 'goalsNote',
    eyebrow: 'Step 2',
    title: 'What is this project supposed to do?',
    hint: 'Pick everything that fits — pick more than one.',
    kind: 'multi-chips',
    options: GOAL_OPTIONS,
    notePlaceholder: 'Add the #1 outcome in your words (optional)',
  },
  {
    key: 'audience',
    noteKey: 'audienceNote',
    eyebrow: 'Step 3',
    title: 'Who is the end user?',
    hint: 'Pick everyone who will actually use it.',
    kind: 'multi-chips',
    options: AUDIENCE_OPTIONS,
    notePlaceholder: 'Describe them in a sentence (optional)',
    optional: true,
  },
  {
    key: 'geography',
    noteKey: 'geographyNote',
    eyebrow: 'Step 4',
    title: 'Where will it operate?',
    hint: 'Pick every market the platform serves.',
    kind: 'multi-chips',
    options: GEOGRAPHY_OPTIONS,
    notePlaceholder: 'Specific cities or rollout order? (optional)',
    optional: true,
  },
  {
    key: 'integrations',
    noteKey: 'integrationsNote',
    eyebrow: 'Step 5',
    title: 'Must-have integrations?',
    hint: 'Pick everything you need wired up at launch.',
    kind: 'multi-chips',
    options: INTEGRATION_OPTIONS,
    notePlaceholder: 'Other tools or APIs to integrate? (optional)',
    optional: true,
  },
  {
    key: 'references',
    eyebrow: 'Step 6',
    title: 'Reference platforms you love?',
    hint: 'Links, app names, screenshots — anything that nails the vibe.',
    kind: 'textarea',
    placeholder: 'https://… or "the way Linear handles X"',
    optional: true,
  },
  {
    key: 'timeline',
    noteKey: 'timelineNote',
    eyebrow: 'Step 7',
    title: 'When do you want it launched?',
    kind: 'chips',
    options: TIMELINE_OPTIONS,
    notePlaceholder: 'A specific event or deadline? (optional)',
  },
  {
    key: 'budget',
    noteKey: 'budgetNote',
    eyebrow: 'Step 8',
    title: 'Budget range?',
    hint: 'Helps us scope the right shape of build.',
    kind: 'chips',
    options: BUDGET_OPTIONS,
    notePlaceholder: 'Any context on the budget? (optional)',
  },
  {
    key: 'ownership',
    noteKey: 'ownershipNote',
    eyebrow: 'Step 9',
    title: 'Ownership preference?',
    hint: 'How should the project be handed over after launch?',
    kind: 'chips',
    options: OWNERSHIP_OPTIONS,
    notePlaceholder: 'Anything specific about handover or hosting? (optional)',
  },
  {
    key: 'notes',
    eyebrow: 'Step 10',
    title: 'Anything else we should know?',
    hint: 'Constraints, must-haves, things to avoid.',
    kind: 'textarea',
    placeholder: 'Optional — leave blank if nothing comes to mind.',
    optional: true,
  },
];

const STEP_LABELS = [
  'Type',
  'Goal',
  'Audience',
  'Geography',
  'Integrations',
  'Refs',
  'Timeline',
  'Budget',
  'Ownership',
  'Notes',
];

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
  if (f.geography.length > 0 || f.geographyNote.trim()) {
    const geography = f.geography.length > 0 ? f.geography.join(', ') : '(see note)';
    sections.push(
      `**Geography**\n${geography}${f.geographyNote.trim() ? `\n_${f.geographyNote.trim()}_` : ''}`
    );
  }
  if (f.integrations.length > 0 || f.integrationsNote.trim()) {
    const integrations = f.integrations.length > 0 ? f.integrations.join(', ') : '(see note)';
    sections.push(
      `**Must-have integrations**\n${integrations}${
        f.integrationsNote.trim() ? `\n_${f.integrationsNote.trim()}_` : ''
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
  if (f.ownership) {
    sections.push(
      `**Ownership preference**\n${f.ownership}${
        f.ownershipNote.trim() ? `\n_${f.ownershipNote.trim()}_` : ''
      }`
    );
  }
  if (f.notes.trim()) sections.push(`**Anything else**\n${f.notes.trim()}`);
  return sections.join('\n\n');
}

function buildBriefData(fields: BriefFields): BriefData {
  const sections: BriefSection[] = [];

  const pushChips = (key: string, label: string, values: string[], note: string) => {
    if (values.length === 0 && !note.trim()) return;
    const section: BriefSection = { key, label };
    if (values.length > 0) section.values = values;
    if (note.trim()) section.note = note.trim();
    sections.push(section);
  };

  const pushChip = (key: string, label: string, value: string, note: string) => {
    if (!value && !note.trim()) return;
    const section: BriefSection = { key, label };
    if (value) section.value = value;
    if (note.trim()) section.note = note.trim();
    sections.push(section);
  };

  const pushText = (key: string, label: string, value: string) => {
    if (!value.trim()) return;
    sections.push({ key, label, value: value.trim() });
  };

  pushChip('type', 'Project type', fields.type, fields.typeNote);
  pushChips('goals', 'Goals', fields.goals, fields.goalsNote);
  pushChips('audience', 'Target audience', fields.audience, fields.audienceNote);
  pushChips('geography', 'Geography', fields.geography, fields.geographyNote);
  pushChips('integrations', 'Must-have integrations', fields.integrations, fields.integrationsNote);
  pushText('references', 'References / inspiration', fields.references);
  pushChip('timeline', 'Timeline', fields.timeline, fields.timelineNote);
  pushChip('budget', 'Budget', fields.budget, fields.budgetNote);
  pushChip('ownership', 'Ownership preference', fields.ownership, fields.ownershipNote);
  pushText('notes', 'Anything else', fields.notes);

  return {
    variant: 'generic',
    submitted_at: new Date().toISOString(),
    sections,
  };
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
    fields.geography.length > 0 ||
    fields.integrations.length > 0 ||
    [
      fields.typeNote,
      fields.goalsNote,
      fields.audienceNote,
      fields.geographyNote,
      fields.integrationsNote,
      fields.references,
      fields.timeline,
      fields.timelineNote,
      fields.budget,
      fields.budgetNote,
      fields.ownership,
      fields.ownershipNote,
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
    const briefData = buildBriefData(fields);
    const result = await createFeatureRequest({
      project_id: projectId,
      title: `Project brief — ${projectName}`,
      description,
      priority: 'medium',
      brief_data: briefData,
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
        'mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-elevation-1',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
            {step.eyebrow} of {STEPS.length}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/65">
            {STEP_LABELS[stepIndex]}
          </p>
        </div>

        {/* Progress bar */}
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

      {/* Body */}
      <div key={stepIndex} className="animate-[stepIn_240ms_ease-out_both] space-y-4 px-5 py-5">
        {step.kind === 'chips' && step.options && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {step.options.map((opt) => {
              const selected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update(step.key, opt.value as BriefFields[typeof step.key])}
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

        {step.kind === 'multi-chips' && step.options && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {step.options.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMulti(step.key, opt.value)}
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

        {step.kind === 'textarea' && (
          <Textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => update(step.key, e.target.value as BriefFields[typeof step.key])}
            placeholder={step.placeholder}
            className="min-h-[140px] resize-none rounded-lg text-sm leading-relaxed"
            autoFocus
          />
        )}

        {/* Optional extra-text under chip-style steps */}
        {(step.kind === 'chips' || step.kind === 'multi-chips') && step.noteKey && (
          <Textarea
            value={noteValue}
            onChange={(e) => update(step.noteKey as keyof BriefFields, e.target.value as never)}
            placeholder={step.notePlaceholder ?? 'Anything to add? (optional)'}
            className="min-h-[80px] resize-none rounded-lg text-[13.5px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/55"
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
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
