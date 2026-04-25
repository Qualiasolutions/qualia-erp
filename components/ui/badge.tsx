import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/10 text-primary hover:bg-primary/15 dark:bg-[hsl(174_100%_42%/0.12)] dark:text-[hsl(174_100%_55%)] dark:hover:bg-[hsl(174_100%_42%/0.18)] dark:hover:shadow-[var(--glow-teal-xs)]',
        secondary:
          'border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary',
        destructive:
          'border-transparent bg-destructive/10 text-destructive hover:bg-destructive/15',
        outline:
          'text-foreground border-border hover:border-border hover:bg-muted/50 dark:border-[hsl(174_100%_42%/0.15)] dark:hover:border-[hsl(174_100%_42%/0.3)]',
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
