'use client';

import { useState } from 'react';
import { Check, CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { createFeatureRequest } from '@/app/actions/client-requests';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { BriefData, BriefSection } from '@/lib/validation';

type MultiKey = 'demoGoals' | 'channels' | 'languages' | 'handoffTriggers' | 'integrations';

interface FormState {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  demoGoals: string[];
  bookingDetails: string;
  integrations: string[];
  channels: string[];
  languages: string[];
  handoffTriggers: string[];
  voiceTone: string;
  timeline: string;
  budget: string;
  successCriteria: string;
  notes: string;
}

interface ChipOption {
  value: string;
  label: string;
}

const DEMO_GOAL_OPTIONS: ChipOption[] = [
  { value: 'Book a new massage appointment from start to finish', label: 'Book appointments' },
  { value: 'Answer treatment and price questions clearly', label: 'Answer questions' },
  { value: 'Handle changes, cancellations, and rescheduling', label: 'Changes / cancel' },
  { value: 'Send deposit or payment links after booking', label: 'Payment links' },
  { value: 'Notify the owner for sensitive or complex requests', label: 'Owner handoff' },
];

const INTEGRATION_OPTIONS: ChipOption[] = [
  { value: 'Google Calendar availability', label: 'Google Calendar' },
  { value: 'WhatsApp messages', label: 'WhatsApp' },
  { value: 'Email inquiries', label: 'Email' },
  { value: 'SMS reminders or payment links', label: 'SMS' },
  { value: 'Website treatment and price content', label: 'Website content' },
];

const CHANNEL_OPTIONS: ChipOption[] = [
  { value: 'Phone calls', label: 'Phone calls' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Email', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
];

const LANGUAGE_OPTIONS: ChipOption[] = [
  { value: 'English', label: 'English' },
  { value: 'Greek', label: 'Greek' },
  { value: 'German', label: 'German' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Bulgarian', label: 'Bulgarian' },
  { value: 'Portuguese', label: 'Portuguese' },
];

const HANDOFF_OPTIONS: ChipOption[] = [
  { value: 'Medical or pregnancy questions', label: 'Medical questions' },
  { value: 'Difficult room or therapist scheduling issue', label: 'Scheduling issue' },
  { value: 'Payment, deposit, or refund issue', label: 'Payment issue' },
  { value: 'Complaint or unhappy customer', label: 'Complaint' },
  { value: 'Caller asks for the owner', label: 'Asks for owner' },
];

const TIMELINE_OPTIONS: ChipOption[] = [
  { value: 'Start in May 2026', label: 'May 2026' },
  { value: 'Start in June 2026', label: 'June 2026' },
  { value: 'Start in Q4 2026', label: 'Q4 2026' },
];

const BUDGET_OPTIONS: ChipOption[] = [
  { value: '€7,500 and under', label: '€7.5k and under' },
  { value: '€7,500 – €15,000', label: '€7.5k – €15k' },
  { value: '€15,000 – €25,000', label: '€15k – €25k' },
  { value: '€25,000 – €50,000', label: '€25k – €50k' },
  { value: '€50,000+', label: '€50k+' },
];

const INITIAL_STATE: FormState = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  demoGoals: [],
  bookingDetails: '',
  integrations: [],
  channels: [],
  languages: [],
  handoffTriggers: [],
  voiceTone: '',
  timeline: '',
  budget: '',
  successCriteria: '',
  notes: '',
};

function formatList(values: string[]) {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : '- Not selected';
}

function buildDescription(state: FormState, confidentialityAccepted: boolean): string {
  return [
    `**Contact**\nName: ${state.contactName}\nEmail: ${state.contactEmail}\nPhone / WhatsApp: ${state.contactPhone || 'Not provided'}`,
    `**What the demo should prove**\n${formatList(state.demoGoals)}`,
    `**Booking setup we should understand**\n${state.bookingDetails.trim()}`,
    `**Systems to connect or simulate**\n${formatList(state.integrations)}`,
    `**Customer channels**\n${formatList(state.channels)}`,
    `**Languages**\n${formatList(state.languages)}`,
    `**When the AI should hand off**\n${formatList(state.handoffTriggers)}`,
    `**Preferred voice style**\n${state.voiceTone.trim() || 'Not provided'}`,
    `**Timeline**\n${state.timeline}`,
    `**Budget range**\n${state.budget}`,
    `**What would make this demo successful**\n${state.successCriteria.trim()}`,
    state.notes.trim() ? `**Additional notes**\n${state.notes.trim()}` : '',
    `**Confidentiality acknowledged**\n${confidentialityAccepted ? 'Yes' : 'No'}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildBriefData(state: FormState, confidentialityAccepted: boolean): BriefData {
  const sections: BriefSection[] = [];

  const pushText = (key: string, label: string, value: string) => {
    if (!value.trim()) return;
    sections.push({ key, label, value: value.trim() });
  };

  const pushValues = (key: string, label: string, values: string[]) => {
    if (values.length === 0) return;
    sections.push({ key, label, values });
  };

  const contact = [
    `Name: ${state.contactName}`,
    `Email: ${state.contactEmail}`,
    `Phone / WhatsApp: ${state.contactPhone || 'Not provided'}`,
  ].join('\n');

  pushText('contact', 'Contact', contact);
  pushValues('demo_goals', 'What the demo should prove', state.demoGoals);
  pushText('booking_setup', 'Booking setup we should understand', state.bookingDetails);
  pushValues('integrations', 'Systems to connect or simulate', state.integrations);
  pushValues('channels', 'Customer channels', state.channels);
  pushValues('languages', 'Languages', state.languages);
  pushValues('handoff_triggers', 'When the AI should hand off', state.handoffTriggers);
  pushText('voice_tone', 'Preferred voice style', state.voiceTone);
  pushText('timeline', 'Timeline', state.timeline);
  pushText('budget', 'Budget range', state.budget);
  pushText('success_criteria', 'What would make this demo successful', state.successCriteria);
  pushText('notes', 'Additional notes', state.notes);
  sections.push({
    key: 'confidentiality',
    label: 'Confidentiality acknowledged',
    value: confidentialityAccepted ? 'Yes' : 'No',
  });

  return {
    variant: 'seven-buddhas',
    submitted_at: new Date().toISOString(),
    sections,
  };
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-center text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {label}
      {selected && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />}
    </button>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function SevenBuddhasBrief({
  projectId,
  projectName,
  className,
}: {
  projectId: string;
  projectName: string;
  className?: string;
}) {
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [confidentialityAccepted, setConfidentialityAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMulti(key: MultiKey, value: string) {
    setState((prev) => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state.demoGoals.length === 0) {
      toast.error('Pick what the demo should prove');
      return;
    }
    if (state.channels.length === 0) {
      toast.error('Pick at least one customer channel');
      return;
    }
    if (state.languages.length === 0) {
      toast.error('Pick at least one language');
      return;
    }
    if (!state.timeline) {
      toast.error('Pick a timeline');
      return;
    }
    if (!state.budget) {
      toast.error('Pick a budget range');
      return;
    }
    if (!confidentialityAccepted) {
      toast.error('Confirm confidentiality before sending the brief');
      return;
    }

    setSubmitting(true);
    const result = await createFeatureRequest({
      project_id: projectId,
      title: `Project brief — ${projectName}`,
      description: buildDescription(state, confidentialityAccepted),
      priority: 'high',
      brief_data: buildBriefData(state, confidentialityAccepted),
    });
    setSubmitting(false);

    if (result.success) {
      toast.success('Brief sent to Qualia');
      setSubmitted(true);
    } else {
      toast.error(result.error || 'Failed to send brief');
    }
  }

  if (submitted) {
    return (
      <div
        className={cn(
          'mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-8 py-12 text-center',
          className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Brief received</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We have what we need to shape the 7 Buddhas AI front desk demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('mx-auto w-full max-w-3xl space-y-5', className)}>
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          7 Buddhas Massage Center
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          AI front desk demo brief
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A short form to help Qualia prepare the right demo and estimate the full project.
        </p>
      </div>

      <Section title="Contact" hint="Who should we speak with about the demo?">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="contactName">Name</Label>
            <Input
              id="contactName"
              value={state.contactName}
              onChange={(event) => setField('contactName', event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={state.contactEmail}
              onChange={(event) => setField('contactEmail', event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone / WhatsApp</Label>
            <Input
              id="contactPhone"
              value={state.contactPhone}
              onChange={(event) => setField('contactPhone', event.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Demo focus"
        hint="Pick the parts you want to see working in the first tailored demo."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {DEMO_GOAL_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={state.demoGoals.includes(option.value)}
              onClick={() => toggleMulti('demoGoals', option.value)}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Booking setup"
        hint="Tell us the rules the AI must respect when booking appointments."
      >
        <Textarea
          value={state.bookingDetails}
          onChange={(event) => setField('bookingDetails', event.target.value)}
          placeholder="Rooms, therapists, calendars, treatment lengths, booking gaps, deposits, cancellation rules, or anything the AI must not get wrong."
          className="min-h-[130px]"
          required
        />
      </Section>

      <Section title="Systems and channels" hint="What should the demo connect to or simulate?">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Systems</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {INTEGRATION_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={state.integrations.includes(option.value)}
                  onClick={() => toggleMulti('integrations', option.value)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Customer channels</Label>
            <div className="grid gap-2 sm:grid-cols-4">
              {CHANNEL_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={state.channels.includes(option.value)}
                  onClick={() => toggleMulti('channels', option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Languages and handoff"
        hint="How the AI should speak, and when it should stop."
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Languages</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {LANGUAGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={state.languages.includes(option.value)}
                  onClick={() => toggleMulti('languages', option.value)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner handoff should happen for</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {HANDOFF_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={state.handoffTriggers.includes(option.value)}
                  onClick={() => toggleMulti('handoffTriggers', option.value)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="voiceTone">Preferred assistant tone</Label>
            <Textarea
              id="voiceTone"
              value={state.voiceTone}
              onChange={(event) => setField('voiceTone', event.target.value)}
              placeholder="For example: calm, warm, professional, direct, luxury spa tone, casual, etc."
              className="min-h-[90px]"
            />
          </div>
        </div>
      </Section>

      <Section title="Timeline and budget" hint="These help us scope the right demo and proposal.">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>When are you looking to start?</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {TIMELINE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={state.timeline === option.value}
                  onClick={() => setField('timeline', option.value)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Budget range</Label>
            <div className="grid gap-2 sm:grid-cols-5">
              {BUDGET_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={state.budget === option.value}
                  onClick={() => setField('budget', option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Success criteria" hint="What would make the demo worth moving forward with?">
        <Textarea
          value={state.successCriteria}
          onChange={(event) => setField('successCriteria', event.target.value)}
          placeholder="What should the AI do well enough for you to say this is worth building?"
          className="min-h-[110px]"
          required
        />
      </Section>

      <Section
        title="Anything else"
        hint="Optional details that would help us build the right demo."
      >
        <Textarea
          value={state.notes}
          onChange={(event) => setField('notes', event.target.value)}
          placeholder="Existing tools, team preferences, examples of difficult customer calls, or details we should avoid."
          className="min-h-[110px]"
        />
      </Section>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <Checkbox
          id="confidentiality"
          checked={confidentialityAccepted}
          onCheckedChange={(checked) => setConfidentialityAccepted(checked === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="confidentiality"
          className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground"
        >
          I understand that Qualia Solutions treats the information shared in this brief as
          confidential.
        </Label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="min-h-11 min-w-[150px]">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send brief
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
