import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm transition-all duration-200 ease-premium',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground/60',
          'hover:border-border/80 hover:bg-muted/40',
          'focus:border-primary/50 focus:bg-background focus:shadow-glow-sm focus:outline-none focus:ring-[3px] focus:ring-primary/15',
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
