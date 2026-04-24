import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border px-4 py-2 text-sm transition-all duration-200 ease-premium',
          'border-border bg-muted/30',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground/60',
          'hover:border-border/80 hover:bg-muted/40',
          'focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-primary/15',
          // Dark mode glow effects
          'dark:border-[hsl(174_100%_42%/0.1)] dark:bg-[hsl(180_6%_8%/0.5)]',
          'dark:hover:border-[hsl(174_100%_42%/0.2)]',
          'dark:focus:border-[hsl(174_100%_42%/0.4)] dark:focus:bg-background dark:focus:shadow-[var(--glow-teal-sm)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
