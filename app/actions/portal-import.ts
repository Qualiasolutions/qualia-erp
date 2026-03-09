'use server';

import { createClient } from '@/lib/supabase/server';
import { type ActionResult, isUserManagerOrAbove } from './shared';
import { portalSettingsSchema, type PortalSettingsInput } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export type ProjectForImport = {
  id: string;
  name: string;
  project_type: string | null;
  project_status: string | null;
  client_id: string | null;
  erpClient: { name: string | null; display_name: string | null } | null;
  portalAccessCount: number;
  hasPortalAccess: boolean;
  hasPortalSettings: boolean;
  // Invitation fields (from client_invitations join)
  invitationId?: string;
  invitedEmail?: string;
  invitationStatus?: 'sent' | 'resent' | 'opened' | 'accepted';
  invitedAt?: string;
  resentCount?: number;
  metadata?: { portal_settings?: { welcome_message?: string } };
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

    // Query projects with metadata to check portal_settings and latest invitation status
    const { data: projects, error } = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        project_type,
        project_status,
        client_id,
        metadata,
        client:clients(name, display_name)
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

    // For each project, get portal access count and latest invitation from client_projects and client_invitations
    const projectsWithStatus: ProjectForImport[] = await Promise.all(
      projects.map(async (project) => {
        // Get portal access count
        const { count } = await supabase
          .from('client_projects')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id);

        const portalAccessCount = count ?? 0;

        // Get latest invitation for this project
        const { data: latestInvitation } = await supabase
          .from('client_invitations')
          .select('id, email, status, invited_at, resent_count')
          .eq('project_id', project.id)
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check if portal settings are configured in metadata
        const metadata = project.metadata as { portal_settings?: unknown } | null;
        const hasPortalSettings = !!metadata?.portal_settings;

        // Normalize FK response for erpClient
        let erpClient: { name: string | null; display_name: string | null } | null = null;
        if (project.client) {
          if (Array.isArray(project.client) && project.client.length > 0) {
            erpClient = {
              name: project.client[0]?.name ?? null,
              display_name: project.client[0]?.display_name ?? null,
            };
          } else if (!Array.isArray(project.client)) {
            const clientData = project.client as {
              name?: string | null;
              display_name?: string | null;
            };
            erpClient = {
              name: clientData.name ?? null,
              display_name: clientData.display_name ?? null,
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
          hasPortalSettings,
          metadata: project.metadata as { portal_settings?: { welcome_message?: string } },
          // Invitation fields
          invitationId: latestInvitation?.id,
          invitedEmail: latestInvitation?.email,
          invitationStatus: latestInvitation?.status as
            | 'sent'
            | 'resent'
            | 'opened'
            | 'accepted'
            | undefined,
          invitedAt: latestInvitation?.invited_at,
          resentCount: latestInvitation?.resent_count,
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

/**
 * Save portal settings for selected projects.
 * Updates project.metadata JSONB column with portal_settings object.
 * Used by admin portal settings modal before Phase 18 invitation system.
 */
export async function savePortalSettings(input: PortalSettingsInput): Promise<ActionResult> {
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

    // Validate input
    const validation = portalSettingsSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid portal settings',
      };
    }

    const { projectIds, welcomeMessage, visibilitySettings } = validation.data;

    // Portal settings object to store in metadata
    const portalSettings = {
      welcomeMessage,
      visibilitySettings,
      configuredAt: new Date().toISOString(),
      configuredBy: user.id,
    };

    // Update each project's metadata
    const updatePromises = projectIds.map(async (projectId) => {
      // Verify project exists and get current metadata
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('id, metadata, workspace_id')
        .eq('id', projectId)
        .single();

      if (fetchError || !project) {
        console.error(`[savePortalSettings] Project ${projectId} not found:`, fetchError);
        return { success: false, projectId };
      }

      // Merge portal_settings into existing metadata
      const updatedMetadata = {
        ...(project.metadata || {}),
        portal_settings: portalSettings,
      };

      // Update project metadata
      const { error: updateError } = await supabase
        .from('projects')
        .update({ metadata: updatedMetadata })
        .eq('id', projectId);

      if (updateError) {
        console.error(`[savePortalSettings] Failed to update project ${projectId}:`, updateError);
        return { success: false, projectId };
      }

      // Log activity
      await supabase.from('activities').insert({
        action_type: 'project_updated',
        actor_id: user.id,
        project_id: projectId,
        workspace_id: project.workspace_id,
        details: {
          action: 'portal_settings_configured',
          visibility: visibilitySettings,
          hasWelcomeMessage: !!welcomeMessage,
        },
      });

      return { success: true, projectId };
    });

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter((r) => r.success);
    const failedUpdates = results.filter((r) => !r.success);

    if (failedUpdates.length > 0) {
      console.error('[savePortalSettings] Some updates failed:', failedUpdates);
    }

    if (successfulUpdates.length === 0) {
      return { success: false, error: 'Failed to save portal settings for any project' };
    }

    // Revalidate import page to show updated status
    revalidatePath('/admin/projects/import');

    return {
      success: true,
      data: {
        savedCount: successfulUpdates.length,
        projectIds: successfulUpdates.map((r) => r.projectId),
      },
    };
  } catch (error) {
    console.error('[savePortalSettings] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save portal settings',
    };
  }
}
