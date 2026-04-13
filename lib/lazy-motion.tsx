'use client';

import { LazyMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// Async import = true lazy loading — framer-motion is NOT in the initial JS bundle
const loadFeatures = () => import('framer-motion').then((mod) => mod.domAnimation);

export function LazyMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}

// Re-export m from the mini entry point to avoid pulling in the full framer-motion bundle.
// framer-motion/m exports the m proxy as the module namespace (m.div, m.span, etc.).
export { m, AnimatePresence } from 'framer-motion';
