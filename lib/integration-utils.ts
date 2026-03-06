'use server';

import { createClient } from '@/lib/supabase/server';

export type IntegrationStatus = {
  hasPortalAccess: boolean;
  hasERPClient: boolean;
  portalClientCount: number;
  erpClientName: string | null;
  erpClientCompany: string | null;
};

/**
 * Get integration status for a project showing portal access and ERP client linkage.
 */
export async function getProjectIntegrationStatus(projectId: string): Promise<IntegrationStatus> {
  const supabase = await createClient();

  const { count: portalCount } = await supabase
    .from('client_projects')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const { data: project } = await supabase
    .from('projects')
    .select('client_id, client:clients(id, name, company_name)')
    .eq('id', projectId)
    .single();

  const erpClient =
    project?.client && !Array.isArray(project.client)
      ? project.client
      : Array.isArray(project?.client) && project.client.length > 0
        ? project.client[0]
        : null;

  return {
    hasPortalAccess: (portalCount ?? 0) > 0,
    hasERPClient: !!erpClient,
    portalClientCount: portalCount ?? 0,
    erpClientName: erpClient?.name ?? null,
    erpClientCompany: erpClient?.company_name ?? null,
  };
}

/**
 * Check if a project is fully integrated (has both portal access and ERP client).
 */
export async function isProjectFullyIntegrated(projectId: string): Promise<boolean> {
  const status = await getProjectIntegrationStatus(projectId);
  return status.hasPortalAccess && status.hasERPClient;
}

/**
 * Get projects with partial integration (missing either portal access or ERP client).
 * Useful for admins to identify incomplete setups.
 */
export async function getPartiallyIntegratedProjects(): Promise<{
  missingERPClient: Array<{ id: string; name: string; portalClients: number }>;
  missingPortalAccess: Array<{ id: string; name: string; erpClient: string | null }>;
}> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, client_id, client:clients(name)')
    .in('status', ['Active', 'Demos', 'Delayed']);

  if (!projects) {
    return { missingERPClient: [], missingPortalAccess: [] };
  }

  const missingERPClient: Array<{ id: string; name: string; portalClients: number }> = [];
  const missingPortalAccess: Array<{ id: string; name: string; erpClient: string | null }> = [];

  for (const project of projects) {
    const { data: portalLinks } = await supabase
      .from('client_projects')
      .select('id', { count: 'exact' })
      .eq('project_id', project.id);

    const portalCount = portalLinks?.length ?? 0;
    const hasERPClient = !!project.client_id;

    // Normalize FK response for client
    let erpClientName: string | null = null;
    if (project.client) {
      if (Array.isArray(project.client) && project.client.length > 0) {
        erpClientName = project.client[0]?.name ?? null;
      } else if (!Array.isArray(project.client)) {
        erpClientName = (project.client as { name?: string })?.name ?? null;
      }
    }

    if (portalCount > 0 && !hasERPClient) {
      missingERPClient.push({
        id: project.id,
        name: project.name,
        portalClients: portalCount,
      });
    }

    if (hasERPClient && portalCount === 0) {
      missingPortalAccess.push({
        id: project.id,
        name: project.name,
        erpClient: erpClientName,
      });
    }
  }

  return { missingERPClient, missingPortalAccess };
}
