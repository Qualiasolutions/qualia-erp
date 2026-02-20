import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ring-1 ring-primary/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/10 text-primary shadow-sm hover:bg-primary/15 hover:shadow',
        secondary:
          'border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary',
        destructive:
          'border-transparent bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/15 hover:shadow',
        outline: 'text-foreground border-border/60 hover:border-border hover:bg-muted/50',
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
