'use client';

import Image from 'next/image';
import { m } from '@/lib/lazy-motion';

export function LoginLeftPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[#071314] lg:flex lg:w-1/2">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'linear-gradient(135deg, hsl(188 28% 5%) 0%, hsl(188 22% 8%) 55%, hsl(180 64% 16%) 100%)',
        }}
        aria-hidden
      />

      {/* Content Overlay */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between p-12">
        {/* Logo — top left */}
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <Image
            src="/logo.webp"
            alt="Qualia Solutions"
            width={40}
            height={40}
            className="rounded-lg"
            priority
          />
          <span className="text-sm font-semibold uppercase text-white/90">Qualia Suite</span>
        </m.div>

        {/* Center Content */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl font-bold leading-[1.1] text-white xl:text-6xl">
              Qualia Portal
            </h1>
            <div className="mx-auto mt-6 h-0.5 w-16 rounded-full bg-primary" />
            <p className="mx-auto mt-6 max-w-xs text-lg leading-relaxed text-white/50">
              Track your projects and stay connected with your team.
            </p>
          </m.div>
        </div>

        {/* Footer */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center gap-6 text-sm text-white/40"
        >
          <span>Nicosia, Cyprus</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <a href="https://qualiasolutions.net" className="transition-colors hover:text-primary">
            qualiasolutions.net
          </a>
        </m.div>
      </div>
    </div>
  );
}
