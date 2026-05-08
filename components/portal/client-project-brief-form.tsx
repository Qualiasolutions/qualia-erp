'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createFeatureRequest } from '@/app/actions/client-requests';
import { cn } from '@/lib/utils';

interface ClientProjectBriefFormProps {
  projectId: string;
  projectName: string;
  className?: string;
}

interface BriefFields {
  goals: string;
  audience: string;
  timeline: string;
  budget: string;
  notes: string;
}

const INITIAL: BriefFields = {
  goals: '',
  audience: '',
  timeline: '',
  budget: '',
  notes: '',
};

function buildDescription(f: BriefFields): string {
  const sections: string[] = [];
  if (f.goals.trim()) sections.push(`**Goals**\n${f.goals.trim()}`);
  if (f.audience.trim()) sections.push(`**Target audience**\n${f.audience.trim()}`);
  if (f.timeline.trim()) sections.push(`**Timeline**\n${f.timeline.trim()}`);
  if (f.budget.trim()) sections.push(`**Budget range**\n${f.budget.trim()}`);
  if (f.notes.trim()) sections.push(`**Anything else**\n${f.notes.trim()}`);
  return sections.join('\n\n');
}

export function ClientProjectBriefForm({
  projectId,
  projectName,
  className,
}: ClientProjectBriefFormProps) {
  const [fields, setFields] = useState<BriefFields>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const hasContent = Object.values(fields).some((v) => v.trim().length > 0);

  function update<K extends keyof BriefFields>(key: K, value: BriefFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
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

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm',
        className
      )}
    >
      <div className="border-b border-border bg-gradient-to-b from-primary/[0.04] to-transparent px-7 pb-5 pt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
          Project brief
        </p>
        <h2 className="mt-2 text-[19px] font-semibold tracking-tight text-foreground">
          Tell us about {projectName}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          A few details so we can scope the build and start moving. Skip any field that doesn&apos;t
          apply.
        </p>
      </div>

      <div className="space-y-5 px-7 py-6">
        <Field label="Goals" hint="What does success look like?">
          <Textarea
            value={fields.goals}
            onChange={(e) => update('goals', e.target.value)}
            placeholder="What are you trying to achieve with this project?"
            className="min-h-[88px] resize-none rounded-lg text-sm"
          />
        </Field>

        <Field label="Target audience" hint="Who is this for?">
          <Input
            value={fields.audience}
            onChange={(e) => update('audience', e.target.value)}
            placeholder="e.g. SMB owners in Cyprus, restaurant operators"
            className="h-10 rounded-lg text-sm"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Timeline" hint="When do you need this live?">
            <Input
              value={fields.timeline}
              onChange={(e) => update('timeline', e.target.value)}
              placeholder="e.g. mid June 2026"
              className="h-10 rounded-lg text-sm"
            />
          </Field>

          <Field label="Budget range" hint="Optional, helps us scope">
            <Input
              value={fields.budget}
              onChange={(e) => update('budget', e.target.value)}
              placeholder="e.g. €3k–€6k"
              className="h-10 rounded-lg text-sm"
            />
          </Field>
        </div>

        <Field label="Anything else" hint="References, constraints, ideas">
          <Textarea
            value={fields.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Inspiration links, must-haves, things to avoid…"
            className="min-h-[96px] resize-none rounded-lg text-sm"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-7 py-4">
        <p className="text-[11px] text-muted-foreground/70">Sent privately to your Qualia team.</p>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !hasContent}
          className="h-9 min-w-[120px] gap-1.5 rounded-xl text-[12.5px] font-medium shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.45)] transition-all duration-200 hover:shadow-[0_8px_28px_-4px_hsl(var(--primary)/0.55)] hover:brightness-110"
        >
          {submitting ? 'Sending…' : 'Send brief'}
          {!submitting && (
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-medium text-foreground/90">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground/65">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
