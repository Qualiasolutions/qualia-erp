'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  name: string;
  description: string;
}

interface WizardProgressProps {
  steps: Step[];
  currentStep: number;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex items-center gap-3">
              {/* Step indicator */}
              <div
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300',
                  isCompleted &&
                    'bg-gradient-to-br from-qualia-500 to-qualia-600 text-white shadow-lg shadow-qualia-600/30',
                  isCurrent && 'bg-qualia-600/10 text-qualia-500 ring-2 ring-qualia-500/50',
                  !isCompleted && !isCurrent && 'bg-muted/50 text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" strokeWidth={2.5} /> : step.id}
                {isCurrent && (
                  <div className="absolute -inset-1 animate-pulse rounded-xl bg-qualia-500/20" />
                )}
              </div>

              {/* Step text */}
              <div className="hidden min-w-0 sm:block">
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isCompleted && 'text-qualia-500',
                    isCurrent && 'text-foreground',
                    !isCompleted && !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </p>
                <p className="truncate text-xs text-muted-foreground/70">{step.description}</p>
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="mx-3 flex flex-1 items-center">
                <div
                  className={cn(
                    'h-0.5 w-full rounded-full transition-all duration-500',
                    isCompleted ? 'bg-gradient-to-r from-qualia-500 to-qualia-400' : 'bg-muted/50'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
