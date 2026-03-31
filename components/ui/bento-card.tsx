'use client';

import * as React from 'react';
import { type HTMLMotionProps } from 'framer-motion';
import { m } from '@/lib/lazy-motion';
import { cn } from '@/lib/utils';

interface BentoCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  variant?: 'default' | 'highlight' | 'gradient' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  glow?: boolean;
}

const sizeClasses = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const variantClasses = {
  default: 'border-border bg-card',
  highlight:
    'border-primary/30 bg-gradient-to-br from-qualia-500/10 via-qualia-500/5 to-transparent',
  gradient: 'border-border bg-gradient-to-br from-card via-card to-muted/30',
  glass: 'border-border bg-card/80 backdrop-blur-sm',
};

const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  (
    {
      className,
      children,
      variant = 'default',
      size = 'md',
      interactive = true,
      glow = false,
      ...props
    },
    ref
  ) => {
    return (
      <m.div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-2xl border transition-all duration-300',
          sizeClasses[size],
          variantClasses[variant],
          interactive && 'hover:border-primary/40 hover:shadow-lg',
          glow && 'shadow-primary/5 hover:shadow-primary/10',
          className
        )}
        whileHover={interactive ? { y: -2, scale: 1.01 } : undefined}
        whileTap={interactive ? { scale: 0.99 } : undefined}
        transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
        {...props}
      >
        {/* Hover gradient overlay */}
        {interactive && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-qualia-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
        )}

        {/* Glow effect */}
        {glow && (
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-qualia-500/20 via-transparent to-qualia-500/20 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100" />
        )}

        <div className="relative z-10">{children}</div>
      </m.div>
    );
  }
);
BentoCard.displayName = 'BentoCard';

// Header component for bento cards
interface BentoCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const BentoCardHeader = React.forwardRef<HTMLDivElement, BentoCardHeaderProps>(
  ({ className, children, icon, action, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mb-4 flex items-center justify-between', className)} {...props}>
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <span className="text-sm font-semibold text-foreground">{children}</span>
        </div>
        {action}
      </div>
    );
  }
);
BentoCardHeader.displayName = 'BentoCardHeader';

// Value display for metric cards
interface BentoCardValueProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label?: string;
  trend?: { value: number; label?: string };
}

const BentoCardValue = React.forwardRef<HTMLDivElement, BentoCardValueProps>(
  ({ className, value, label, trend, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
            {label && <p className="mt-1 text-sm text-muted-foreground">{label}</p>}
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                trend.value >= 0
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
              )}
            >
              <svg
                className={cn('h-3 w-3', trend.value < 0 && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    );
  }
);
BentoCardValue.displayName = 'BentoCardValue';

export { BentoCard, BentoCardHeader, BentoCardValue };
