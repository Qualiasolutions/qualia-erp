'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  IntegrationResult,
  ProjectProvisioningConfig,
  ProjectProvisioningResult,
  ProvisioningStatus,
} from './types';
import { createRepository, clearGitHubClientCache, setupRepoWebhook } from './github';
import { createVercelProject } from './vercel';

// =====================================================
// Main Orchestration
// =====================================================

/**
 * Create all integrations for a new project
 *
 * This orchestrates the creation of GitHub repos, Vercel projects, and VAPI assistants.
 * If selectedIntegrations is provided, only the selected integrations will be provisioned.
 * Otherwise, it falls back to automatic selection based on project type.
 * Handles partial failures gracefully.
 */
export async function setupProjectIntegrations(
  config: ProjectProvisioningConfig
): Promise<IntegrationResult<ProjectProvisioningResult>> {
  const result: ProjectProvisioningResult = {
    errors: [],
  };

  const supabase = await createClient();

  // Determine which providers to use
  let requiredProviders: string[];

  if (config.selectedIntegrations) {
    // User explicitly selected integrations - use their choices
    requiredProviders = [];
    if (config.selectedIntegrations.github) requiredProviders.push('github');
    if (config.selectedIntegrations.vercel) requiredProviders.push('vercel');
  } else {
    // Fallback to automatic selection based on project type
    const provisioningMap: Record<string, string[]> = {
      web_design: ['github', 'vercel'],
      ai_agent: ['github', 'vercel'],
      voice_agent: ['github', 'vercel'],
      seo: [],
      ads: [],
    };
    requiredProviders = provisioningMap[config.projectType] || [];
  }

  // Skip provisioning if no integrations selected/needed
  if (requiredProviders.length === 0) {
    return {
      success: true,
      data: result,
    };
  }

  // Ensure provisioning record exists (upsert to handle both fresh + retry cases)
  await supabase.from('project_provisioning').upsert(
    {
      project_id: config.projectId,
      workspace_id: config.workspaceId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' }
  );

  // 1. Create GitHub repository (for web_design, ai_agent, voice_agent)
  if (requiredProviders.includes('github')) {
    const gitHubResult = await createRepository(
      config.workspaceId,
      {
        name: config.projectName,
        description: config.description || `${config.projectType} project`,
        projectType: config.projectType,
        isPrivate: true,
      },
      config.clientName
    );

    if (gitHubResult.success && gitHubResult.data) {
      result.github = gitHubResult.data;

      // Update provisioning record with GitHub info
      await supabase
        .from('project_provisioning')
        .update({
          github_repo_url: gitHubResult.data.repoUrl,
          github_repo_name: gitHubResult.data.repoName,
          github_clone_url: gitHubResult.data.cloneUrl,
          github_provisioned_at: new Date().toISOString(),
          github_error: null,
        })
        .eq('project_id', config.projectId);

      // Also store URL on projects table for quick access without join
      await supabase
        .from('projects')
        .update({ github_repo_url: gitHubResult.data.repoUrl })
        .eq('id', config.projectId);

      // Auto-setup push webhook for phase sync + auto-assign
      if (gitHubResult.data.repoName) {
        const webhookResult = await setupRepoWebhook(
          config.workspaceId,
          gitHubResult.data.repoName
        );
        if (!webhookResult.success) {
          console.warn(
            `[Provisioning] Webhook setup failed for ${gitHubResult.data.repoName}: ${webhookResult.error}`
          );
        }
      }
    } else if (gitHubResult.error) {
      result.errors.push(`GitHub: ${gitHubResult.error}`);

      await supabase
        .from('project_provisioning')
        .update({
          github_error: gitHubResult.error,
        })
        .eq('project_id', config.projectId);
    }
  }

  // 2. Create Vercel project (if selected and we have a GitHub repo)
  // When user explicitly selects Vercel, we don't require deployment_platform to be 'vercel'
  const vercelExplicitlySelected = config.selectedIntegrations?.vercel === true;
  if (
    requiredProviders.includes('vercel') &&
    (vercelExplicitlySelected || config.deploymentPlatform === 'vercel') &&
    result.github?.repoUrl
  ) {
    const vercelResult = await createVercelProject(config.workspaceId, {
      name: config.projectName,
      repoUrl: result.github.repoUrl,
      framework: config.projectType === 'web_design' ? 'nextjs' : undefined,
      envVars: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      },
    });

    if (vercelResult.success && vercelResult.data) {
      result.vercel = vercelResult.data;

      await supabase
        .from('project_provisioning')
        .update({
          vercel_project_id: vercelResult.data.projectId,
          vercel_project_url: vercelResult.data.projectUrl,
          vercel_deployment_url: vercelResult.data.deploymentUrl,
          vercel_provisioned_at: new Date().toISOString(),
          vercel_error: null,
        })
        .eq('project_id', config.projectId);

      // Also store URL on projects table for quick access without join
      await supabase
        .from('projects')
        .update({ vercel_project_url: vercelResult.data.projectUrl })
        .eq('id', config.projectId);
    } else if (vercelResult.error) {
      result.errors.push(`Vercel: ${vercelResult.error}`);

      await supabase
        .from('project_provisioning')
        .update({
          vercel_error: vercelResult.error,
        })
        .eq('project_id', config.projectId);
    }
  }

  // 3. Update final status
  let finalStatus: ProvisioningStatus;
  if (result.errors.length === 0) {
    finalStatus = 'completed';
  } else if (result.github || result.vercel) {
    finalStatus = 'partial_failure';
  } else {
    finalStatus = 'failed';
  }

  await supabase
    .from('project_provisioning')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('project_id', config.projectId);

  return {
    success: result.errors.length === 0,
    error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
    data: result,
  };
}

