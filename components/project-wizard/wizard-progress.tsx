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
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isCompleted && 'bg-qualia-600 text-white',
                  isCurrent && 'bg-qualia-600/20 text-qualia-400 ring-2 ring-qualia-600',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    'text-sm font-medium',
                    (isCompleted || isCurrent) && 'text-foreground',
                    !isCompleted && !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn('mx-4 h-0.5 flex-1', isCompleted ? 'bg-qualia-600' : 'bg-muted')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
