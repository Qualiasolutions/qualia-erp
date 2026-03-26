import type { ProjectType, DeploymentPlatform } from '@/types/database';

// =====================================================
// Common Types
// =====================================================

export type IntegrationResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type IntegrationProvider = 'github' | 'vercel' | 'zoho';

export type ProvisioningStatus =
  | 'not_started'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'partial_failure'
  | 'failed';

export const PROVISIONING_STATUSES: ProvisioningStatus[] = [
  'not_started',
  'pending',
  'in_progress',
  'completed',
  'partial_failure',
  'failed',
];

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = ['github', 'vercel', 'zoho'];

// =====================================================
// GitHub Types
// =====================================================

export interface GitHubConfig {
  org: string;
  templates: Partial<Record<ProjectType, string>>;
  defaultVisibility?: 'public' | 'private';
}

export interface GitHubRepoConfig {
  name: string;
  description: string;
  projectType: ProjectType;
  isPrivate?: boolean;
}

export interface GitHubRepoResult {
  repoUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  repoName: string;
}

// Default templates per project type
export const GITHUB_TEMPLATES: Record<ProjectType, string> = {
  web_design: 'qualia-website-template',
  ai_agent: 'qualia-ai-agent-template',
  voice_agent: 'qualia-voice-agent-template',
  ai_platform: 'qualia-ai-agent-template', // Reuse AI agent template
  app: 'qualia-website-template', // App projects
  seo: 'qualia-website-template',
  ads: 'qualia-website-template',
};

// =====================================================
// Vercel Types
// =====================================================

export interface VercelConfig {
  teamId?: string;
}

export interface VercelProjectConfig {
  name: string;
  repoUrl: string;
  framework?: 'nextjs' | 'vite' | 'remix' | 'static';
  envVars?: Record<string, string>;
  buildCommand?: string;
  outputDirectory?: string;
}

export interface VercelProjectResult {
  projectId: string;
  projectUrl: string;
  deploymentUrl?: string;
}

// =====================================================
// Zoho Types
// =====================================================

export interface ZohoConfig {
  refresh_token?: string;
  organization_id?: string;
}

// =====================================================
// Orchestrator Types
// =====================================================

/**
 * Optional integration selections from the user
 * When undefined, defaults to automatic selection based on project type
 */
export interface IntegrationSelections {
  github?: boolean;
  vercel?: boolean;
}

export interface ProjectProvisioningConfig {
  projectId: string;
  projectName: string;
  projectType: ProjectType;
  deploymentPlatform: DeploymentPlatform;
  description?: string;
  clientName?: string;
  workspaceId: string;
  /** Optional user-selected integrations. If provided, only selected integrations will run. */
  selectedIntegrations?: IntegrationSelections;
}

export interface ProjectProvisioningResult {
  github?: GitHubRepoResult;
  vercel?: VercelProjectResult;
  errors: string[];
}

// Which providers are needed for each project type
export const PROVISIONING_MAP: Record<ProjectType, IntegrationProvider[]> = {
  web_design: ['github', 'vercel'],
  ai_agent: ['github', 'vercel'],
  voice_agent: ['github', 'vercel'],
  ai_platform: ['github', 'vercel'], // Same as AI agent
  app: ['github', 'vercel'],
  seo: [],
  ads: [],
};

// =====================================================
// Database Types (for workspace_integrations table)
// =====================================================

export interface WorkspaceIntegration {
  id: string;
  workspace_id: string;
  provider: IntegrationProvider;
  encrypted_token: string;
  config: GitHubConfig | VercelConfig;
  is_connected: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectProvisioning {
  id: string;
  project_id: string;
  workspace_id: string;
  status: ProvisioningStatus;

  // GitHub
  github_repo_url: string | null;
  github_repo_name: string | null;
  github_clone_url: string | null;
  github_provisioned_at: string | null;
  github_error: string | null;

  // Vercel
  vercel_project_id: string | null;
  vercel_project_url: string | null;
  vercel_deployment_url: string | null;
  vercel_provisioned_at: string | null;
  vercel_error: string | null;

  // Metadata
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}
