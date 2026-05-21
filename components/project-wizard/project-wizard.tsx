'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Check,
  Loader2,
  X,
  Globe,
  Bot,
  Phone,
  TrendingUp,
  Megaphone,
  Building,
  Sparkles,
  Zap,
  Github,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createProjectWithRoadmap } from '@/app/actions/projects';
import { checkIntegrationsConfigured } from '@/app/actions/integrations';
import type { IntegrationSelections } from '@/lib/integrations/types';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspace } from '@/components/workspace-provider';
import { invalidateProjectStats } from '@/lib/swr';
import { toast } from 'sonner';
import { toastError } from '@/lib/toast-helpers';
import { SelectWithOther } from '@/components/ui/select-with-other';
import type { ProjectType, DeploymentPlatform } from '@/types/database';

import { StepProvisioning } from './step-provisioning';

// Wizard never offers the `internal` enum value (that's the workspace team-chat
// marker, backfilled by migration). Narrow the type so the wizard input matches
// what `createProjectWithRoadmap` accepts.
export type WizardProjectType = Exclude<ProjectType, 'internal'>;

export interface WizardData {
  name: string;
  description: string;
  is_demo: boolean;
  project_type: WizardProjectType | null;
  deployment_platform: DeploymentPlatform | null;
  client_id: string;
  custom_client_name: string;
}

interface ProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; display_name: string | null; business_name?: string | null }>;
  defaultType?: WizardProjectType | null;
}

const PROJECT_TYPES: Array<{
  value: WizardProjectType;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'web_design',
    label: 'Website',
    icon: <Globe className="h-5 w-5" />,
  },
  {
    value: 'ai_agent',
    label: 'AI Agent',
    icon: <Bot className="h-5 w-5" />,
  },
  {
    value: 'voice_agent',
    label: 'Voice',
    icon: <Phone className="h-5 w-5" />,
  },
  {
    value: 'ai_platform',
    label: 'AI Platform',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    value: 'seo',
    label: 'SEO',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    value: 'app',
    label: 'App',
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    value: 'ads',
    label: 'Ads',
    icon: <Megaphone className="h-5 w-5" />,
  },
];

