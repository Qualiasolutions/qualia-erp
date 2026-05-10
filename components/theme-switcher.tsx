'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type CurtainPhase = 'idle' | 'falling' | 'rising';
type Resolved = 'light' | 'dark';

const DURATION = 520;
const EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';

/**
 * Click-to-toggle theme switcher with a curtain reveal.
 *
 * A full-viewport panel slides down from the top, the underlying theme is
 * swapped while the page is hidden, then the panel slides back up to reveal
 * the new theme. Curtain color is bound to `--background` of the destination
 * theme so the transition reads as one continuous wash, not a flash.
 */
const ThemeSwitcher = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<CurtainPhase>('idle');
  const curtainColorRef = useRef<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const current: Resolved = resolvedTheme === 'dark' ? 'dark' : 'light';
  const next: Resolved = current === 'dark' ? 'light' : 'dark';

  const handleClick = useCallback(() => {
    if (phase !== 'idle') return;

    if (typeof window !== 'undefined') {
      const probe = document.createElement('div');
      probe.style.position = 'fixed';
      probe.style.opacity = '0';
      probe.style.pointerEvents = 'none';
      probe.classList.add(next === 'dark' ? 'dark' : 'light');
      probe.style.background = 'hsl(var(--background))';
      document.body.appendChild(probe);
      curtainColorRef.current =
        getComputedStyle(probe).backgroundColor || (next === 'dark' ? '#0d1416' : '#edf0f0');
      probe.remove();
    }

    setPhase('falling');
    window.setTimeout(() => {
      setTheme(next);
      setPhase('rising');
      window.setTimeout(() => setPhase('idle'), DURATION + 40);
    }, DURATION);
  }, [phase, next, setTheme]);

  const curtainStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: curtainColorRef.current,
    transformOrigin: 'top',
    transform: phase === 'falling' ? 'scaleY(1)' : 'scaleY(0)',
    transition: phase !== 'idle' ? `transform ${DURATION}ms ${EASING}` : 'none',
    zIndex: 60,
    pointerEvents: 'none',
  };

  if (!mounted) {
    // Reserve identical width so sidebar doesn't shift when JS hydrates.
    return <div className="size-8 shrink-0" aria-hidden />;
  }

  const Icon = current === 'dark' ? Sun : Moon;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={phase !== 'idle'}
        aria-label={current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={current === 'dark'}
        title={current === 'dark' ? 'Light mode' : 'Dark mode'}
        className={cn(
          'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg',
          'text-muted-foreground transition-colors duration-150',
          'hover:bg-muted/55 hover:text-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'disabled:cursor-default disabled:opacity-60'
        )}
      >
        <Icon className="size-[15px]" />
      </button>
      {typeof window !== 'undefined' && phase !== 'idle'
        ? createPortal(<div aria-hidden style={curtainStyle} />, document.body)
        : null}
    </>
  );
};

export { ThemeSwitcher };
