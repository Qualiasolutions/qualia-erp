'use client';

import { Children, type ReactNode } from 'react';
import type { Variants } from 'motion/react';
import { m } from '@/lib/lazy-motion';

type GroupVariants = {
  container?: Variants;
  item?: Variants;
};

const defaultContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const defaultItem: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function AnimatedGroup({
  children,
  variants,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  variants?: GroupVariants;
  className?: string;
  as?: 'div' | 'section' | 'ul';
}) {
  const containerVariants = variants?.container ?? defaultContainer;
  const itemVariants = variants?.item ?? defaultItem;

  const MotionTag = m[Tag] as typeof m.div;

  return (
    <MotionTag
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {Children.map(children, (child, i) => (
        <m.div key={i} variants={itemVariants}>
          {child}
        </m.div>
      ))}
    </MotionTag>
  );
}
