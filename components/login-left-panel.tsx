'use client';

import Image from 'next/image';
import { m } from '@/lib/lazy-motion';

export function LoginLeftPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[#0a1a1f] lg:flex lg:w-1/2">
      {/* Animated Gradient Mesh */}
      <div className="absolute inset-0">
        <m.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%]"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, rgba(0,164,172,0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(0,180,200,0.1) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(0,164,172,0.08) 0%, transparent 60%)
            `,
          }}
        />
      </div>

      {/* Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Rotating rings */}
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <svg width="600" height="600" viewBox="0 0 600 600" fill="none">
            <circle cx="300" cy="300" r="250" stroke="rgba(0,164,172,0.1)" strokeWidth="1" />
            <circle
              cx="300"
              cy="300"
              r="200"
              stroke="rgba(0,164,172,0.08)"
              strokeWidth="1"
              strokeDasharray="8 8"
            />
            <circle cx="300" cy="300" r="150" stroke="rgba(0,164,172,0.06)" strokeWidth="1" />
          </svg>
        </m.div>

        {/* Floating elements */}
        <m.div
          animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[20%] top-[15%] h-32 w-32 rounded-full border border-qualia-400/20"
        />
        <m.div
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute left-[15%] top-[60%] h-4 w-4 rounded-full bg-primary/30 blur-sm"
        />
        <m.div
          animate={{ y: [0, -15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute right-[20%] top-[25%] h-20 w-20 rotate-45 rounded-xl border border-cyan-400/15"
        />
        <m.div
          animate={{ y: [0, 25, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute bottom-[20%] right-[25%] h-6 w-6 rounded-full bg-primary/20"
        />
        <m.div
          animate={{ rotate: [0, 180, 360] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute right-[10%] top-[45%] h-16 w-16 border border-qualia-400/10"
        />

        {/* Glowing orb */}
        <m.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-qualia-500/20 to-cyan-500/10 blur-3xl"
        />
      </div>

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
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/90">
            Qualia Suite
          </span>
        </m.div>

        {/* Center Content */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white xl:text-6xl">
              Qualia Portal
            </h1>
            <div className="mx-auto mt-6 h-0.5 w-16 rounded-full bg-gradient-to-r from-qualia-400 to-cyan-400" />
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
