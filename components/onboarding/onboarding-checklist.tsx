'use client';

import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  onComplete?: () => void;
  className?: string;
}

export function OnboardingChecklist({ steps, onComplete, className }: OnboardingChecklistProps) {
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allComplete = completedCount === steps.length;

  return (
    <Card className={cn('border-primary/30', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Getting Started
        </CardTitle>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount} of {steps.length} complete
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-start gap-3 rounded-lg p-2.5 transition-colors',
              step.completed ? 'bg-emerald-500/10' : 'bg-muted/30 hover:bg-muted/50'
            )}
          >
            <div
              className={cn(
                'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border',
                step.completed
                  ? 'border-emerald-500 bg-emerald-500 text-primary-foreground'
                  : 'border-border text-muted-foreground'
              )}
            >
              {step.completed ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'text-sm font-medium',
                  step.completed && 'text-muted-foreground line-through'
                )}
              >
                {step.title}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              {!step.completed && step.action && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs text-primary"
                  onClick={step.action}
                >
                  {step.actionLabel || 'Start'} <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {allComplete && onComplete && (
          <Button onClick={onComplete} className="mt-3 w-full bg-primary hover:bg-primary/90">
            Complete Onboarding
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function getDefaultOnboardingSteps(
  completed: Record<string, boolean> = {}
): OnboardingStep[] {
  return [
    {
      id: 'profile',
      title: 'Set up your profile',
      description: 'Add your name and photo so the team knows who you are',
      completed: completed.profile ?? false,
      actionLabel: 'Go to settings',
    },
    {
      id: 'check_inbox',
      title: 'Check your inbox',
      description: 'Your tasks land here — this is where your daily work starts',
      completed: completed.check_inbox ?? false,
      actionLabel: 'Open inbox',
    },
    {
      id: 'explore_project',
      title: 'Open a project',
      description: 'See how phases, tasks, and files are organized for delivery',
      completed: completed.explore_project ?? false,
      actionLabel: 'View projects',
    },
    {
      id: 'daily_checkin',
      title: 'Submit your first check-in',
      description: 'Daily check-ins keep the team in sync — takes 30 seconds',
      completed: completed.daily_checkin ?? false,
      actionLabel: 'Check in',
    },
    {
      id: 'command_menu',
      title: 'Try the command menu',
      description: 'Press Cmd+K (or Ctrl+K) to jump anywhere in the suite instantly',
      completed: completed.command_menu ?? false,
      actionLabel: 'Try it',
    },
  ];
}
