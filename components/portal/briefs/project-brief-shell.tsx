'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createFeatureRequest, uploadRequestAttachment } from '@/app/actions/client-requests';
import type { BriefData, BriefSection } from '@/lib/validation';
import { cn } from '@/lib/utils';
import {
  AUDIENCE_OPTIONS,
  BUDGET_OPTIONS,
  type BriefFields,
  type BriefModulesStep,
  type ChipOption,
  GEOGRAPHY_OPTIONS,
  GOAL_OPTIONS,
  INITIAL_FIELDS,
  INTEGRATION_OPTIONS,
  TIMELINE_OPTIONS,
} from './brief-types';

// Aligned with uploadRequestAttachment limits in app/actions/client-requests.ts.
const MAX_FILES = 8;
const MAX_FILE_SIZE_MB = 20;

interface ProjectBriefShellProps {
  projectId: string;
  projectName: string;
  formTitle: string;
  modulesStep: BriefModulesStep;
  /** Identifies this variant in the structured brief_data payload. */
  variant: string;
  className?: string;
}

type StepKind = 'multi-chips' | 'textarea' | 'chips' | 'files';

interface Step {
  key: keyof BriefFields | 'files';
  noteKey?: keyof BriefFields;
  eyebrow: string;
  shortLabel: string;
  title: string;
  hint?: string;
  kind: StepKind;
  options?: ChipOption[];
  placeholder?: string;
  notePlaceholder?: string;
  optional?: boolean;
}

function buildSteps(modulesStep: BriefModulesStep): Step[] {
  return [
    {
      key: 'goals',
      noteKey: 'goalsNote',
      eyebrow: 'Step 1',
      shortLabel: 'Goals',
      title: 'What is this project supposed to do?',
      hint: 'Pick everything that fits.',
      kind: 'multi-chips',
      options: GOAL_OPTIONS,
      notePlaceholder: 'Add the #1 outcome in your words (optional)',
    },
    {
      key: 'audience',
      noteKey: 'audienceNote',
      eyebrow: 'Step 2',
      shortLabel: 'Audience',
      title: 'Who is the end user?',
      hint: 'Pick everyone who will actually use it.',
      kind: 'multi-chips',
      options: AUDIENCE_OPTIONS,
      notePlaceholder: 'Describe them in a sentence (optional)',
      optional: true,
    },
    {
      key: 'modules',
      noteKey: 'modulesNote',
      eyebrow: 'Step 3',
      shortLabel: 'Modules',
      title: modulesStep.title,
      hint: modulesStep.hint,
      kind: 'multi-chips',
      options: modulesStep.options,
      notePlaceholder: 'Other modules we should build? (optional)',
    },
    {
      key: 'geography',
      noteKey: 'geographyNote',
      eyebrow: 'Step 4',
      shortLabel: 'Geography',
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
      shortLabel: 'Integrations',
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
      shortLabel: 'Refs',
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
      shortLabel: 'Timeline',
      title: 'When do you want it launched?',
      kind: 'chips',
      options: TIMELINE_OPTIONS,
      notePlaceholder: 'A specific event or deadline? (optional)',
    },
    {
      key: 'budget',
      noteKey: 'budgetNote',
      eyebrow: 'Step 8',
      shortLabel: 'Budget',
      title: 'Budget range?',
      hint: 'Helps us scope the right shape of build.',
      kind: 'chips',
      options: BUDGET_OPTIONS,
      notePlaceholder: 'Any context on the budget? (optional)',
    },
    {
      key: 'files',
      eyebrow: 'Step 9',
      shortLabel: 'Files',
      title: 'Upload anything we should see',
      hint: 'Logo, brief PDF, screenshots, references — up to 8 files, 20MB each.',
      kind: 'files',
      optional: true,
    },
    {
      key: 'notes',
      eyebrow: 'Step 10',
      shortLabel: 'Notes',
      title: 'Anything else we should know?',
      hint: 'Constraints, must-haves, things to avoid.',
      kind: 'textarea',
      placeholder: 'Optional — leave blank if nothing comes to mind.',
      optional: true,
    },
  ];
}

function buildDescription(
  fields: BriefFields,
  uploadedFiles: { name: string; size: number }[]
): string {
  const sections: string[] = [];

  const pushChips = (label: string, values: string[], note: string) => {
    if (values.length === 0 && !note.trim()) return;
    const body = values.length > 0 ? values.join(', ') : '(see note)';
    sections.push(`**${label}**\n${body}${note.trim() ? `\n_${note.trim()}_` : ''}`);
  };

  const pushChip = (label: string, value: string, note: string) => {
    if (!value && !note.trim()) return;
    sections.push(
      `**${label}**\n${value || '(see note)'}${note.trim() ? `\n_${note.trim()}_` : ''}`
    );
  };

  pushChips('Goals', fields.goals, fields.goalsNote);
  pushChips('Audience', fields.audience, fields.audienceNote);
  pushChips('Modules', fields.modules, fields.modulesNote);
  pushChips('Geography', fields.geography, fields.geographyNote);
  pushChips('Integrations', fields.integrations, fields.integrationsNote);
  if (fields.references.trim()) sections.push(`**References**\n${fields.references.trim()}`);
  pushChip('Timeline', fields.timeline, fields.timelineNote);
  pushChip('Budget', fields.budget, fields.budgetNote);
  if (uploadedFiles.length > 0) {
    const list = uploadedFiles
      .map((f) => `- ${f.name} (${(f.size / 1024).toFixed(0)} KB)`)
      .join('\n');
    sections.push(`**Attached files**\n${list}`);
  }
  if (fields.notes.trim()) sections.push(`**Anything else**\n${fields.notes.trim()}`);

  return sections.join('\n\n');
}

