'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, X, Globe, Bot, Phone, Search, Megaphone, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createProjectWithRoadmap } from '@/app/actions';
import { startProvisioning, checkIntegrationsConfigured } from '@/app/actions/integrations';
import { useWorkspace } from '@/components/workspace-provider';
import { invalidateProjectStats, invalidateDailyFlow, invalidateTimeline } from '@/lib/swr';
import { toast } from '@/components/ui/use-toast';
import { SelectWithOther } from '@/components/ui/select-with-other';
import type { ProjectType, DeploymentPlatform } from '@/types/database';

import { StepProvisioning } from './step-provisioning';

export interface WizardData {
  name: string;
  description: string;
  is_demo: boolean;
  project_type: ProjectType | null;
  deployment_platform: DeploymentPlatform | null;
  client_id: string;
  custom_client_name: string;
}

interface ProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; display_name: string | null }>;
  defaultType?: ProjectType | null;
}

const PROJECT_TYPES: Array<{
  value: ProjectType;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    value: 'web_design',
    label: 'Website',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-blue-500',
  },
  {
    value: 'ai_agent',
    label: 'AI Agent',
    icon: <Bot className="h-5 w-5" />,
    color: 'text-purple-500',
  },
  {
    value: 'voice_agent',
    label: 'Voice Agent',
    icon: <Phone className="h-5 w-5" />,
    color: 'text-pink-500',
  },
  { value: 'seo', label: 'SEO', icon: <Search className="h-5 w-5" />, color: 'text-green-500' },
  { value: 'ads', label: 'Ads', icon: <Megaphone className="h-5 w-5" />, color: 'text-orange-500' },
];

// Auto-select deployment platform based on project type
function getDeploymentPlatform(projectType: ProjectType | null): DeploymentPlatform {
  if (projectType === 'web_design' || projectType === 'ai_agent' || projectType === 'voice_agent') {
    return 'vercel';
  }
  return 'none';
}

// Project types that need provisioning
const PROVISIONING_TYPES: ProjectType[] = ['web_design', 'ai_agent', 'voice_agent'];

