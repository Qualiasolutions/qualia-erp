import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EyebrowProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Eyebrow({ className, children, ...rest }: EyebrowProps) {
  return (
    <span data-slot="eyebrow" className={cn('q-eyebrow', className)} {...rest}>
      {children}
    </span>
  );
}
