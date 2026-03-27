'use client';

import { m, AnimatePresence } from '@/lib/lazy-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className="h-full w-full"
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

// Simpler fade-only variant for modals and overlays
export function FadeTransition({ children }: PageTransitionProps) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </m.div>
  );
}
