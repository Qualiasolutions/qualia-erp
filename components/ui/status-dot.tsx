import { Chip } from './chip';

export type StatusKey =
  | 'done'
  | 'active'
  | 'in-progress'
  | 'today'
  | 'inbox'
  | 'review'
  | 'blocked'
  | 'upcoming'
  | 'attention'
  | 'green'
  | 'steady'
  | 'paid'
  | 'due'
  | 'overdue'
  | 'draft';

const MAP: Record<StatusKey, { color: string; label: string }> = {
  done: { color: 'var(--q-moss)', label: 'Done' },
  active: { color: 'var(--accent-hi)', label: 'Active' },
  'in-progress': { color: 'var(--accent-hi)', label: 'In progress' },
  today: { color: 'var(--q-amber)', label: 'Today' },
  inbox: { color: 'var(--text-mute)', label: 'Inbox' },
  review: { color: 'var(--q-plum)', label: 'Review' },
  blocked: { color: 'var(--q-rust)', label: 'Blocked' },
  upcoming: { color: 'var(--line-2)', label: 'Upcoming' },
  attention: { color: 'var(--q-amber)', label: 'Attention' },
  green: { color: 'var(--q-moss)', label: 'Healthy' },
  steady: { color: 'var(--accent-hi)', label: 'Steady' },
  paid: { color: 'var(--q-moss)', label: 'Paid' },
  due: { color: 'var(--q-amber)', label: 'Due' },
  overdue: { color: 'var(--q-rust)', label: 'Overdue' },
  draft: { color: 'var(--text-mute)', label: 'Draft' },
};

export function StatusDot({ status, label }: { status: StatusKey; label?: string }) {
  const entry = MAP[status];
  return <Chip dot={entry.color}>{label ?? entry.label}</Chip>;
}
