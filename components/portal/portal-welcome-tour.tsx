'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PortalWelcomeTourProps {
  displayName: string;
  companyName?: string | null;
  enabledApps?: string[];
  logoUrl?: string | null;
  enabled?: boolean;
}

interface TourStepDef {
  selector: string;
  fallbackSelector: string;
  title: string;
  body: string;
  appKey: string;
}

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

type TooltipPlacement = 'right' | 'left' | 'bottom' | 'top';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const TOUR_STORAGE_KEY = 'qualia-portal-tour-v4';

const SPOTLIGHT_PADDING = 10;
const SPOTLIGHT_RADIUS = 14;
const TOOLTIP_MAX_WIDTH = 400;
const TOOLTIP_GAP = 18;
const GLOW_PADDING = 6;

const TOUR_STEPS: TourStepDef[] = [
  {
    selector: '[data-tour="projects-grid"]',
    fallbackSelector: 'a[href="/projects"]',
    title: 'Your projects',
    body: "See every project's phase, milestone progress, and status at a glance.",
    appKey: 'projects',
  },
  {
    selector: '[data-tour="tasks-nav"]',
    fallbackSelector: 'a[href="/tasks"]',
    title: 'Tasks & action items',
    body: "Track what's pending on your side. We flag items that need your input.",
    appKey: 'tasks',
  },
  {
    selector: '[data-tour="files-nav"]',
    fallbackSelector: 'a[href="/files"]',
    title: 'Files in one place',
    body: 'Upload briefs, view deliverables, download invoices — zero email attachments.',
    appKey: 'files',
  },
  {
    selector: '[data-tour="messages-nav"]',
    fallbackSelector: 'a[href="/messages"]',
    title: 'Talk to us',
    body: 'Direct messaging with our team, organized by project.',
    appKey: 'messages',
  },
  {
    selector: '[data-tour="requests-nav"]',
    fallbackSelector: 'a[href="/requests"]',
    title: 'Request anything',
    body: "Got an idea or change request? Submit it here — we'll prioritize it.",
    appKey: 'requests',
  },
  {
    selector: '[data-tour="settings-nav"]',
    fallbackSelector: 'a[href="/settings"]',
    title: 'Make it yours',
    body: 'Update your notification preferences and profile anytime.',
    appKey: 'settings',
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getElement(step: TourStepDef): Element | null {
  return document.querySelector(step.selector) || document.querySelector(step.fallbackSelector);
}

function rectToSpotlight(rect: DOMRect): SpotlightRect {
  return {
    x: rect.x - SPOTLIGHT_PADDING,
    y: rect.y - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
    radius: SPOTLIGHT_RADIUS,
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function computePlacement(
  spotRect: SpotlightRect,
  viewportW: number,
  viewportH: number
): TooltipPlacement {
  const spaceRight = viewportW - (spotRect.x + spotRect.width + TOOLTIP_GAP);
  const spaceLeft = spotRect.x - TOOLTIP_GAP;
  const spaceBottom = viewportH - (spotRect.y + spotRect.height + TOOLTIP_GAP);
  const spaceTop = spotRect.y - TOOLTIP_GAP;

  if (spaceRight >= TOOLTIP_MAX_WIDTH) return 'right';
  if (spaceLeft >= TOOLTIP_MAX_WIDTH) return 'left';
  if (spaceBottom >= 220) return 'bottom';
  if (spaceTop >= 220) return 'top';
  return 'bottom';
}

function getTooltipStyle(
  spotRect: SpotlightRect,
  placement: TooltipPlacement,
  viewportW: number,
  isMobile: boolean
): React.CSSProperties {
  if (isMobile) {
    return {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      maxWidth: '100%',
      borderRadius: '20px 20px 0 0',
    };
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    maxWidth: TOOLTIP_MAX_WIDTH,
    width: 'max-content',
  };

  switch (placement) {
    case 'right':
      style.left = spotRect.x + spotRect.width + TOOLTIP_GAP;
      style.top = spotRect.y;
      break;
    case 'left':
      style.right = viewportW - spotRect.x + TOOLTIP_GAP;
      style.top = spotRect.y;
      break;
    case 'bottom':
      style.left = Math.max(16, Math.min(spotRect.x, viewportW - TOOLTIP_MAX_WIDTH - 16));
      style.top = spotRect.y + spotRect.height + TOOLTIP_GAP;
      break;
    case 'top':
      style.left = Math.max(16, Math.min(spotRect.x, viewportW - TOOLTIP_MAX_WIDTH - 16));
      style.bottom = window.innerHeight - spotRect.y + TOOLTIP_GAP;
      break;
  }

  return style;
}

/* ------------------------------------------------------------------ */
/* Focus trap                                                          */
/* ------------------------------------------------------------------ */

function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusables = container.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, containerRef]);
}

/* ------------------------------------------------------------------ */
/* SVG Overlay — multi-layer glow, breathing pulse                     */
/* ------------------------------------------------------------------ */

function SpotlightOverlay({
  rect,
  reducedMotion,
}: {
  rect: SpotlightRect;
  reducedMotion: boolean;
}) {
  const maskId = useId();
  const glowId = useId();
  const duration = reducedMotion ? '0ms' : '420ms';
  const easing = 'cubic-bezier(0.19, 1, 0.22, 1)';

  return (
    <svg className="pointer-events-none fixed inset-0 z-[70] h-screen w-screen" aria-hidden="true">
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx={rect.radius}
            ry={rect.radius}
            fill="black"
            style={{
              transition: `x ${duration} ${easing}, y ${duration} ${easing}, width ${duration} ${easing}, height ${duration} ${easing}`,
            }}
          />
        </mask>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(174 70% 45%)" stopOpacity="0.55" />
          <stop offset="60%" stopColor="hsl(174 70% 45%)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(174 70% 45%)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Backdrop — deeper, more cinematic */}
      <rect
        width="100%"
        height="100%"
        className="fill-[hsl(195_45%_4%_/_0.82)] dark:fill-[hsl(195_50%_3%_/_0.88)]"
        mask={`url(#${maskId})`}
      />

      {/* Outer ambient glow */}
      <rect
        x={rect.x - 32}
        y={rect.y - 32}
        width={rect.width + 64}
        height={rect.height + 64}
        rx={rect.radius + 16}
        ry={rect.radius + 16}
        fill={`url(#${glowId})`}
        style={{
          mixBlendMode: 'screen',
          opacity: 0.7,
          transition: `x ${duration} ${easing}, y ${duration} ${easing}, width ${duration} ${easing}, height ${duration} ${easing}`,
        }}
        className={reducedMotion ? '' : 'animate-[spotlightPulse_2.8s_ease-in-out_infinite]'}
      />

      {/* Inner crisp ring */}
      <rect
        x={rect.x - 1}
        y={rect.y - 1}
        width={rect.width + 2}
        height={rect.height + 2}
        rx={rect.radius + 1}
        ry={rect.radius + 1}
        fill="none"
        stroke="hsl(174 75% 55% / 0.85)"
        strokeWidth="1.5"
        style={{
          transition: `x ${duration} ${easing}, y ${duration} ${easing}, width ${duration} ${easing}, height ${duration} ${easing}`,
        }}
      />

      {/* Outer soft halo */}
      <rect
        x={rect.x - GLOW_PADDING}
        y={rect.y - GLOW_PADDING}
        width={rect.width + GLOW_PADDING * 2}
        height={rect.height + GLOW_PADDING * 2}
        rx={rect.radius + GLOW_PADDING}
        ry={rect.radius + GLOW_PADDING}
        fill="none"
        stroke="hsl(174 60% 50% / 0.25)"
        strokeWidth="3"
        style={{
          transition: `x ${duration} ${easing}, y ${duration} ${easing}, width ${duration} ${easing}, height ${duration} ${easing}`,
        }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Welcome Modal — refined, no gradient blob                           */
/* ------------------------------------------------------------------ */

function WelcomeModal({
  name,
  onStart,
  onDismiss,
  exiting,
  headingId,
}: {
  name: string;
  onStart: () => void;
  onDismiss: () => void;
  exiting: boolean;
  headingId: string;
  logoUrl?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, !exiting);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-md',
        'bg-[hsl(195_45%_4%_/_0.78)] dark:bg-[hsl(195_50%_3%_/_0.88)]',
        exiting
          ? 'opacity-0 transition-opacity duration-200'
          : 'animate-[fadeIn_320ms_cubic-bezier(0.19,1,0.22,1)_both]'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div
        ref={containerRef}
        className={cn(
          'relative mx-4 w-full max-w-[440px] overflow-hidden rounded-[20px]',
          'border border-primary/[0.18] bg-background/95 backdrop-blur-xl',
          'shadow-[0_32px_80px_-12px_hsl(var(--primary)/0.22),0_0_0_1px_hsl(var(--primary)/0.04)]',
          'dark:border-primary/[0.20]',
          exiting
            ? 'scale-[0.96] opacity-0 transition-all duration-200'
            : 'animate-[zoomFadeIn_380ms_cubic-bezier(0.19,1,0.22,1)_both]'
        )}
      >
        {/* Top accent bar */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Close — text glyph, no lucide */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground/50 transition-colors duration-150 hover:bg-muted/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Close tour"
        >
          <span className="text-[15px] leading-none">×</span>
        </button>

        <div className="px-9 pb-9 pt-12 text-center">
          {/* Refined wordmark — Q monogram in a soft glow ring, no gradient blob */}
          <div className="relative mx-auto mb-7 flex h-16 w-16 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full bg-primary/10 blur-xl"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 rounded-full ring-1 ring-primary/25"
              aria-hidden="true"
            />
            <div
              className="absolute inset-1.5 rounded-full ring-1 ring-primary/15"
              aria-hidden="true"
            />
            <svg
              viewBox="0 0 32 32"
              className="relative size-8 text-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="11" />
              <line x1="22" y1="22" x2="27" y2="27" strokeLinecap="round" />
            </svg>
          </div>

          {/* Eyebrow */}
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary/80">
            Welcome aboard
          </p>

          <h2
            id={headingId}
            className="mt-2.5 text-[22px] font-semibold leading-tight tracking-tight text-foreground"
          >
            Hello, {name}
          </h2>

          <p className="mx-auto mt-3 max-w-[300px] text-[13.5px] leading-relaxed text-muted-foreground">
            Your portal is ready. A quick walkthrough so you know where everything lives.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              onClick={onStart}
              className="group h-11 w-full max-w-[220px] gap-1.5 rounded-xl bg-primary text-[13px] font-medium text-primary-foreground shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.45)] transition-all duration-200 hover:shadow-[0_8px_28px_-4px_hsl(var(--primary)/0.55)] hover:brightness-110"
            >
              Show me around
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </Button>

            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[44px] cursor-pointer text-[12px] text-muted-foreground/55 transition-colors duration-150 hover:text-foreground/80 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              I&apos;ll explore later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip Card — progress bar, refined glass                          */
/* ------------------------------------------------------------------ */

function TooltipCard({
  step,
  currentIndex,
  totalSteps,
  spotRect,
  onNext,
  onBack,
  onSkip,
  visible,
  reducedMotion,
}: {
  step: TourStepDef;
  currentIndex: number;
  totalSteps: number;
  spotRect: SpotlightRect;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  visible: boolean;
  reducedMotion: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const placement = computePlacement(
    spotRect,
    typeof window !== 'undefined' ? window.innerWidth : 1024,
    typeof window !== 'undefined' ? window.innerHeight : 768
  );

  const tooltipStyle = getTooltipStyle(
    spotRect,
    placement,
    typeof window !== 'undefined' ? window.innerWidth : 1024,
    isMobile
  );

  useFocusTrap(containerRef, visible);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  const staggerDelay = reducedMotion ? 0 : 40;
  const entryDuration = reducedMotion ? '0ms' : '260ms';
  const easing = 'cubic-bezier(0.19, 1, 0.22, 1)';

  const progressPct = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-live="polite"
      className={cn(
        'z-[71] overflow-hidden rounded-[18px] p-[clamp(1.1rem,3vw,1.6rem)]',
        'bg-background/92 border border-primary/[0.18] backdrop-blur-2xl',
        'shadow-[0_32px_80px_-12px_hsl(var(--primary)/0.22),0_0_0_1px_hsl(var(--primary)/0.04)]',
        'dark:border-primary/[0.22] dark:bg-background/85',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1.5 opacity-0',
        !reducedMotion && 'duration-[260ms] transition-[opacity,transform]'
      )}
      style={{
        ...tooltipStyle,
        transitionTimingFunction: easing,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden="true"
      />

      {/* Header row: step counter + skip */}
      <div
        className="flex items-center justify-between"
        style={{
          transitionDelay: `${staggerDelay * 0}ms`,
          transitionDuration: entryDuration,
          transitionTimingFunction: easing,
          transitionProperty: 'opacity, transform',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
          {String(currentIndex + 1).padStart(2, '0')}
          <span className="mx-1.5 text-muted-foreground/40">/</span>
          <span className="text-muted-foreground/60">{String(totalSteps).padStart(2, '0')}</span>
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="cursor-pointer text-[11px] text-muted-foreground/55 transition-colors duration-150 hover:text-foreground/80 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          Skip tour
        </button>
      </div>

      {/* Heading */}
      <h3
        id={headingId}
        className="mt-3 text-[19px] font-semibold leading-tight tracking-tight text-foreground sm:text-[21px]"
        style={{
          transitionDelay: `${staggerDelay * 1}ms`,
          transitionDuration: entryDuration,
          transitionTimingFunction: easing,
          transitionProperty: 'opacity, transform',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        {step.title}
      </h3>

      {/* Description */}
      <p
        className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground"
        style={{
          transitionDelay: `${staggerDelay * 2}ms`,
          transitionDuration: entryDuration,
          transitionTimingFunction: easing,
          transitionProperty: 'opacity, transform',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        {step.body}
      </p>

      {/* Progress bar */}
      <div
        className="bg-muted-foreground/12 mt-5 h-[3px] w-full overflow-hidden rounded-full"
        style={{
          transitionDelay: `${staggerDelay * 3}ms`,
          transitionDuration: entryDuration,
          transitionTimingFunction: easing,
          transitionProperty: 'opacity, transform',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
        }}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
          style={{
            width: `${progressPct}%`,
            transition: 'width 380ms cubic-bezier(0.19, 1, 0.22, 1)',
          }}
        />
      </div>

      {/* Footer */}
      <div
        className="mt-5 flex items-center justify-between gap-3"
        style={{
          transitionDelay: `${staggerDelay * 4}ms`,
          transitionDuration: entryDuration,
          transitionTimingFunction: easing,
          transitionProperty: 'opacity, transform',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        {!isFirst ? (
          <button
            type="button"
            onClick={onBack}
            className="group flex min-h-[40px] cursor-pointer items-center gap-1 text-[12px] font-medium text-muted-foreground/75 transition-colors duration-150 hover:text-foreground focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
              ←
            </span>
            Back
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        <Button
          onClick={onNext}
          className="group h-9 min-w-[110px] gap-1.5 rounded-xl bg-primary px-5 text-[12.5px] font-medium text-primary-foreground shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.45)] transition-all duration-200 hover:shadow-[0_8px_28px_-4px_hsl(var(--primary)/0.55)] hover:brightness-110"
        >
          {isLast ? (
            'Got it'
          ) : (
            <>
              Next
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Click-blocker                                                       */
/* ------------------------------------------------------------------ */

function ClickBlocker() {
  return (
    <div
      className="fixed inset-0 z-[69]"
      aria-hidden="true"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Main Tour Component                                                 */
/* ------------------------------------------------------------------ */

export function PortalWelcomeTour({
  displayName,
  companyName,
  enabledApps,
  logoUrl,
  enabled = true,
}: PortalWelcomeTourProps) {
  const [phase, setPhase] = useState<'hidden' | 'welcome' | 'tour' | 'done'>('hidden');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spotRect, setSpotRect] = useState<SpotlightRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    radius: SPOTLIGHT_RADIUS,
  });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [welcomeExiting, setWelcomeExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const welcomeHeadingId = useId();
  const reduced = useRef(false);

  const activeSteps = enabledApps
    ? TOUR_STEPS.filter((s) => enabledApps.includes(s.appKey))
    : TOUR_STEPS;

  const [resolvedSteps, setResolvedSteps] = useState<TourStepDef[]>([]);

  useEffect(() => {
    setMounted(true);
    reduced.current = prefersReducedMotion();
  }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setPhase('welcome'), 400);
      return () => clearTimeout(timer);
    }
  }, [mounted, enabled]);

  useEffect(() => {
    if (phase !== 'tour') return;

    const timer = setTimeout(() => {
      const available = activeSteps.filter((step) => getElement(step) !== null);
      setResolvedSteps(available);
      if (available.length === 0) {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        setPhase('done');
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [phase, activeSteps]);

  useLayoutEffect(() => {
    if (phase !== 'tour' || resolvedSteps.length === 0) return;

    const step = resolvedSteps[currentIndex];
    if (!step) return;

    const el = getElement(step);
    if (!el) return;

    el.scrollIntoView({ behavior: reduced.current ? 'auto' : 'smooth', block: 'center' });

    const updateRect = () => {
      const rect = el.getBoundingClientRect();
      setSpotRect(rectToSpotlight(rect));
    };

    const scrollDelay = reduced.current ? 0 : 100;
    const timer = setTimeout(() => {
      updateRect();
      const tooltipDelay = reduced.current ? 0 : 220;
      setTimeout(() => setTooltipVisible(true), tooltipDelay);
    }, scrollDelay);

    return () => clearTimeout(timer);
  }, [phase, currentIndex, resolvedSteps]);

  useEffect(() => {
    if (phase !== 'tour' || resolvedSteps.length === 0) return;

    const step = resolvedSteps[currentIndex];
    if (!step) return;

    const el = getElement(step);
    if (!el) return;

    const updateRect = () => {
      const rect = el.getBoundingClientRect();
      setSpotRect(rectToSpotlight(rect));
    };

    const observer = new ResizeObserver(updateRect);
    observer.observe(el);

    window.addEventListener('scroll', updateRect, { passive: true });
    window.addEventListener('resize', updateRect, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateRect);
      window.removeEventListener('resize', updateRect);
    };
  }, [phase, currentIndex, resolvedSteps]);

  useEffect(() => {
    if (phase === 'hidden' || phase === 'done') return;

    function handleKeyDown(e: KeyboardEvent) {
      if (phase === 'welcome') {
        if (e.key === 'Escape') {
          dismiss();
        }
        return;
      }

      if (phase === 'tour') {
        if (e.key === 'Escape') {
          dismiss();
        } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault();
          goNext();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goBack();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const dismiss = useCallback(() => {
    if (phase === 'welcome') {
      setWelcomeExiting(true);
      setTimeout(() => {
        setPhase('done');
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      }, 200);
      return;
    }

    setTooltipVisible(false);
    setTimeout(
      () => {
        setPhase('done');
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      },
      reduced.current ? 0 : 180
    );
  }, [phase]);

  const startTour = useCallback(() => {
    setWelcomeExiting(true);
    setTimeout(
      () => {
        setPhase('tour');
        setCurrentIndex(0);
        setWelcomeExiting(false);
      },
      reduced.current ? 0 : 220
    );
  }, []);

  const goNext = useCallback(() => {
    if (resolvedSteps.length === 0) return;

    if (currentIndex >= resolvedSteps.length - 1) {
      dismiss();
      return;
    }

    setTooltipVisible(false);
    setTimeout(
      () => {
        setCurrentIndex((i) => i + 1);
      },
      reduced.current ? 0 : 180
    );
  }, [currentIndex, resolvedSteps.length, dismiss]);

  const goBack = useCallback(() => {
    if (currentIndex <= 0) return;

    setTooltipVisible(false);
    setTimeout(
      () => {
        setCurrentIndex((i) => i - 1);
      },
      reduced.current ? 0 : 180
    );
  }, [currentIndex]);

  if (phase === 'hidden' || phase === 'done' || !mounted) return null;

  const firstName = displayName.split(' ')[0];
  const name = companyName || firstName;

  const content = (
    <>
      {phase === 'welcome' && (
        <WelcomeModal
          name={name}
          onStart={startTour}
          onDismiss={dismiss}
          exiting={welcomeExiting}
          headingId={welcomeHeadingId}
          logoUrl={logoUrl}
        />
      )}

      {phase === 'tour' && resolvedSteps.length > 0 && (
        <>
          <ClickBlocker />
          <SpotlightOverlay rect={spotRect} reducedMotion={reduced.current} />
          <TooltipCard
            step={resolvedSteps[currentIndex]}
            currentIndex={currentIndex}
            totalSteps={resolvedSteps.length}
            spotRect={spotRect}
            onNext={goNext}
            onBack={goBack}
            onSkip={dismiss}
            visible={tooltipVisible}
            reducedMotion={reduced.current}
          />
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spotlightPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.85; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes fadeIn {
            from { opacity: 1; }
            to { opacity: 1; }
          }
          @keyframes zoomFadeIn {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes spotlightPulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 0.7; }
          }
        }
      `}</style>
    </>
  );

  return createPortal(content, document.body);
}
