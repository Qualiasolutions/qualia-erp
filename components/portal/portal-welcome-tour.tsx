'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, ArrowRight, ChevronLeft } from 'lucide-react';
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

const TOUR_STORAGE_KEY = 'qualia-portal-tour-v3';

const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 12;
const TOOLTIP_MAX_WIDTH = 380;
const TOOLTIP_GAP = 14;
const GLOW_PADDING = 4;

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
  if (spaceBottom >= 200) return 'bottom';
  if (spaceTop >= 200) return 'top';
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
      borderRadius: '16px 16px 0 0',
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

    // Focus the first element on mount
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
/* SVG Overlay                                                         */
/* ------------------------------------------------------------------ */

function SpotlightOverlay({
  rect,
  reducedMotion,
}: {
  rect: SpotlightRect;
  reducedMotion: boolean;
}) {
  const maskId = useId();
  const duration = reducedMotion ? '0ms' : '320ms';
  const easing = 'cubic-bezier(0.19, 1, 0.22, 1)'; // ease-out-expo

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
      </defs>
      {/* Tinted dark overlay */}
      <rect
        width="100%"
        height="100%"
        className="fill-[hsl(185_40%_6%_/_0.72)] dark:fill-[hsl(185_30%_4%_/_0.80)]"
        mask={`url(#${maskId})`}
      />
      {/* Glow ring around cutout */}
      <rect
        x={rect.x - GLOW_PADDING}
        y={rect.y - GLOW_PADDING}
        width={rect.width + GLOW_PADDING * 2}
        height={rect.height + GLOW_PADDING * 2}
        rx={rect.radius + GLOW_PADDING}
        ry={rect.radius + GLOW_PADDING}
        fill="none"
        stroke="hsl(174 60% 34% / 0.40)"
        strokeWidth="2"
        className="drop-shadow-[0_0_8px_hsl(174_60%_34%_/_0.25)]"
        style={{
          transition: `x ${duration} ${easing}, y ${duration} ${easing}, width ${duration} ${easing}, height ${duration} ${easing}`,
        }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Welcome Modal (Step 0)                                              */
/* ------------------------------------------------------------------ */

function WelcomeModal({
  name,
  onStart,
  onDismiss,
  exiting,
  headingId,
  logoUrl,
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
        'fixed inset-0 z-[70] flex items-center justify-center',
        'bg-[hsl(185_40%_6%_/_0.72)] dark:bg-[hsl(185_30%_4%_/_0.80)]',
        exiting
          ? 'opacity-0 transition-opacity duration-200'
          : 'animate-[fadeIn_240ms_cubic-bezier(0.19,1,0.22,1)_both]'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div
        ref={containerRef}
        className={cn(
          'relative mx-4 w-full max-w-md overflow-hidden rounded-2xl',
          'border border-primary/[0.12] bg-background shadow-2xl shadow-primary/[0.08]',
          'dark:border-primary/[0.16]',
          exiting
            ? 'scale-[0.96] opacity-0 transition-all duration-200'
            : 'animate-[zoomFadeIn_240ms_cubic-bezier(0.19,1,0.22,1)_both]'
        )}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 z-10 cursor-pointer rounded-lg p-1.5 text-muted-foreground/40 transition-colors duration-150 hover:bg-muted/50 hover:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Close tour"
        >
          <X className="size-4" />
        </button>

        <div className="px-8 pb-8 pt-12 text-center">
          {/* Client/project logo mark — falls back to first letter */}
          <div className="mx-auto mb-6 flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 ring-4 ring-primary/[0.12]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-primary-foreground">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h2 id={headingId} className="text-xl font-semibold tracking-tight text-foreground">
            Welcome, {name}
          </h2>

          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground/80">
            Your portal is ready. Let us show you around — it only takes a moment.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              onClick={onStart}
              className="h-10 w-full max-w-[200px] gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-[0_4px_12px_rgba(0,164,172,0.25)] transition-all duration-150 hover:opacity-90"
            >
              Show me around
              <ArrowRight className="size-3.5" />
            </Button>

            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[44px] cursor-pointer text-xs text-muted-foreground/60 transition-colors duration-150 hover:text-primary/70 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
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
/* Tooltip Card                                                        */
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

  const staggerDelay = reducedMotion ? 0 : 30;
  const entryDuration = reducedMotion ? '0ms' : '200ms';
  const easing = 'cubic-bezier(0.25, 1, 0.5, 1)'; // ease-out-quart

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-live="polite"
      className={cn(
        'z-[71] rounded-xl border border-primary/[0.12] bg-background/95 p-[clamp(1rem,3vw,1.5rem)] shadow-2xl shadow-primary/[0.08] backdrop-blur-lg dark:border-primary/[0.16] dark:bg-background/90',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0',
        !reducedMotion &&
          'ease-[cubic-bezier(0.25,1,0.5,1)] transition-[opacity,transform] duration-200'
      )}
      style={tooltipStyle}
    >
      {/* Eyebrow */}
      <p
        className="text-[10px] font-medium uppercase tracking-wider text-primary"
        style={{
          transitionDelay: `${staggerDelay * 0}ms`,
          transitionDuration: entryDuration,
          transitionTimingFunction: easing,
          transitionProperty: 'opacity, transform',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        Step {currentIndex + 1} of {totalSteps}
      </p>

      {/* Heading */}
      <h3
        id={headingId}
        className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl"
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
        className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
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

      {/* Progress dots */}
      <div
        className="mt-4 flex items-center gap-1.5"
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
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'block h-1.5 w-1.5 rounded-full transition-colors duration-200',
              i === currentIndex ? 'bg-primary' : 'bg-muted-foreground/20'
            )}
          />
        ))}
      </div>

      {/* Footer: Back + Skip | Next/Got it */}
      <div
        className="mt-4 flex items-center justify-between gap-3"
        style={{
          transitionDelay: `${staggerDelay * 4}ms`,
          transitionDuration: entryDuration,
          transitionTimingFunction: easing,
          transitionProperty: 'opacity, transform',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        <div className="flex items-center gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-[44px] cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-primary/70 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <ChevronLeft className="size-3" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[44px] cursor-pointer text-xs text-muted-foreground/60 transition-colors duration-150 hover:text-primary/70 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Skip
          </button>
        </div>

        <Button
          onClick={onNext}
          className="h-9 min-w-[44px] gap-1.5 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_4px_12px_rgba(0,164,172,0.25)] transition-all duration-150 hover:opacity-90"
        >
          {isLast ? (
            'Got it'
          ) : (
            <>
              Next
              <ArrowRight className="size-3" />
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

  // Filter steps by enabledApps
  const activeSteps = enabledApps
    ? TOUR_STEPS.filter((s) => enabledApps.includes(s.appKey))
    : TOUR_STEPS;

  // Further filter by DOM availability on mount
  const [resolvedSteps, setResolvedSteps] = useState<TourStepDef[]>([]);

  useEffect(() => {
    setMounted(true);
    reduced.current = prefersReducedMotion();
  }, []);

  // Check localStorage on mount
  useEffect(() => {
    if (!mounted || !enabled) return;
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setPhase('welcome'), 400);
      return () => clearTimeout(timer);
    }
  }, [mounted, enabled]);

  // Resolve which steps have visible DOM targets
  useEffect(() => {
    if (phase !== 'tour') return;

    // Small delay to let the DOM settle after welcome modal dismissed
    const timer = setTimeout(() => {
      const available = activeSteps.filter((step) => getElement(step) !== null);
      setResolvedSteps(available);
      if (available.length === 0) {
        // No targets found — dismiss gracefully
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        setPhase('done');
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [phase, activeSteps]);

  // Position spotlight whenever the current step changes
  useLayoutEffect(() => {
    if (phase !== 'tour' || resolvedSteps.length === 0) return;

    const step = resolvedSteps[currentIndex];
    if (!step) return;

    const el = getElement(step);
    if (!el) return;

    // Scroll into view if needed
    el.scrollIntoView({ behavior: reduced.current ? 'auto' : 'smooth', block: 'center' });

    // Update rect after scroll settles
    const updateRect = () => {
      const rect = el.getBoundingClientRect();
      setSpotRect(rectToSpotlight(rect));
    };

    // Slight delay to let scroll finish
    const scrollDelay = reduced.current ? 0 : 100;
    const timer = setTimeout(() => {
      updateRect();
      // Show tooltip after spotlight lands
      const tooltipDelay = reduced.current ? 0 : 200;
      setTimeout(() => setTooltipVisible(true), tooltipDelay);
    }, scrollDelay);

    return () => clearTimeout(timer);
  }, [phase, currentIndex, resolvedSteps]);

  // Track target rect on scroll/resize
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

  // Keyboard handler
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

  /* ------ Actions ------ */

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
      reduced.current ? 0 : 160
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
      reduced.current ? 0 : 200
    );
  }, []);

  const goNext = useCallback(() => {
    if (resolvedSteps.length === 0) return;

    if (currentIndex >= resolvedSteps.length - 1) {
      dismiss();
      return;
    }

    // Hide tooltip, advance, let layout effect show new one
    setTooltipVisible(false);
    setTimeout(
      () => {
        setCurrentIndex((i) => i + 1);
      },
      reduced.current ? 0 : 160
    );
  }, [currentIndex, resolvedSteps.length, dismiss]);

  const goBack = useCallback(() => {
    if (currentIndex <= 0) return;

    setTooltipVisible(false);
    setTimeout(
      () => {
        setCurrentIndex((i) => i - 1);
      },
      reduced.current ? 0 : 160
    );
  }, [currentIndex]);

  /* ------ Render ------ */

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

      {/* Keyframe definitions */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
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
        }
      `}</style>
    </>
  );

  return createPortal(content, document.body);
}
