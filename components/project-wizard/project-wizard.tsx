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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createProjectWithRoadmap } from '@/app/actions';
import { checkIntegrationsConfigured } from '@/app/actions/integrations';
import type { IntegrationSelections } from '@/lib/integrations/types';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspace } from '@/components/workspace-provider';
import { invalidateProjectStats, invalidateDailyFlow } from '@/lib/swr';
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
  clients: Array<{ id: string; display_name: string | null; business_name?: string | null }>;
  defaultType?: ProjectType | null;
}

const PROJECT_TYPES: Array<{
  value: ProjectType;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  bgGradient: string;
}> = [
  {
    value: 'web_design',
    label: 'Website',
    icon: <Globe className="h-5 w-5" />,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    value: 'ai_agent',
    label: 'AI Agent',
    icon: <Bot className="h-5 w-5" />,
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-500/10 to-purple-500/10',
  },
  {
    value: 'voice_agent',
    label: 'Voice',
    icon: <Phone className="h-5 w-5" />,
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-500/10 to-rose-500/10',
  },
  {
    value: 'ai_platform',
    label: 'AI Platform',
    icon: <Sparkles className="h-5 w-5" />,
    gradient: 'from-indigo-500 to-violet-500',
    bgGradient: 'from-indigo-500/10 to-violet-500/10',
  },
  {
    value: 'seo',
    label: 'SEO',
    icon: <TrendingUp className="h-5 w-5" />,
    gradient: 'from-emerald-500 to-green-500',
    bgGradient: 'from-emerald-500/10 to-green-500/10',
  },
  {
    value: 'ads',
    label: 'Ads',
    icon: <Megaphone className="h-5 w-5" />,
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-500/10 to-amber-500/10',
  },
];

// Auto-select deployment platform based on project type
function getDeploymentPlatform(projectType: ProjectType | null): DeploymentPlatform {
  if (
    projectType === 'web_design' ||
    projectType === 'ai_agent' ||
    projectType === 'voice_agent' ||
    projectType === 'ai_platform'
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
    vapi: boolean;
  }>({ github: false, vercel: false, vapi: false });
  const [selectedIntegrations, setSelectedIntegrations] = useState<IntegrationSelections>({
    github: false,
    vercel: false,
    vapi: false,
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
  const hasAnyIntegrations =
    configuredIntegrations.github || configuredIntegrations.vercel || configuredIntegrations.vapi;

  // Helper to check if any integrations are selected
  const hasSelectedIntegrations =
    selectedIntegrations.github || selectedIntegrations.vercel || selectedIntegrations.vapi;

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
        invalidateDailyFlow(true);

        const projectData = result.data as { id: string } | undefined;

        if (projectData?.id && needsProvisioning) {
          // Provisioning is already running on the server from the same request
          setCreatedProjectId(projectData.id);
          setShowProvisioning(true);
          toast({ title: `Creating ${wizardData.name}...` });
        } else {
          const label = mode === 'demo' ? 'Demo' : 'Project';
          toast({ title: `${label} "${wizardData.name}" created` });
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
    setSelectedIntegrations({ github: false, vercel: false, vapi: false });
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
        className="w-full max-w-md gap-0 overflow-hidden rounded-2xl border-0 bg-gradient-to-b from-card to-card/95 p-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]"
      >
        <DialogTitle className="sr-only">Create New Project</DialogTitle>
        <DialogDescription className="sr-only">Create a new project</DialogDescription>

        {/* Header with gradient accent */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div
            className={cn(
              'absolute inset-0 opacity-50 transition-all duration-500',
              selectedType
                ? `bg-gradient-to-br ${selectedType.bgGradient}`
                : 'bg-gradient-to-br from-qualia-500/10 to-transparent'
            )}
          />

          <div className="relative px-6 py-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting || showProvisioning}
              className="absolute right-3 top-3 h-8 w-8 rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
                  selectedType ? selectedType.gradient : 'from-qualia-500 to-qualia-600'
                )}
              >
                {selectedType ? (
                  <span className="text-white">{selectedType.icon}</span>
                ) : (
                  <Sparkles className="h-5 w-5 text-white" />
                )}
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
        <div className="p-6 pt-4">
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
                <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <X className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Mode Toggle */}
              <div className="flex gap-2 rounded-xl bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => setMode('full')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
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
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                    mode === 'demo'
                      ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 shadow-sm dark:text-amber-400'
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
                  <span className="text-qualia-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={wizardData.name}
                  onChange={(e) => updateWizardData({ name: e.target.value })}
                  placeholder={mode === 'demo' ? 'e.g. Acme Corp Demo' : 'e.g. Acme Corp Website'}
                  className="h-12 rounded-xl border-border/30 bg-muted/30 text-base transition-all focus:border-qualia-500/50 focus:bg-background focus:ring-2 focus:ring-qualia-500/20"
                  autoFocus
                />
              </div>

              {/* Full mode fields */}
              {mode === 'full' && (
                <>
                  {/* Project Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      Type <span className="text-qualia-500">*</span>
                    </Label>
                    <div className="grid grid-cols-6 gap-2">
                      {PROJECT_TYPES.map((type) => {
                        const isSelected = wizardData.project_type === type.value;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => updateWizardData({ project_type: type.value })}
                            className={cn(
                              'group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200',
                              isSelected
                                ? 'border-transparent bg-gradient-to-br shadow-lg ' +
                                    type.bgGradient
                                : 'border-border/30 bg-muted/20 hover:border-border/50 hover:bg-muted/40'
                            )}
                          >
                            {/* Selection indicator */}
                            {isSelected && (
                              <div
                                className={cn(
                                  'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br shadow-md',
                                  type.gradient
                                )}
                              >
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}

                            <div
                              className={cn(
                                'transition-transform duration-200 group-hover:scale-110',
                                isSelected
                                  ? `bg-gradient-to-br bg-clip-text text-transparent ${type.gradient}`
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
                      Client <span className="text-qualia-500">*</span>
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
                      triggerClassName="h-12 w-full rounded-xl border-border/30 bg-muted/30 transition-all hover:bg-muted/50 focus:border-qualia-500/50 focus:ring-2 focus:ring-qualia-500/20"
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
                                ? 'border-gray-500/50 bg-gray-500/10'
                                : 'border-border/50 bg-muted/30 hover:bg-muted/50'
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
                                : 'border-border/50 bg-muted/30 hover:bg-muted/50',
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

                        {configuredIntegrations.vapi && (
                          <label
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-all',
                              selectedIntegrations.vapi
                                ? 'border-pink-500/50 bg-pink-500/10'
                                : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                            )}
                          >
                            <Checkbox
                              checked={selectedIntegrations.vapi}
                              onCheckedChange={(checked) =>
                                setSelectedIntegrations((prev) => ({ ...prev, vapi: !!checked }))
                              }
                              className="h-4 w-4 data-[state=checked]:border-pink-500 data-[state=checked]:bg-pink-500"
                            />
                            <Phone className="h-4 w-4" />
                            <span className="text-sm font-medium">VAPI</span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Demo mode hint */}
              {mode === 'demo' && (
                <div className="rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 px-4 py-3">
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
                  'h-12 w-full rounded-xl text-base font-medium shadow-lg transition-all hover:shadow-xl disabled:opacity-50',
                  mode === 'demo'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400'
                    : 'bg-gradient-to-r from-qualia-600 to-qualia-500 hover:from-qualia-500 hover:to-qualia-400'
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
                    selectedIntegrations.vapi && 'VAPI assistant',
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