function buildBriefData(variant: string, fields: BriefFields, modulesLabel: string): BriefData {
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

  pushChips('goals', 'Goals', fields.goals, fields.goalsNote);
  pushChips('audience', 'Audience', fields.audience, fields.audienceNote);
  pushChips('modules', modulesLabel, fields.modules, fields.modulesNote);
  pushChips('geography', 'Geography', fields.geography, fields.geographyNote);
  pushChips('integrations', 'Integrations', fields.integrations, fields.integrationsNote);
  pushText('references', 'References', fields.references);
  pushChip('timeline', 'Timeline', fields.timeline, fields.timelineNote);
  pushChip('budget', 'Budget', fields.budget, fields.budgetNote);
  pushText('notes', 'Anything else', fields.notes);

  return {
    variant,
    submitted_at: new Date().toISOString(),
    sections,
  };
}

export function ProjectBriefShell({
  projectId,
  projectName,
  formTitle,
  modulesStep,
  variant,
  className,
}: ProjectBriefShellProps) {
  const STEPS = buildSteps(modulesStep);

  const [stepIndex, setStepIndex] = useState(0);
  const [fields, setFields] = useState<BriefFields>({
    ...INITIAL_FIELDS,
    modules: modulesStep.defaults ?? [],
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const value = step.key === 'files' ? null : fields[step.key as keyof BriefFields];
  const noteValue =
    step.noteKey && typeof fields[step.noteKey] === 'string'
      ? (fields[step.noteKey] as string)
      : '';

  const hasPrimary =
    step.kind === 'multi-chips'
      ? Array.isArray(value) && value.length > 0
      : step.kind === 'files'
        ? files.length > 0
        : typeof value === 'string' && value.trim().length > 0;

  const canAdvance = step.optional || hasPrimary || noteValue.trim().length > 0;

  const hasContent =
    fields.goals.length > 0 ||
    fields.modules.length > 0 ||
    fields.audience.length > 0 ||
    fields.geography.length > 0 ||
    fields.integrations.length > 0 ||
    files.length > 0 ||
    [
      fields.goalsNote,
      fields.audienceNote,
      fields.modulesNote,
      fields.geographyNote,
      fields.integrationsNote,
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const tooBig = picked.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooBig) {
      toast.error(`"${tooBig.name}" exceeds ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    setFiles((prev) => {
      const merged = [...prev, ...picked].slice(0, MAX_FILES);
      if (prev.length + picked.length > MAX_FILES) {
        toast.warning(`Max ${MAX_FILES} files — extra files ignored`);
      }
      return merged;
    });
    e.target.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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

    // Create the request first so files attach to a known request_id. The
    // markdown description carries the same data as brief_data for back-compat
    // with the existing /requests detail view; brief_data drives the new
    // structured viewer on the project page.
    const briefData = buildBriefData(variant, fields, modulesStep.title);
    const description = buildDescription(fields, []);
    const result = await createFeatureRequest({
      project_id: projectId,
      title: `Project brief — ${projectName}`,
      description,
      priority: 'medium',
      brief_data: briefData,
    });

    if (!result.success || !result.data) {
      setSubmitting(false);
      toast.error(result.error || 'Failed to send brief');
      return;
    }

    const requestId = (result.data as { id: string }).id;

    for (const file of files) {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('request_id', requestId);
      const res = await uploadRequestAttachment(fd);
      if (!res.success) {
        toast.error(`Could not upload ${file.name}: ${res.error}`);
      }
    }

    setSubmitting(false);
    toast.success('Brief sent — we’ll review and get back to you');
    setSubmitted(true);
    setFields({ ...INITIAL_FIELDS, modules: modulesStep.defaults ?? [] });
    setFiles([]);
    setStepIndex(0);
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
            {formTitle} · {step.shortLabel}
          </p>
        </div>

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
                  onClick={() => update(step.key as keyof BriefFields, opt.value as never)}
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
                  onClick={() => toggleMulti(step.key as keyof BriefFields, opt.value)}
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
            onChange={(e) => update(step.key as keyof BriefFields, e.target.value as never)}
            placeholder={step.placeholder}
            className="min-h-[140px] resize-none rounded-xl text-[14px] leading-relaxed"
            autoFocus
          />
        )}

        {step.kind === 'files' && (
          <div className="space-y-3">
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/30 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-7 w-7 text-muted-foreground"
              >
                <path d="M12 4v16m-8-8h16" strokeLinecap="round" />
              </svg>
              <span className="text-[13px] font-medium text-muted-foreground">
                Click to add files <span className="text-muted-foreground/60">(or drop)</span>
              </span>
              <input type="file" multiple onChange={handleFileSelect} className="hidden" />
            </label>

            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-3 py-2 text-[13px]"
                  >
                    <span className="truncate text-foreground">{f.name}</span>
                    <div className="flex items-center gap-3 pl-3">
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="cursor-pointer text-[11px] text-muted-foreground/70 hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
