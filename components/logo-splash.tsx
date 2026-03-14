'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export function LogoSplash() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Check if user has seen splash before in this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setIsVisible(false);
      return;
    }

    // Start fade out after animation completes
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
        sessionStorage.setItem('hasSeenSplash', 'true');
      }, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo with animation */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-primary/20 blur-3xl" />

          {/* Logo container with animations */}
          <div className="animate-logo-entrance relative">
            <Image
              src="/logo.webp"
              alt="Qualia Solutions"
              width={120}
              height={120}
              className="rounded-2xl shadow-2xl"
              priority
            />

            {/* Shine effect */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="animate-shine absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
        </div>

        {/* Text with staggered animation */}
        <div className="animate-text-entrance text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Qualia Solutions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Internal Suite</p>
        </div>

        {/* Loading indicator */}
        <div className="animate-dots-entrance flex gap-1.5">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
