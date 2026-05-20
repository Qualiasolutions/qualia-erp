'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, m } from '@/lib/lazy-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface CarouselProject {
  id: string;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  submitHref?: string;
  onSubmit?: () => void;
}

interface ProjectSubmitCarouselProps {
  projects: CarouselProject[];
  intervalMs?: number;
  className?: string;
}

export function ProjectSubmitCarousel({
  projects,
  intervalMs = 6000,
  className,
}: ProjectSubmitCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || projects.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % projects.length);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, projects.length, intervalMs]);

  if (projects.length === 0) return null;

  const safeIndex = Math.min(index, projects.length - 1);
  const current = projects[safeIndex];

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_0_hsl(var(--border)/0.45)]',
        'p-5 md:p-6',
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <m.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            {current.accentColor ? (
              <div
                className="h-2 w-12 rounded-full"
                style={{ backgroundColor: current.accentColor }}
              />
            ) : (
              <div className="h-2 w-12 rounded-full bg-primary" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Submit work
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{current.name}</h3>
            {current.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {current.submitHref ? (
              <Button asChild size="lg">
                <Link href={current.submitHref}>Submit for {current.name}</Link>
              </Button>
            ) : current.onSubmit ? (
              <Button size="lg" onClick={current.onSubmit}>
                Submit for {current.name}
              </Button>
            ) : null}
          </div>
        </m.div>
      </AnimatePresence>

      {projects.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous project"
            className="rounded-full bg-background/80 p-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setIndex((i) => (i - 1 + projects.length) % projects.length)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {projects.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Go to ${p.name}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === safeIndex
                    ? 'w-6 bg-foreground'
                    : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next project"
            className="rounded-full bg-background/80 p-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setIndex((i) => (i + 1) % projects.length)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
