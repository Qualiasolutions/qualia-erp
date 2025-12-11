'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createProjectWithRoadmap } from '@/app/actions';
import type { ProjectType, DeploymentPlatform } from '@/types/database';
import type { PhaseTemplate } from '@/lib/phase-templates';
import { getPhaseTemplates } from '@/lib/phase-templates';

import { StepBasicInfo } from './step-basic-info';
import { StepConfiguration } from './step-configuration';
import { StepRoadmapEditor } from './step-roadmap-editor';
import { StepReview } from './step-review';
import { WizardProgress } from './wizard-progress';

export interface WizardData {
  // Step 1: Basic Info
  name: string;
  description: string;
  // Step 2: Configuration
  project_type: ProjectType | null;
  deployment_platform: DeploymentPlatform | null;
  client_id: string;
  // Step 3: Roadmap (customized phases)
  phases: PhaseTemplate[];
}

interface ProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; display_name: string | null }>;
  defaultType?: ProjectType | null;
}

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Name and description' },
  { id: 2, name: 'Configuration', description: 'Type, platform, client' },
  { id: 3, name: 'Roadmap', description: 'Customize phases' },
  { id: 4, name: 'Review', description: 'Confirm and create' },
];

export function ProjectWizard({
  open,
  onOpenChange,
  clients,
  defaultType = null,
}: ProjectWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    description: '',
    project_type: null,
    deployment_platform: null,
    client_id: '',
    phases: [],
  });

  // Set default type when wizard opens with a defaultType
  useEffect(() => {
    if (open && defaultType) {
      setWizardData((prev) => ({
        ...prev,
        project_type: defaultType,
        phases: getPhaseTemplates(defaultType),
      }));
    }
  }, [open, defaultType]);

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  }, []);

  // When project type changes, load default phases
  const handleProjectTypeChange = useCallback(
    (type: ProjectType | null) => {
      updateWizardData({
        project_type: type,
        phases: type ? getPhaseTemplates(type) : [],
      });
    },
    [updateWizardData]
  );

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return wizardData.name.trim().length > 0;
      case 2:
        return (
          wizardData.project_type !== null &&
          wizardData.deployment_platform !== null &&
          wizardData.client_id.length > 0
        );
      case 3:
        return wizardData.phases.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const canProceed = isStepValid(currentStep);

  const handleNext = () => {
    if (currentStep < STEPS.length && canProceed) {
      setCurrentStep((prev) => prev + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createProjectWithRoadmap({
        name: wizardData.name,
        description: wizardData.description || null,
        project_type: wizardData.project_type!,
        deployment_platform: wizardData.deployment_platform!,
        client_id: wizardData.client_id,
        team_id: null,
        phases: wizardData.phases.map((phase) => ({
          name: phase.name,
          description: phase.description || null,
          template_key: phase.templateKey || null,
          items: phase.items.map((item) => ({
            title: item.title,
            description: item.description || null,
            template_key: item.templateKey || null,
          })),
        })),
      });

      if (result.success) {
        onOpenChange(false);
        router.push(`/projects/${(result.data as { id: string }).id}`);
        router.refresh();
      } else {
        setError(result.error || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentStep(1);
      setWizardData({
        name: '',
        description: '',
        project_type: null,
        deployment_platform: null,
        client_id: '',
        phases: [],
      });
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[90vw] gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card p-0 shadow-2xl sm:max-w-2xl md:max-w-3xl"
      >
        <DialogTitle className="sr-only">Create New Project</DialogTitle>

        {/* Header */}
        <div className="relative border-b border-border/50 bg-muted/30 px-6 pb-5 pt-6">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute right-3 top-3 h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Title */}
          <div className="mb-5 pr-8">
            <h2 className="text-xl font-semibold text-foreground">Create New Project</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Set up your project in a few simple steps
            </p>
          </div>

          {/* Progress */}
          <WizardProgress steps={STEPS} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="max-h-[55vh] min-h-[380px] overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <X className="h-3.5 w-3.5" />
              </div>
              {error}
            </div>
          )}

          <div className="duration-300 animate-in fade-in-0 slide-in-from-right-4">
            {currentStep === 1 && <StepBasicInfo data={wizardData} onChange={updateWizardData} />}

            {currentStep === 2 && (
              <StepConfiguration
                data={wizardData}
                clients={clients}
                onProjectTypeChange={handleProjectTypeChange}
                onChange={updateWizardData}
              />
            )}

            {currentStep === 3 && (
              <StepRoadmapEditor
                phases={wizardData.phases}
                projectType={wizardData.project_type}
                onChange={(phases) => updateWizardData({ phases })}
              />
            )}

            {currentStep === 4 && <StepReview data={wizardData} clients={clients} />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-6 py-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className={cn(
              'gap-2 rounded-xl px-4 text-muted-foreground hover:text-foreground',
              currentStep === 1 && 'invisible'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-all duration-300',
                  currentStep === step.id
                    ? 'w-6 bg-qualia-500'
                    : currentStep > step.id
                      ? 'bg-qualia-500/50'
                      : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2 rounded-xl bg-qualia-600 px-6 shadow-lg shadow-qualia-600/20 transition-all hover:bg-qualia-500 hover:shadow-qualia-500/30 disabled:opacity-50 disabled:shadow-none"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed}
              className="gap-2 rounded-xl bg-gradient-to-r from-qualia-600 to-qualia-500 px-6 shadow-lg shadow-qualia-600/25 transition-all hover:from-qualia-500 hover:to-qualia-400 hover:shadow-qualia-500/35 disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
