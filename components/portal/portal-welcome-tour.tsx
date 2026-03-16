'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  FolderOpen,
  MessageSquare,
  Lightbulb,
  Receipt,
  Settings,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PortalWelcomeTourProps {
  displayName: string;
  companyName?: string | null;
}

const TOUR_STORAGE_KEY = 'qualia-portal-tour-seen';

const tourSteps = [
  {
    icon: FolderOpen,
    title: 'Projects',
    description: 'Track progress on all your active projects with real-time phase updates.',
    color: 'text-qualia-500',
    bg: 'bg-qualia-500/10',
  },
  {
    icon: MessageSquare,
    title: 'Messages',
    description: 'Communicate directly with our team — updates, questions, approvals.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Lightbulb,
    title: 'Requests',
    description: 'Submit feature requests, changes, or ideas — we track every one.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Receipt,
    title: 'Billing',
    description: 'View invoices, payment history, and outstanding balances.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Settings,
    title: 'Settings',
    description: 'Manage your profile, notification preferences, and account details.',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
  },
];

export function PortalWelcomeTour({ displayName, companyName }: PortalWelcomeTourProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<'welcome' | 'tour'>('welcome');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  };

  const startTour = () => {
    setStep('tour');
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const firstName = displayName.split(' ')[0];
  const name = companyName || firstName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={cn(
          'relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl',
          'duration-300 animate-in fade-in zoom-in-95'
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted/50 hover:text-muted-foreground"
        >
          <X className="size-4" />
        </button>

        {step === 'welcome' ? (
          /* ───── Welcome Screen ───── */
          <div className="px-8 pb-8 pt-10 text-center">
            {/* Brand mark */}
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-qualia-500/10 ring-1 ring-qualia-500/20">
              <Sparkles className="size-7 text-qualia-500" />
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome to Qualia, {name}
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              Your client portal is ready. Here you can track project progress, communicate with our
              team, submit requests, and manage billing — all in one place.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                onClick={startTour}
                className="h-10 gap-2 rounded-xl bg-qualia-500 px-6 text-sm font-medium text-white shadow-md transition-all hover:bg-qualia-600 hover:shadow-lg"
              >
                Take a quick tour
                <ArrowRight className="size-3.5" />
              </Button>

              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                Skip for now
              </button>
            </div>
          </div>
        ) : (
          /* ───── Tour Steps ───── */
          <div className="px-8 pb-8 pt-10">
            {/* Progress dots */}
            <div className="mb-8 flex items-center justify-center gap-1.5">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    i === currentStep ? 'w-6 bg-qualia-500' : 'w-1.5 bg-muted-foreground/20',
                    i < currentStep && 'w-1.5 bg-qualia-500/40'
                  )}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="text-center">
              {(() => {
                const s = tourSteps[currentStep];
                const Icon = s.icon;
                return (
                  <div
                    key={currentStep}
                    className="duration-200 animate-in fade-in slide-in-from-right-4"
                  >
                    <div
                      className={cn(
                        'mx-auto mb-5 flex size-14 items-center justify-center rounded-xl',
                        s.bg
                      )}
                    >
                      <Icon className={cn('size-6', s.color)} />
                    </div>

                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {s.title}
                    </h3>
                    <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <span className="text-xs tabular-nums text-muted-foreground/50">
                {currentStep + 1} of {tourSteps.length}
              </span>

              <Button
                onClick={nextStep}
                className="h-9 gap-1.5 rounded-xl bg-qualia-500 px-5 text-sm font-medium text-white transition-all hover:bg-qualia-600"
              >
                {currentStep < tourSteps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="size-3" />
                  </>
                ) : (
                  'Get started'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