/**
 * Get provisioning status for a project
 */
export async function getProvisioningStatus(projectId: string): Promise<
  IntegrationResult<{
    status: ProvisioningStatus;
    github?: { url?: string; error?: string };
    vercel?: { url?: string; error?: string };
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_provisioning')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error) {
    // No provisioning record means not started
    if (error.code === 'PGRST116') {
      return {
        success: true,
        data: {
          status: 'not_started',
        },
      };
    }
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      status: data.status as ProvisioningStatus,
      github:
        data.github_repo_url || data.github_error
          ? { url: data.github_repo_url, error: data.github_error }
          : undefined,
      vercel:
        data.vercel_project_url || data.vercel_error
          ? { url: data.vercel_project_url, error: data.vercel_error }
          : undefined,
    },
  };
}

/**
 * Retry a specific provisioning step
 */
export async function retryProvisioningStep(
  projectId: string,
  step: 'github' | 'vercel'
): Promise<IntegrationResult<void>> {
  const supabase = await createClient();

  // Get project info
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      'id, name, description, project_type, deployment_platform, workspace_id, client:clients(display_name)'
    )
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: 'Project not found' };
  }

  // Get provisioning record
  const { data: provisioning } = await supabase
    .from('project_provisioning')
    .select('*')
    .eq('project_id', projectId)
    .single();

  // Update status to in_progress
  await supabase
    .from('project_provisioning')
    .update({
      status: 'in_progress',
      retry_count: (provisioning?.retry_count || 0) + 1,
    })
    .eq('project_id', projectId);

  const clientName = (project.client as { display_name?: string } | null)?.display_name;

  // Clear cached client so we pick up any token changes
  if (step === 'github') await clearGitHubClientCache(project.workspace_id);

  // Retry specific step
  if (step === 'github') {
    const result = await createRepository(
      project.workspace_id,
      {
        name: project.name,
        description: project.description || '',
        projectType: project.project_type,
        isPrivate: true,
      },
      clientName
    );

    if (result.success && result.data) {
      await supabase
        .from('project_provisioning')
        .update({
          github_repo_url: result.data.repoUrl,
          github_repo_name: result.data.repoName,
          github_clone_url: result.data.cloneUrl,
          github_provisioned_at: new Date().toISOString(),
          github_error: null,
          status: 'completed',
        })
        .eq('project_id', projectId);

      // Also store URL on projects table for quick access without join
      await supabase
        .from('projects')
        .update({ github_repo_url: result.data.repoUrl })
        .eq('id', projectId);
    } else {
      await supabase
        .from('project_provisioning')
        .update({
          github_error: result.error,
          status: 'partial_failure',
        })
        .eq('project_id', projectId);
      return { success: false, error: result.error };
    }
  }

  if (step === 'vercel' && provisioning?.github_repo_url) {
    const result = await createVercelProject(project.workspace_id, {
      name: project.name,
      repoUrl: provisioning.github_repo_url,
      framework: project.project_type === 'web_design' ? 'nextjs' : undefined,
    });

    if (result.success && result.data) {
      await supabase
        .from('project_provisioning')
        .update({
          vercel_project_id: result.data.projectId,
          vercel_project_url: result.data.projectUrl,
          vercel_deployment_url: result.data.deploymentUrl,
          vercel_provisioned_at: new Date().toISOString(),
          vercel_error: null,
          status: 'completed',
        })
        .eq('project_id', projectId);

      // Also store URL on projects table for quick access without join
      await supabase
        .from('projects')
        .update({ vercel_project_url: result.data.projectUrl })
        .eq('id', projectId);
    } else {
      await supabase
        .from('project_provisioning')
        .update({
          vercel_error: result.error,
          status: 'partial_failure',
        })
        .eq('project_id', projectId);
      return { success: false, error: result.error };
    }
  }

  return { success: true };
}
