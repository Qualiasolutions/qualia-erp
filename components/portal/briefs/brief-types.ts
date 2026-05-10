export interface ChipOption {
  value: string;
  label: string;
}

export interface BriefModulesStep {
  title: string;
  hint: string;
  options: ChipOption[];
  defaults?: string[];
}

export interface BriefFields {
  goals: string[];
  goalsNote: string;
  audience: string[];
  audienceNote: string;
  modules: string[];
  modulesNote: string;
  geography: string[];
  geographyNote: string;
  integrations: string[];
  integrationsNote: string;
  references: string;
  timeline: string;
  timelineNote: string;
  budget: string;
  budgetNote: string;
  notes: string;
}

export const GOAL_OPTIONS: ChipOption[] = [
  { value: 'Sell tickets / drive event signups', label: 'Sell tickets / events' },
  { value: 'Launch a new revenue stream', label: 'New revenue stream' },
  { value: 'Showcase a service / generate leads', label: 'Generate leads' },
  { value: 'Replace a manual / spreadsheet process', label: 'Replace manual process' },
  { value: 'Demo for partners / investors', label: 'Partner / investor demo' },
  { value: 'White-label & resell to clients', label: 'White-label & resell' },
];

export const AUDIENCE_OPTIONS: ChipOption[] = [
  { value: 'Event-goers / ticket buyers', label: 'Event-goers' },
  { value: 'Vendors managing their own page', label: 'Vendors' },
  { value: 'Internal admin team', label: 'Admin team' },
  { value: 'End customers buying products', label: 'End customers' },
  { value: 'Referral / affiliate users', label: 'Affiliates' },
];

export const GEOGRAPHY_OPTIONS: ChipOption[] = [
  { value: 'Cyprus', label: 'Cyprus' },
  { value: 'UAE', label: 'UAE' },
  { value: 'Jordan', label: 'Jordan' },
  { value: 'Italy', label: 'Italy' },
  { value: 'USA', label: 'USA' },
  { value: 'Multi-region', label: 'Multi-region' },
];

export const INTEGRATION_OPTIONS: ChipOption[] = [
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

export const TIMELINE_OPTIONS: ChipOption[] = [
  { value: 'Now', label: 'Now' },
  { value: 'In the next month', label: 'In the next month' },
  { value: 'In 2 months', label: 'In 2 months' },
  { value: 'LATER', label: 'Later' },
];

export const BUDGET_OPTIONS: ChipOption[] = [
  { value: 'Under €5k', label: 'Under €5k' },
  { value: '€5k–€10k', label: '€5k–€10k' },
  { value: '€10k–€20k', label: '€10k–€20k' },
  { value: '€20k+', label: '€20k+' },
];

export const INITIAL_FIELDS: BriefFields = {
  goals: [],
  goalsNote: '',
  audience: [],
  audienceNote: '',
  modules: [],
  modulesNote: '',
  geography: [],
  geographyNote: '',
  integrations: [],
  integrationsNote: '',
  references: '',
  timeline: '',
  timelineNote: '',
  budget: '',
  budgetNote: '',
  notes: '',
};
