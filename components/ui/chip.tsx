import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChipVariant = 'default' | 'accent' | 'soft';

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: ChipVariant;
  dot?: string;
  children: ReactNode;
};

const variantClasses: Record<ChipVariant, string> = {
  default: 'bg-[var(--surface-hi)] text-[var(--text-soft)] border-[var(--line)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent-teal)] border-transparent',
  soft: 'bg-[var(--bg-sub)] text-[var(--text-mute)] border-[var(--line)]',
};

export function Chip({ variant = 'default', dot, className, children, ...rest }: ChipProps) {
  return (
    <span
      data-slot="chip"
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-[3px] font-mono text-[11px] font-medium tracking-[0.02em]',
        variantClasses[variant],
        className
      )}
      {...rest}
    >
      {dot ? (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      ) : null}
      {children}
    </span>
  );
}
