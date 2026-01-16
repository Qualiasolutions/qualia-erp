'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Github,
  Globe,
  Phone,
  SkipForward,
} from 'lucide-react';
import type { ProjectType, DeploymentPlatform } from '@/types/database';
import type { ProvisioningStatus } from '@/lib/integrations/types';
import { getProjectProvisioningStatus, retryProvisioning } from '@/app/actions/integrations';

interface ProvisioningStep {
  id: 'github' | 'vercel' | 'vapi';
  name: string;
  description: string;
  icon: typeof Github;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  url?: string;
  error?: string;
}

interface StepProvisioningProps {
  projectId: string;
  projectName: string;
  projectType: ProjectType;
  deploymentPlatform: DeploymentPlatform;
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS_BY_TYPE: Record<ProjectType, Array<'github' | 'vercel' | 'vapi'>> = {
  web_design: ['github', 'vercel'],
  ai_agent: ['github', 'vercel'],
  voice_agent: ['github', 'vercel', 'vapi'],
  seo: [],
  ads: [],
};

const STEP_CONFIG: Record<
  'github' | 'vercel' | 'vapi',
  { name: string; description: string; icon: typeof Github }
> = {
  github: {
    name: 'GitHub Repository',
    description: 'Creating repository from template',
    icon: Github,
  },
  vercel: {
    name: 'Vercel Project',
    description: 'Setting up deployment',
    icon: Globe,
  },
  vapi: {
    name: 'VAPI Assistant',
    description: 'Creating voice assistant',
    icon: Phone,
  },
};

export function StepProvisioning({
  projectId,
  projectName,
  projectType,
  deploymentPlatform,
  onComplete,
  onSkip,
}: StepProvisioningProps) {
  const [steps, setSteps] = useState<ProvisioningStep[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Initialize steps based on project type
  useEffect(() => {
    const requiredSteps = STEPS_BY_TYPE[projectType] || [];

    // Filter out Vercel if not using Vercel deployment
    const filteredSteps = requiredSteps.filter((step) => {
      if (step === 'vercel' && deploymentPlatform !== 'vercel') return false;
      return true;
    });

    const initialSteps: ProvisioningStep[] = filteredSteps.map((stepId) => ({
      id: stepId,
      ...STEP_CONFIG[stepId],
      status: 'pending',
    }));

    setSteps(initialSteps);
  }, [projectType, deploymentPlatform]);

  // Poll for status updates
  useEffect(() => {
    if (!isPolling || !projectId || steps.length === 0) return;

    const pollStatus = async () => {
      const result = await getProjectProvisioningStatus(projectId);

      if (result.success && result.data) {
        setSteps((prevSteps) =>
          prevSteps.map((step) => {
            if (step.id === 'github' && result.data?.github) {
              return {
                ...step,
                status: result.data.github.url
                  ? 'completed'
                  : result.data.github.error
                    ? 'failed'
                    : step.status === 'pending'
                      ? 'in_progress'
                      : step.status,
                url: result.data.github.url,
                error: result.data.github.error,
              };
            }
            if (step.id === 'vercel' && result.data?.vercel) {
              return {
                ...step,
                status: result.data.vercel.url
                  ? 'completed'
                  : result.data.vercel.error
                    ? 'failed'
                    : step.status === 'pending'
                      ? 'in_progress'
                      : step.status,
                url: result.data.vercel.url,
                error: result.data.vercel.error,
              };
            }
            if (step.id === 'vapi' && result.data?.vapi) {
              return {
                ...step,
                status: result.data.vapi.assistantId
                  ? 'completed'
                  : result.data.vapi.error
                    ? 'failed'
                    : step.status === 'pending'
                      ? 'in_progress'
                      : step.status,
                url: result.data.vapi.assistantId
                  ? `https://dashboard.vapi.ai/assistant/${result.data.vapi.assistantId}`
                  : undefined,
                error: result.data.vapi.error,
              };
            }
            return step;
          })
        );

        // Check if all steps are done
        const status = result.data.status as ProvisioningStatus;
        if (status === 'completed' || status === 'partial_failure' || status === 'failed') {
          setIsPolling(false);
        }
      }
    };

    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => clearInterval(interval);
  }, [projectId, isPolling, steps.length]);

  const handleRetry = async (stepId: 'github' | 'vercel' | 'vapi') => {
    setRetrying(stepId);
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: 'in_progress', error: undefined } : s))
    );

    const result = await retryProvisioning(projectId, stepId);

    if (!result.success) {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status: 'failed', error: result.error } : s))
      );
    }

    setRetrying(null);
    setIsPolling(true);
  };

  const allCompleted = steps.every((s) => s.status === 'completed' || s.status === 'skipped');
  const hasFailures = steps.some((s) => s.status === 'failed');
  const isProcessing = steps.some((s) => s.status === 'in_progress' || s.status === 'pending');

  // Auto-complete if no steps needed
  useEffect(() => {
    if (steps.length === 0 && projectType) {
      // No provisioning needed for this project type
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [steps.length, projectType, onComplete]);

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h3 className="mt-4 text-lg font-medium">No External Resources Needed</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {projectType === 'seo' || projectType === 'ads'
            ? 'This project type does not require GitHub or Vercel setup.'
            : 'Your project is ready to go!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium">Setting Up &quot;{projectName}&quot;</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Creating your development infrastructure
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center justify-between rounded-lg border p-4 transition-colors',
                step.status === 'completed' && 'border-green-500/30 bg-green-500/5',
                step.status === 'failed' && 'border-destructive/30 bg-destructive/5',
                step.status === 'in_progress' && 'border-qualia-500/30 bg-qualia-500/5',
                step.status === 'pending' && 'border-border bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    step.status === 'completed' && 'bg-green-500',
                    step.status === 'failed' && 'bg-destructive',
                    step.status === 'in_progress' && 'bg-qualia-500',
                    step.status === 'pending' && 'bg-muted-foreground/20'
                  )}
                >
                  {step.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-white" />}
                  {step.status === 'failed' && <XCircle className="h-5 w-5 text-white" />}
                  {step.status === 'in_progress' && (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  )}
                  {step.status === 'pending' && <Icon className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div>
                  <p className="font-medium text-foreground">{step.name}</p>
                  {step.status === 'failed' && step.error ? (
                    <p className="text-sm text-destructive">{step.error}</p>
                  ) : step.status === 'completed' && step.url ? (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-qualia-500 hover:underline"
                    >
                      View resource <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {step.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(step.id)}
                    disabled={retrying === step.id}
                  >
                    {retrying === step.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">Retry</span>
                  </Button>
                )}
                {step.status === 'completed' && step.url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={step.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onSkip} disabled={isProcessing}>
          <SkipForward className="mr-2 h-4 w-4" />
          Skip & Finish Later
        </Button>

        {(allCompleted || hasFailures) && (
          <Button onClick={onComplete}>{allCompleted ? 'Done' : 'Continue with Errors'}</Button>
        )}
      </div>
    </div>
  );
}
