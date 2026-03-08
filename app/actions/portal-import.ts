'use server';

import { createClient } from '@/lib/supabase/server';
import { type ActionResult, isUserManagerOrAbove } from './shared';

export type ProjectForImport = {
  id: string;
  name: string;
  project_type: string | null;
  project_status: string | null;
  client_id: string | null;
  erpClient: { name: string | null; company_name: string | null } | null;
  portalAccessCount: number;
  hasPortalAccess: boolean;
};

/**
 * Get all active ERP projects with their portal access status.
 * Returns projects sorted by portal access status (not-enabled first) then name.
 * Used by admin import page to show which projects can be enabled for client portal.
 */
export async function getProjectsForPortalImport(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Authorization: require manager or admin
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin or manager access required' };
    }

    // Query projects with client_projects join to get portal access count
    const { data: projects, error } = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        project_type,
        project_status,
        client_id,
        client:clients(name, company_name)
      `
      )
      .in('project_status', ['Active', 'Demos', 'Delayed'])
      .order('name', { ascending: true });

    if (error) {
      console.error('[getProjectsForPortalImport] Query error:', error);
      return { success: false, error: error.message };
    }

    if (!projects) {
      return { success: true, data: [] };
    }

    // For each project, get portal access count from client_projects
    const projectsWithStatus: ProjectForImport[] = await Promise.all(
      projects.map(async (project) => {
        const { count } = await supabase
          .from('client_projects')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id);

        const portalAccessCount = count ?? 0;

        // Normalize FK response for erpClient
        let erpClient: { name: string | null; company_name: string | null } | null = null;
        if (project.client) {
          if (Array.isArray(project.client) && project.client.length > 0) {
            erpClient = {
              name: project.client[0]?.name ?? null,
              company_name: project.client[0]?.company_name ?? null,
            };
          } else if (!Array.isArray(project.client)) {
            const clientData = project.client as {
              name?: string | null;
              company_name?: string | null;
            };
            erpClient = {
              name: clientData.name ?? null,
              company_name: clientData.company_name ?? null,
            };
          }
        }

        return {
          id: project.id,
          name: project.name,
          project_type: project.project_type,
          project_status: project.project_status,
          client_id: project.client_id,
          erpClient,
          portalAccessCount,
          hasPortalAccess: portalAccessCount > 0,
        };
      })
    );

    // Sort by hasPortalAccess ASC (false first), then name ASC
    projectsWithStatus.sort((a, b) => {
      if (a.hasPortalAccess !== b.hasPortalAccess) {
        return a.hasPortalAccess ? 1 : -1; // not-enabled first
      }
      return a.name.localeCompare(b.name);
    });

    return { success: true, data: projectsWithStatus };
  } catch (error) {
    console.error('[getProjectsForPortalImport] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects',
    };
  }
}

/**
 * Get project roadmap preview data for admin preview modal.
 * Returns project details and phases (no phase items or tasks - client-facing view only).
 * Used by roadmap preview modal before enabling portal access.
 */
export async function getProjectPhasesForPreview(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Authorization: require manager or admin
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin or manager access required' };
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description, project_type, project_status')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('[getProjectPhasesForPreview] Project query error:', projectError);
      return { success: false, error: projectError.message };
    }

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Fetch project phases (sorted by sort_order)
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id, name, description, status, start_date, end_date, sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (phasesError) {
      console.error('[getProjectPhasesForPreview] Phases query error:', phasesError);
      return { success: false, error: phasesError.message };
    }

    return {
      success: true,
      data: {
        project,
        phases: phases || [],
      },
    };
  } catch (error) {
    console.error('[getProjectPhasesForPreview] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch project roadmap',
    };
  }
}
