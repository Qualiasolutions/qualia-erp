'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, ArrowRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PortalWelcomeTourProps {
  displayName: string;
  companyName?: string | null;
}

const TOUR_STORAGE_KEY = 'qualia-portal-tour-v2';

const tourSteps = [
  {
    title: 'Track your projects',
    description:
      'See real-time progress on every project — phases, milestones, and status updates as they happen.',
  },
  {
    title: 'Submit requests',
    description:
      "Got an idea or need a change? Submit a request and we'll prioritize it in your roadmap.",
  },
  {
    title: 'View invoices & billing',
    description: 'Access all your invoices, check payment status, and download records anytime.',
  },
  {
    title: 'Upload files & stay in sync',
    description:
      'Share files with us directly from your project page. No email attachments needed.',
  },
];

export function PortalWelcomeTour({ displayName, companyName }: PortalWelcomeTourProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<'welcome' | 'tour'>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }, 200);
  }, []);

  if (!visible) return null;

  const firstName = displayName.split(' ')[0];
  const name = companyName || firstName;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-200',
        exiting ? 'opacity-0' : 'opacity-100 duration-300 animate-in fade-in'
      )}
    >
      <div
        className={cn(
          'relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-primary/[0.12] bg-[#EDF0F0] shadow-2xl shadow-primary/[0.08] transition-all duration-200 dark:border-primary/[0.16] dark:bg-[#121819]',
          exiting ? 'scale-95 opacity-0' : 'duration-300 animate-in fade-in zoom-in-95'
        )}
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground"
        >
          <X className="size-4" />
        </button>

        {step === 'welcome' ? (
          <div className="px-8 pb-8 pt-12 text-center">
            {/* Qualia logo mark */}
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 ring-4 ring-primary/[0.12]">
              <span className="text-xl font-bold text-white">Q</span>
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Welcome, {name}
            </h2>

            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground/80">
              Your client portal is ready. Track projects, submit requests, and manage everything in
              one place.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                onClick={() => setStep('tour')}
                className="h-10 w-full max-w-[200px] gap-2 rounded-xl bg-primary text-sm font-medium text-white shadow-[0_4px_12px_rgba(0,164,172,0.25)] transition-all hover:opacity-90"
              >
                Show me around
                <ArrowRight className="size-3.5" />
              </Button>

              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-muted-foreground/60 transition-colors hover:text-primary/70"
              >
                I&apos;ll explore on my own
              </button>
            </div>
          </div>
        ) : (
          <div className="px-8 pb-8 pt-10">
            {/* Progress bar */}
            <div className="mb-8 flex gap-1.5">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    i <= currentStep ? 'bg-primary' : 'bg-primary/[0.08]'
                  )}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="min-h-[120px]">
              <div
                key={currentStep}
                className="duration-200 animate-in fade-in slide-in-from-right-2"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-primary">
                  Step {currentStep + 1} of {tourSteps.length}
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                  {tourSteps[currentStep].title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/80">
                  {tourSteps[currentStep].description}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                className={cn(
                  'flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary/70',
                  currentStep === 0 && 'invisible'
                )}
              >
                <ChevronLeft className="size-3" />
                Back
              </button>

              <Button
                onClick={() => {
                  if (currentStep < tourSteps.length - 1) {
                    setCurrentStep((s) => s + 1);
                  } else {
                    dismiss();
                  }
                }}
                className="h-9 gap-1.5 rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-[0_4px_12px_rgba(0,164,172,0.25)] transition-all hover:opacity-90"
              >
                {currentStep < tourSteps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="size-3" />
                  </>
                ) : (
                  "Let's go"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
