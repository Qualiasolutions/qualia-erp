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

type MultiKey = 'knowledge' | 'channels' | 'languages' | 'handoffTriggers';

interface FormState {
  contactName: string;
  email: string;
  phone: string;
  role: string;
  resourceModel: string;
  calendarSystem: string;
  cancellationPolicy: string;
  depositFlow: string;
  knowledge: string[];
  channels: string[];
  languages: string[];
  handoffTriggers: string[];
  gdprDisclosure: string;
  ndaPreference: string;
  demoCall: string;
  notes: string;
}

interface ChipOption {
  value: string;
  label: string;
}

const KNOWLEDGE_OPTIONS: ChipOption[] = [
  {
    value: 'Massage menu, treatment durations, and prices from 7buddhas.com',
    label: 'Menu + prices',
  },
  { value: 'Thai, oil, pregnancy, couples, and specialty massage FAQs', label: 'Treatment FAQs' },
  { value: 'Opening hours, location, parking, and arrival instructions', label: 'Visitor info' },
  { value: 'Gift vouchers, packages, and payment questions', label: 'Vouchers + payments' },
  { value: 'Medical safety boundaries and when to escalate', label: 'Safety boundaries' },
];

const CHANNEL_OPTIONS: ChipOption[] = [
  { value: 'Inbound voice calls', label: 'Voice calls' },
  { value: 'WhatsApp inquiries and booking confirmations', label: 'WhatsApp' },
  { value: 'Email inquiries', label: 'Email' },
  { value: 'SMS or Viber payment and reminder links', label: 'SMS / Viber' },
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
  { value: 'Medical, injury, pregnancy, or contraindication questions', label: 'Medical' },
  { value: 'Complex room or therapist scheduling conflicts', label: 'Scheduling conflict' },
  { value: 'Refund, deposit, or voucher dispute', label: 'Payment issue' },
  { value: 'Complaint or unhappy customer', label: 'Complaint' },
  { value: 'Caller asks directly for Ernestos', label: 'Asks for owner' },
];

const NDA_OPTIONS: ChipOption[] = [
  {
    value: 'Qualia confidentiality confirmation is enough for now',
    label: 'Confirmation is enough',
  },
  { value: 'Send Qualia NDA before technical access', label: 'Send Qualia NDA' },
  { value: '7 Buddhas will provide its own NDA', label: 'Client NDA' },
];

const INITIAL_STATE: FormState = {
  contactName: 'Ernestos Potempa',
  email: 'ernst.potempa@gmail.com',
  phone: '',
  role: 'Owner / Manager',
  resourceModel:
    '9 therapists, 4 double treatment rooms, 8 tables total. The AI must check real-time Google Calendar availability and never exceed room/table capacity.',
  calendarSystem: 'Google Calendar',
  cancellationPolicy: '24-hour notice rule for cancellations and rescheduling.',
  depositFlow:
    'After booking, send a payment link by WhatsApp or SMS to secure the appointment and reduce no-shows.',
  knowledge: [
    'Massage menu, treatment durations, and prices from 7buddhas.com',
    'Thai, oil, pregnancy, couples, and specialty massage FAQs',
    'Opening hours, location, parking, and arrival instructions',
    'Medical safety boundaries and when to escalate',
  ],
  channels: [
    'Inbound voice calls',
    'WhatsApp inquiries and booking confirmations',
    'Email inquiries',
  ],
  languages: ['English', 'Greek', 'German'],
  handoffTriggers: [
    'Medical, injury, pregnancy, or contraindication questions',
    'Complex room or therapist scheduling conflicts',
    'Caller asks directly for Ernestos',
  ],
  gdprDisclosure:
    'At the start of each call, disclose that the caller is speaking with an AI assistant, explain recording/data use where applicable, and follow Cyprus/EU GDPR requirements.',
  ndaPreference: 'Qualia confidentiality confirmation is enough for now',
  demoCall: 'Friday 15 May 2026, 12:00',
  notes: '',
};

function formatList(values: string[]) {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : '- Not selected';
}

