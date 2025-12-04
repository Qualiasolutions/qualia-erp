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
            <div className="flex items-center gap-2">
              {/* Step indicator */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-all',
                  isCompleted && 'bg-qualia-500 text-white',
                  isCurrent && 'bg-qualia-500/15 text-qualia-500 ring-2 ring-qualia-500/40',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step.id}
              </div>

              {/* Step text - hidden on small screens */}
              <p
                className={cn(
                  'hidden text-sm font-medium md:block',
                  isCompleted && 'text-qualia-500',
                  isCurrent && 'text-foreground',
                  !isCompleted && !isCurrent && 'text-muted-foreground'
                )}
              >
                {step.name}
              </p>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="mx-2 flex flex-1 items-center md:mx-3">
                <div
                  className={cn(
                    'h-0.5 w-full rounded-full transition-all',
                    isCompleted ? 'bg-qualia-500' : 'bg-border'
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
