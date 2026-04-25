import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15',
        secondary:
          'border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary dark:bg-secondary/75',
        destructive:
          'border-transparent bg-destructive/10 text-destructive hover:bg-destructive/15',
        outline:
          'border-border bg-card/70 text-foreground hover:border-primary/25 hover:bg-muted/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