function buildDescription(state: FormState, confidentialityAccepted: boolean): string {
  return [
    `**Contact**\nName: ${state.contactName}\nEmail: ${state.email}\nPhone: ${state.phone || 'Not provided'}\nRole: ${state.role}`,
    `**Resource booking model**\n${state.resourceModel}`,
    `**Calendar system**\n${state.calendarSystem}`,
    `**Cancellation and rescheduling policy**\n${state.cancellationPolicy}`,
    `**Deposit flow**\n${state.depositFlow}`,
    `**Knowledge the AI should answer from**\n${formatList(state.knowledge)}`,
    `**Channels for the shared AI brain**\n${formatList(state.channels)}`,
    `**Voice and message languages**\n${formatList(state.languages)}`,
    `**Immediate handoff triggers**\n${formatList(state.handoffTriggers)}`,
    `**GDPR disclosure requirement**\n${state.gdprDisclosure}`,
    `**Confidentiality / NDA preference**\n${state.ndaPreference}\nConfidentiality acknowledged: ${confidentialityAccepted ? 'Yes' : 'No'}`,
    `**Planned demo call**\n${state.demoCall}`,
    state.notes.trim() ? `**Additional notes**\n${state.notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
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
  const [confidentialityAccepted, setConfidentialityAccepted] = useState(true);
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

    if (!confidentialityAccepted) {
      toast.error('Confirm confidentiality before sending the brief');
      return;
    }

    setSubmitting(true);
    const result = await createFeatureRequest({
      project_id: projectId,
      title: `7 Buddhas AI front desk brief - ${projectName}`,
      description: buildDescription(state, confidentialityAccepted),
      priority: 'high',
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
            We have the operational details for the 7 Buddhas AI front desk demo.
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
          AI front desk intake
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Confirm the booking rules, website knowledge, handoff protocol, and GDPR requirements so
          Qualia can prepare the tailored voice-agent demo.
        </p>
      </div>

      <Section title="Contact details" hint="Used only for the project brief and follow-up.">
        <div className="grid gap-4 sm:grid-cols-2">
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={state.email}
              onChange={(event) => setField('email', event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone / WhatsApp</Label>
            <Input
              id="phone"
              value={state.phone}
              onChange={(event) => setField('phone', event.target.value)}
              placeholder="+357..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={state.role}
              onChange={(event) => setField('role', event.target.value)}
              required
            />
          </div>
        </div>
      </Section>

      <Section
        title="Booking logic"
        hint="This is the important part: the agent must understand rooms, tables, therapists, and calendar capacity."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resourceModel">Room, table, and therapist constraints</Label>
            <Textarea
              id="resourceModel"
              value={state.resourceModel}
              onChange={(event) => setField('resourceModel', event.target.value)}
              className="min-h-[110px]"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="calendarSystem">Calendar system</Label>
              <Input
                id="calendarSystem"
                value={state.calendarSystem}
                onChange={(event) => setField('calendarSystem', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demoCall">Demo call</Label>
              <Input
                id="demoCall"
                value={state.demoCall}
                onChange={(event) => setField('demoCall', event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellationPolicy">Cancellation and rescheduling rule</Label>
            <Input
              id="cancellationPolicy"
              value={state.cancellationPolicy}
              onChange={(event) => setField('cancellationPolicy', event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="depositFlow">Deposit / payment-link flow</Label>
            <Textarea
              id="depositFlow"
              value={state.depositFlow}
              onChange={(event) => setField('depositFlow', event.target.value)}
              className="min-h-[88px]"
            />
          </div>
        </div>
      </Section>

      <Section
        title="AI brain"
        hint="Pick what the assistant should handle across calls and messages."
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Website knowledge</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {KNOWLEDGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={state.knowledge.includes(option.value)}
                  onClick={() => toggleMulti('knowledge', option.value)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Channels</Label>
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
        </div>
      </Section>

      <Section title="Handoff and compliance" hint="When the AI should stop and notify Ernestos.">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Immediate handoff triggers</Label>
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
            <Label htmlFor="gdprDisclosure">GDPR disclosure</Label>
            <Textarea
              id="gdprDisclosure"
              value={state.gdprDisclosure}
              onChange={(event) => setField('gdprDisclosure', event.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>NDA preference</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {NDA_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={state.ndaPreference === option.value}
                  onClick={() => setField('ndaPreference', option.value)}
                />
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
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
              I confirm all shared business, operational, and technical details are confidential
              between 7 Buddhas and Qualia Solutions.
            </Label>
          </div>
        </div>
      </Section>

      <Section title="Anything else" hint="Optional details that would help shape the demo.">
        <Textarea
          value={state.notes}
          onChange={(event) => setField('notes', event.target.value)}
          placeholder="Therapist-specific rules, exact payment provider, scripts, tone, or edge cases."
          className="min-h-[120px]"
        />
      </Section>

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
