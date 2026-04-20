'use client';

import { LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';

// Async import = true lazy loading — motion is NOT in the initial JS bundle
const loadFeatures = () => import('motion/react').then((mod) => mod.domAnimation);

export function LazyMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}

// Re-export m from motion/react to avoid pulling in the full motion bundle.
// m is the proxy for LazyMotion-compatible components (m.div, m.span, etc.).
export { m, AnimatePresence } from 'motion/react';