// Auto-select deployment platform based on project type
function getDeploymentPlatform(projectType: ProjectType | null): DeploymentPlatform {
  if (
    projectType === 'web_design' ||
    projectType === 'ai_agent' ||
    projectType === 'voice_agent' ||
    projectType === 'ai_platform' ||
    projectType === 'app'
  ) {
    return 'vercel';
  }
  return 'none';
}

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
  const [configuredIntegrations, setConfiguredIntegrations] = useState<{
    github: boolean;
    vercel: boolean;
  }>({ github: false, vercel: false });
  const [selectedIntegrations, setSelectedIntegrations] = useState<IntegrationSelections>({
    github: false,
    vercel: false,
  });
  const [showProvisioning, setShowProvisioning] = useState(false);
  const [mode, setMode] = useState<'full' | 'demo'>('full');

  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    description: '',
    is_demo: false,
    project_type: defaultType,
    deployment_platform: null,
    client_id: '',
    custom_client_name: '',
  });

  // Check which integrations are configured when workspace changes
  useEffect(() => {
    async function checkIntegrations() {
      if (currentWorkspace?.id) {
        const result = await checkIntegrationsConfigured(currentWorkspace.id);
        if (result.success && result.data) {
          setConfiguredIntegrations(result.data);
        }
      }
    }
    checkIntegrations();
  }, [currentWorkspace?.id]);

  // Helper to check if any integrations are configured
  const hasAnyIntegrations = configuredIntegrations.github || configuredIntegrations.vercel;

  // Helper to check if any integrations are selected
  const hasSelectedIntegrations = selectedIntegrations.github || selectedIntegrations.vercel;

  /* eslint-disable react-hooks/set-state-in-effect -- form reset when wizard opens with default project type */
  // Set default type when wizard opens with a defaultType
  useEffect(() => {
    if (open && defaultType) {
      setWizardData((prev) => ({ ...prev, project_type: defaultType }));
    }
  }, [open, defaultType]);

  // Reset mode when dialog opens
  useEffect(() => {
    if (open) {
      setMode('full');
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Check if this project should show provisioning step
  // Now based on user selection, not forced by project type
  const needsProvisioning = hasSelectedIntegrations && mode !== 'demo';

  // Form validation - Demo mode only needs name, full mode needs name + type + client
  const isValid =
    mode === 'demo'
      ? wizardData.name.trim().length > 0
      : wizardData.name.trim().length > 0 &&
        wizardData.project_type !== null &&
        (wizardData.client_id.length > 0 || wizardData.custom_client_name.length > 0);

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const deploymentPlatform =
        mode === 'demo' ? 'none' : getDeploymentPlatform(wizardData.project_type);
      const projectType = mode === 'demo' ? 'web_design' : wizardData.project_type!;

      const result = await createProjectWithRoadmap({
        name: wizardData.name,
        description: wizardData.description || null,
        project_type: projectType,
        deployment_platform: deploymentPlatform,
        client_id: wizardData.client_id || undefined,
        custom_client_name: wizardData.custom_client_name || undefined,
        team_id: null,
        workspace_id: currentWorkspace?.id,
        is_demo: mode === 'demo',
        // Pass integration selections so provisioning runs in same request context
        selectedIntegrations: needsProvisioning ? selectedIntegrations : undefined,
      });

      if (result.success) {
        invalidateProjectStats(true);

        const projectData = result.data as { id: string } | undefined;

        if (projectData?.id && needsProvisioning) {
          // Provisioning is already running on the server from the same request
          setCreatedProjectId(projectData.id);
          setShowProvisioning(true);
          toast.success(`Creating ${wizardData.name}...`);
        } else {
          const label = mode === 'demo' ? 'Demo' : 'Project';
          toast.success(`${label} "${wizardData.name}" created`);
          handleFinish(projectData?.id);
        }
      } else {
        setError(result.error || 'Failed to create project');
        toastError({ action: 'create the project', error: result.error || undefined });
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('An unexpected error occurred');
      toastError({ action: 'create the project', error: err instanceof Error ? err : undefined });
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
    setMode('full');
    setWizardData({
      name: '',
      description: '',
      is_demo: false,
      project_type: null,
      deployment_platform: null,
      client_id: '',
      custom_client_name: '',
    });
    setSelectedIntegrations({ github: false, vercel: false });
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (showProvisioning && createdProjectId) {
        // If provisioning started, navigate to the project
        handleFinish(createdProjectId);
      } else {
        resetForm();
        onOpenChange(false);
      }
    }
  };

  const selectedType = PROJECT_TYPES.find((t) => t.value === wizardData.project_type);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-md gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-elevation-4"
      >
        <DialogTitle className="sr-only">Create New Project</DialogTitle>
        <DialogDescription className="sr-only">Create a new project</DialogDescription>

        <div className="relative overflow-hidden border-b border-border">
          <div className="relative px-5 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting || showProvisioning}
              className="absolute right-3 top-3 h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label="Close wizard"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] text-primary ring-1 ring-primary/15',
                  showProvisioning && 'bg-primary text-primary-foreground ring-primary'
                )}
              >
                {selectedType ? <span>{selectedType.icon}</span> : <Sparkles className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {showProvisioning ? 'Setting Up' : mode === 'demo' ? 'Quick Demo' : 'New Project'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {showProvisioning
                    ? 'Creating resources...'
                    : mode === 'demo'
                      ? 'Just enter a name'
                      : 'Configure your project'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {showProvisioning && createdProjectId ? (
            <StepProvisioning
              projectId={createdProjectId}
              projectName={wizardData.name}
              projectType={wizardData.project_type!}
              selectedIntegrations={selectedIntegrations}
              onComplete={() => handleFinish(createdProjectId)}
              onSkip={() => handleFinish(createdProjectId)}
            />
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  <X className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Mode Toggle */}
              <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => setMode('full')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    mode === 'full'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  Full Project
                </button>
                <button
                  type="button"
                  onClick={() => setMode('demo')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    mode === 'demo'
                      ? 'bg-amber-500/10 text-amber-700 shadow-sm dark:text-amber-400'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Zap className="h-4 w-4" />
                  Quick Demo
                </button>
              </div>

              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground/80">
                  {mode === 'demo' ? 'Demo Name' : 'Project Name'}{' '}
                  <span className="text-primary">*</span>
                </Label>
                <Input
                  id="name"
                  value={wizardData.name}
                  onChange={(e) => updateWizardData({ name: e.target.value })}
                  placeholder={mode === 'demo' ? 'e.g. Acme Corp Demo' : 'e.g. Acme Corp Website'}
                  className="h-10 rounded-lg border-border bg-muted/30 text-sm transition-colors focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              {/* Full mode fields */}
              {mode === 'full' && (
                <>
                  {/* Project Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      Type <span className="text-primary">*</span>
                    </Label>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {PROJECT_TYPES.map((type) => {
                        const isSelected = wizardData.project_type === type.value;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => updateWizardData({ project_type: type.value })}
                            className={cn(
                              'group relative flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border p-2.5 transition-colors duration-150',
                              isSelected
                                ? 'border-primary/40 bg-primary/[0.06] text-primary shadow-sm'
                                : 'border-border bg-muted/20 hover:border-border hover:bg-muted/40'
                            )}
                          >
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}

                            <div
                              className={cn(
                                'transition-colors duration-150',
                                isSelected
                                  ? 'text-primary'
                                  : 'text-muted-foreground group-hover:text-foreground'
                              )}
                            >
                              {type.icon}
                            </div>
                            <span
                              className={cn(
                                'text-xs font-medium transition-colors',
                                isSelected ? 'text-foreground' : 'text-muted-foreground'
                              )}
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
                    <Label className="text-sm font-medium text-foreground/80">
                      Client <span className="text-primary">*</span>
                    </Label>
                    <SelectWithOther
                      options={clients.map((client) => ({
                        value: client.id,
                        label: client.display_name || 'Unnamed Client',
                        description: client.business_name || undefined,
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
                      placeholder="Search or add client..."
                      otherLabel="Add new client"
                      otherPlaceholder="Enter client name"
                      icon={<Building className="h-4 w-4 text-muted-foreground" />}
                      className="w-full"
                      triggerClassName="h-10 w-full rounded-lg border-border bg-muted/30 transition-colors hover:bg-muted/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Optional Integrations - Compact Row */}
                  {hasAnyIntegrations && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">
                        Auto-Setup{' '}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {configuredIntegrations.github && (
                          <label
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-all',
                              selectedIntegrations.github
                                ? 'border-border bg-muted'
                                : 'border-border bg-muted/30 hover:bg-muted/50'
                            )}
                          >
                            <Checkbox
                              checked={selectedIntegrations.github}
                              onCheckedChange={(checked) =>
                                setSelectedIntegrations((prev) => ({ ...prev, github: !!checked }))
                              }
                              className="h-4 w-4 data-[state=checked]:border-gray-700 data-[state=checked]:bg-gray-700"
                            />
                            <Github className="h-4 w-4" />
                            <span className="text-sm font-medium">GitHub</span>
                          </label>
                        )}

                        {configuredIntegrations.vercel && (
                          <label
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-all',
                              selectedIntegrations.vercel
                                ? 'border-black/30 bg-black/5 dark:border-white/30 dark:bg-white/5'
                                : 'border-border bg-muted/30 hover:bg-muted/50',
                              !selectedIntegrations.github && 'cursor-not-allowed opacity-50'
                            )}
                          >
                            <Checkbox
                              checked={selectedIntegrations.vercel}
                              onCheckedChange={(checked) =>
                                setSelectedIntegrations((prev) => ({ ...prev, vercel: !!checked }))
                              }
                              disabled={!selectedIntegrations.github}
                              className="h-4 w-4 data-[state=checked]:border-black data-[state=checked]:bg-black dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white"
                            />
                            <Globe className="h-4 w-4" />
                            <span className="text-sm font-medium">Vercel</span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Demo mode hint */}
              {mode === 'demo' && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <p className="text-center text-sm text-muted-foreground">
                    Demo projects are for quick presentations. You can convert to a full project
                    later.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className={cn(
                  'h-10 w-full rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50',
                  mode === 'demo'
                    ? 'bg-amber-600 text-white hover:bg-amber-600/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {mode === 'demo' ? (
                      <Zap className="mr-2 h-4 w-4" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    {mode === 'demo' ? 'Create Demo' : 'Create Project'}
                  </>
                )}
              </Button>

              {/* Auto-provisioning note */}
              {needsProvisioning && mode === 'full' && (
                <p className="text-center text-xs text-muted-foreground">
                  {[
                    selectedIntegrations.github && 'GitHub repo',
                    selectedIntegrations.vercel && 'Vercel project',
                  ]
                    .filter(Boolean)
                    .join(' + ')}{' '}
                  will be created after project setup
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