export function ProjectWizard({
  open,
  onOpenChange,
  clients,
  defaultType = null,
}: ProjectWizardProps) {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [hasIntegrations, setHasIntegrations] = useState(false);
  const [showProvisioning, setShowProvisioning] = useState(false);

  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    description: '',
    is_demo: false,
    project_type: defaultType,
    deployment_platform: null,
    client_id: '',
    custom_client_name: '',
  });

  // Check if integrations are configured when workspace changes
  useEffect(() => {
    async function checkIntegrations() {
      if (currentWorkspace?.id) {
        const result = await checkIntegrationsConfigured(currentWorkspace.id);
        if (result.success && result.data) {
          setHasIntegrations(result.data.github || result.data.vercel || result.data.vapi);
        }
      }
    }
    checkIntegrations();
  }, [currentWorkspace?.id]);

  // Set default type when wizard opens with a defaultType
  useEffect(() => {
    if (open && defaultType) {
      setWizardData((prev) => ({ ...prev, project_type: defaultType }));
    }
  }, [open, defaultType]);

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Check if this project type needs provisioning
  const needsProvisioning =
    hasIntegrations &&
    wizardData.project_type &&
    PROVISIONING_TYPES.includes(wizardData.project_type);

  // Form validation
  const isValid =
    wizardData.name.trim().length > 0 &&
    wizardData.project_type !== null &&
    (wizardData.client_id.length > 0 || wizardData.custom_client_name.length > 0);

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const deploymentPlatform = getDeploymentPlatform(wizardData.project_type);

      const result = await createProjectWithRoadmap({
        name: wizardData.name,
        description: wizardData.description || null,
        project_type: wizardData.project_type!,
        deployment_platform: deploymentPlatform,
        client_id: wizardData.client_id || undefined,
        custom_client_name: wizardData.custom_client_name || undefined,
        team_id: null,
        workspace_id: currentWorkspace?.id,
        is_demo: false,
      });

      if (result.success) {
        invalidateProjectStats(true);
        invalidateDailyFlow(true);
        invalidateTimeline(true);

        const projectData = result.data as { id: string } | undefined;

        if (projectData?.id && needsProvisioning) {
          setCreatedProjectId(projectData.id);
          setShowProvisioning(true);

          // Start provisioning in the background
          startProvisioning(projectData.id).catch((err) => {
            console.error('[ProjectWizard] Provisioning error:', err);
          });

          toast({ title: `Creating ${wizardData.name}...` });
        } else {
          toast({ title: `Project "${wizardData.name}" created` });
          handleFinish(projectData?.id);
        }
      } else {
        setError(result.error || 'Failed to create project');
        toast({
          title: 'Failed to create project',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = (projectId?: string) => {
    resetForm();
    onOpenChange(false);
    if (projectId) {
      router.push(`/projects/${projectId}`);
    }
    router.refresh();
  };

  const resetForm = () => {
    setCreatedProjectId(null);
    setShowProvisioning(false);
    setWizardData({
      name: '',
      description: '',
      is_demo: false,
      project_type: null,
      deployment_platform: null,
      client_id: '',
      custom_client_name: '',
    });
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting && !showProvisioning) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-lg gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card p-0 shadow-2xl"
      >
        <DialogTitle className="sr-only">Create New Project</DialogTitle>
        <DialogDescription className="sr-only">Create a new project</DialogDescription>

        {/* Header */}
        <div className="relative border-b border-border/50 bg-muted/30 px-6 py-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isSubmitting || showProvisioning}
            className="absolute right-3 top-3 h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">New Project</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {showProvisioning ? 'Setting up resources...' : 'Fill in the details below'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {showProvisioning && createdProjectId ? (
            <StepProvisioning
              projectId={createdProjectId}
              projectName={wizardData.name}
              projectType={wizardData.project_type!}
              deploymentPlatform={getDeploymentPlatform(wizardData.project_type)}
              onComplete={() => handleFinish(createdProjectId)}
              onSkip={() => handleFinish(createdProjectId)}
            />
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <X className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Project Name <span className="text-qualia-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={wizardData.name}
                  onChange={(e) => updateWizardData({ name: e.target.value })}
                  placeholder="e.g. Acme Corp Website"
                  className="h-11 rounded-xl border-border/50 bg-muted/30"
                  autoFocus
                />
              </div>

              {/* Project Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Type <span className="text-qualia-500">*</span>
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {PROJECT_TYPES.map((type) => {
                    const isSelected = wizardData.project_type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateWizardData({ project_type: type.value })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all',
                          isSelected
                            ? 'border-qualia-500 bg-qualia-500/5'
                            : 'border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40'
                        )}
                      >
                        <div className={cn(isSelected ? 'text-qualia-500' : type.color)}>
                          {type.icon}
                        </div>
                        <span
                          className={cn('text-xs font-medium', isSelected && 'text-qualia-500')}
                        >
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Client <span className="text-qualia-500">*</span>
                </Label>
                <SelectWithOther
                  options={clients.map((client) => ({
                    value: client.id,
                    label: client.display_name || 'Unnamed Client',
                    icon: <Building className="h-4 w-4 text-muted-foreground" />,
                  }))}
                  value={wizardData.custom_client_name || wizardData.client_id}
                  onChange={(value, isCustom) => {
                    if (isCustom) {
                      updateWizardData({ client_id: '', custom_client_name: value });
                    } else {
                      updateWizardData({ client_id: value, custom_client_name: '' });
                    }
                  }}
                  placeholder="Select or type client name"
                  otherLabel="New client..."
                  otherPlaceholder="Client name"
                  icon={<Building className="h-4 w-4 text-muted-foreground" />}
                  className="w-full"
                  triggerClassName="h-11 w-full rounded-xl border-border/50 bg-muted/30"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className="h-11 w-full rounded-xl bg-qualia-600 hover:bg-qualia-500 disabled:opacity-50"
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

              {/* Auto-provisioning note */}
              {needsProvisioning && (
                <p className="text-center text-xs text-muted-foreground">
                  GitHub repo + Vercel project will be created automatically
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
