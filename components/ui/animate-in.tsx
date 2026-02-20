'use client';

import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface AnimateInProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before animation starts */
  delay?: number;
  /** Animation type */
  animation?: 'fade-in' | 'slide-up' | 'slide-in' | 'scale-in';
  /** HTML tag to render */
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
}

/**
 * Lightweight CSS-only animation wrapper.
 * Uses the animation classes defined in globals.css with optional stagger delay.
 */
export function AnimateIn({
  children,
  className,
  delay = 0,
  animation = 'slide-up',
  as: Tag = 'div',
}: AnimateInProps) {
  const animationClass = {
    'fade-in': 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'slide-in': 'animate-slide-in',
    'scale-in': 'animate-scale-in',
  }[animation];

  return (
    <Tag
      className={cn(animationClass, className)}
      style={delay > 0 ? { animationDelay: `${delay}ms`, animationFillMode: 'both' } : undefined}
    >
      {children}
    </Tag>
  );
}

interface StaggeredListProps {
  children: ReactNode[];
  className?: string;
  /** Delay between each item in ms */
  staggerDelay?: number;
  /** Initial delay before first item in ms */
  initialDelay?: number;
  /** Animation type for each item */
  animation?: 'fade-in' | 'slide-up' | 'slide-in' | 'scale-in';
  /** HTML tag for each item wrapper */
  itemAs?: 'div' | 'li' | 'article';
  /** Class for each item wrapper */
  itemClassName?: string;
}

/**
 * Renders children with staggered animation delays.
 * Each child fades/slides in one after another.
 */
export function StaggeredList({
  children,
  className,
  staggerDelay = 50,
  initialDelay = 0,
  animation = 'slide-up',
  itemAs = 'div',
  itemClassName,
}: StaggeredListProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <AnimateIn
          key={i}
          delay={initialDelay + i * staggerDelay}
          animation={animation}
          as={itemAs}
          className={itemClassName}
        >
          {child}
        </AnimateIn>
      ))}
    </div>
  );
}
