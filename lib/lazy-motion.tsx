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

export { m } from 'framer-motion';
export { AnimatePresence } from 'framer-motion';
