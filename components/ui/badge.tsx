import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ring-1 ring-primary/10 transition-all duration-200 ease-premium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/10 text-primary shadow-sm hover:bg-primary/15 hover:shadow hover:scale-[1.02]',
        secondary:
          'border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:scale-[1.02]',
        destructive:
          'border-transparent bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/15 hover:shadow hover:scale-[1.02]',
        outline:
          'text-foreground border-border/60 hover:border-border hover:bg-muted/50 hover:scale-[1.02]',
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
