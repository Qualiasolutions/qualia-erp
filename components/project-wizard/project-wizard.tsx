'use client';

import { useState, useCallback } from 'react';
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
  team_id: string;
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
  teams: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; display_name: string | null }>;
}

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Name and team' },
  { id: 2, name: 'Configuration', description: 'Type, platform, client' },
  { id: 3, name: 'Roadmap', description: 'Customize phases' },
  { id: 4, name: 'Review', description: 'Confirm and create' },
];

export function ProjectWizard({ open, onOpenChange, teams, clients }: ProjectWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    description: '',
    team_id: '',
    project_type: null,
    deployment_platform: null,
    client_id: '',
    phases: [],
  });

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
        return wizardData.name.trim().length > 0 && wizardData.team_id.length > 0;
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
        team_id: wizardData.team_id,
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
        team_id: '',
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
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Create New Project</DialogTitle>

        {/* Header with progress */}
        <div className="border-b px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create New Project</h2>
            <Button variant="ghost" size="icon" onClick={handleClose} disabled={isSubmitting}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <WizardProgress steps={STEPS} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="max-h-[60vh] min-h-[400px] overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <StepBasicInfo data={wizardData} teams={teams} onChange={updateWizardData} />
          )}

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

          {currentStep === 4 && <StepReview data={wizardData} teams={teams} clients={clients} />}
        </div>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className={cn(currentStep === 1 && 'invisible')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={!canProceed}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed}
              className="bg-qualia-600 hover:bg-qualia-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
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
