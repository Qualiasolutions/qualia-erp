export type PriorityKey = 'urgent' | 'high' | 'med' | 'low';

const MAP: Record<PriorityKey, { color: string; label: string }> = {
  urgent: { color: 'var(--q-rust)', label: 'URG' },
  high: { color: 'var(--q-amber)', label: 'HI' },
  med: { color: 'var(--accent-teal)', label: 'MD' },
  low: { color: 'var(--text-mute)', label: 'LO' },
};

export function PriorityBadge({ priority }: { priority: PriorityKey }) {
  const entry = MAP[priority];
  return (
    <span
      data-slot="priority-badge"
      className="inline-flex h-4 w-6 items-center justify-center rounded-[3px] border bg-transparent font-mono text-[9px] font-bold tracking-[0.4px]"
      style={{ color: entry.color, borderColor: entry.color }}
      aria-label={`Priority: ${priority}`}
    >
      {entry.label}
    </span>
  );
}
