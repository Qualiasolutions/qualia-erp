'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ActionResult, isUserAdmin } from './shared';
import { getCurrentWorkspaceId } from './workspace';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://qualia-erp.vercel.app';

/**
 * Invite a client to a project by email.
 * If the client already has a Supabase account, links them directly.
 * If not, creates an auth account via inviteUserByEmail and links once profile exists.
 */
export async function inviteClientByEmail(
  projectId: string,
  email: string,
  clientName?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Only admins can invite clients' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if a profile with this email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', normalizedEmail)
      .single();

    if (existingProfile) {
      // Profile exists — check role
      if (existingProfile.role === 'admin' || existingProfile.role === 'employee') {
        return {
          success: false,
          error: 'This email belongs to a team member, not a client',
        };
      }

      // Already a client profile — just link to project
      return inviteClientToProject(projectId, existingProfile.id);
    }

    // No existing profile — create auth account via admin API
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return {
        success: false,
        error: 'Service role key not configured. Cannot invite new users.',
      };
    }

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${APP_URL}/portal`,
        data: {
          role: 'client',
          full_name: clientName || null,
        },
      }
    );

    if (inviteError) {
      console.error('[inviteClientByEmail] Invite error:', inviteError);
      return {
        success: false,
        error: `Failed to send invite: ${inviteError.message}`,
      };
    }

    if (!inviteData?.user?.id) {
      return { success: false, error: 'Invite sent but no user ID returned' };
    }

    const newUserId = inviteData.user.id;

    // Ensure profile exists with client role (Supabase trigger may create it,
    // but we upsert to be safe)
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: newUserId,
        email: normalizedEmail,
        full_name: clientName || null,
        role: 'client',
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('[inviteClientByEmail] Profile creation error:', profileError);
      // Don't fail — the invite was sent, profile will be created on signup
    }

    // Link client to project
    const { error: linkError } = await adminClient.from('client_projects').insert({
      client_id: newUserId,
      project_id: projectId,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    });

    if (linkError) {
      console.error('[inviteClientByEmail] Link error:', linkError);
      return {
        success: false,
        error: 'Invite sent but failed to link project. Try adding manually.',
      };
    }

    revalidatePath('/clients');
    revalidatePath('/projects');
    revalidatePath('/portal');

    return {
      success: true,
      data: { userId: newUserId, emailSent: true },
    };
  } catch (error) {
    console.error('[inviteClientByEmail] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite client',
    };
  }
}

/**
 * Invite a client to a project (by existing profile ID).
 * Creates a link in client_projects table allowing the client to view the project.
 */
export async function inviteClientToProject(
  projectId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Only admins can invite clients to projects' };
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('client_projects')
      .select('id')
      .eq('client_id', clientId)
      .eq('project_id', projectId)
      .single();

    if (existingLink) {
      return { success: false, error: 'Client is already invited to this project' };
    }

    // Create the client-project link
    const { data, error } = await supabase
      .from('client_projects')
      .insert({
        client_id: clientId,
        project_id: projectId,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/clients');
    revalidatePath('/projects');
    revalidatePath('/portal');

    return { success: true, data };
  } catch (error) {
    console.error('Failed to invite client to project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite client',
    };
  }
}

/**
 * Remove a client's access to a project
 * Deletes the client_projects link
 */
export async function removeClientFromProject(
  projectId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Only admins can remove client access' };
    }

    // Delete the client-project link
    const { error } = await supabase
      .from('client_projects')
      .delete()
      .eq('client_id', clientId)
      .eq('project_id', projectId);

    if (error) throw error;

    revalidatePath('/clients');
    revalidatePath('/projects');
    revalidatePath('/portal');

    return { success: true };
  } catch (error) {
    console.error('Failed to remove client from project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove client access',
    };
  }
}

/**
 * Get all projects a client has access to
 * Returns projects with full details joined from projects table
 */
export async function getClientProjects(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Authorization: user can only query their own projects unless admin
    if (user.id !== clientId && !(await isUserAdmin(user.id))) {
      return { success: false, error: 'Not authorized to view these projects' };
    }

    // Query client_projects with project details
    const { data, error } = await supabase
      .from('client_projects')
      .select(
        `
        id,
        client_id,
        project_id,
        access_level,
        invited_at,
        invited_by,
        project:projects (
          id,
          name,
          description,
          project_type,
          project_status,
          start_date,
          end_date,
          lead_id,
          client_id,
          workspace_id,
          created_at,
          updated_at
        )
      `
      )
      .eq('client_id', clientId)
      .order('invited_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to get client projects:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get client projects',
    };
  }
}

/**
 * Get admin portal management data:
 * - All projects with their assigned client count
 * - All client accounts with their project assignments
 */
export async function getPortalAdminData(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Get all client accounts
    const { data: clients, error: clientsError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (clientsError) {
      return { success: false, error: clientsError.message };
    }

    // Get all client-project assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('client_projects')
      .select(
        `
        id,
        client_id,
        project_id,
        access_level,
        invited_at,
        invited_by,
        client:profiles!client_id(id, full_name, email),
        project:projects!project_id(id, name, status, project_type)
      `
      )
      .order('invited_at', { ascending: false });

    if (assignmentsError) {
      return { success: false, error: assignmentsError.message };
    }

    // Normalize FK arrays
    const normalizedAssignments = (assignments || []).map((a) => ({
      ...a,
      client: Array.isArray(a.client) ? a.client[0] || null : a.client,
      project: Array.isArray(a.project) ? a.project[0] || null : a.project,
    }));

    return {
      success: true,
      data: {
        clients: clients || [],
        assignments: normalizedAssignments,
      },
    };
  } catch (error) {
    console.error('[getPortalAdminData] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load admin data',
    };
  }
}

/**
 * Reset a client's password by sending a reset email
 */
export async function sendClientPasswordReset(email: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${APP_URL}/auth/reset-password/confirm`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[sendClientPasswordReset] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reset email',
    };
  }
}

/**
 * Create a project from the portal admin panel.
 * Simplified version — auto-assigns workspace and first available team.
 */
export async function createProjectFromPortal(input: {
  name: string;
  project_type: string;
  description?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    if (!input.name.trim()) {
      return { success: false, error: 'Project name is required' };
    }

    // Get workspace
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: 'No workspace found' };
    }

    // Get first available team in workspace
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .single();

    if (!team) {
      return { success: false, error: 'No team found in workspace' };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        project_type: input.project_type || null,
        status: 'Active',
        team_id: team.id,
        lead_id: user.id,
        workspace_id: workspaceId,
      })
      .select('id, name, status, project_type')
      .single();

    if (error) {
      console.error('[createProjectFromPortal] Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath('/portal');

    return { success: true, data };
  } catch (error) {
    console.error('[createProjectFromPortal] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project',
    };
  }
}

/**
 * Get invoices for the current client user
 */
export async function getClientInvoices(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserAdmin(user.id);

    let query = supabase
      .from('client_invoices')
      .select(
        `
        id,
        client_id,
        project_id,
        invoice_number,
        amount,
        currency,
        status,
        issued_date,
        due_date,
        paid_date,
        description,
        file_url,
        created_at,
        project:projects(id, name)
      `
      )
      .order('issued_date', { ascending: false });

    if (!isAdmin) {
      query = query.eq('client_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((inv) => ({
      ...inv,
      project: Array.isArray(inv.project) ? inv.project[0] || null : inv.project,
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error('[getClientInvoices] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invoices',
    };
  }
}

/**
 * Get dashboard summary data for a client
 */
export async function getClientDashboardData(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id !== clientId && !(await isUserAdmin(user.id))) {
      return { success: false, error: 'Not authorized' };
    }

    // Get projects count
    const { count: projectCount } = await supabase
      .from('client_projects')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId);

    // Get pending requests count
    const { count: pendingRequests } = await supabase
      .from('client_feature_requests')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .in('status', ['pending', 'in_review']);

    // Get unpaid invoices count + total
    const { data: unpaidInvoices } = await supabase
      .from('client_invoices')
      .select('amount')
      .eq('client_id', clientId)
      .in('status', ['pending', 'overdue']);

    const unpaidTotal = (unpaidInvoices || []).reduce((sum, inv) => sum + Number(inv.amount), 0);

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('activity_log')
      .select('id, action_type, action_data, created_at, project:projects(id, name)')
      .eq('is_client_visible', true)
      .in(
        'project_id',
        (
          await supabase.from('client_projects').select('project_id').eq('client_id', clientId)
        ).data?.map((cp) => cp.project_id) || []
      )
      .order('created_at', { ascending: false })
      .limit(5);

    const normalizedActivity = (recentActivity || []).map((a) => ({
      ...a,
      project: Array.isArray(a.project) ? a.project[0] || null : a.project,
    }));

    return {
      success: true,
      data: {
        projectCount: projectCount || 0,
        pendingRequests: pendingRequests || 0,
        unpaidInvoiceCount: (unpaidInvoices || []).length,
        unpaidTotal,
        recentActivity: normalizedActivity,
      },
    };
  } catch (error) {
    console.error('[getClientDashboardData] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard data',
    };
  }
}

/**
 * Get client dashboard projects with phase progress
 */
export async function getClientDashboardProjects(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id !== clientId && !(await isUserAdmin(user.id))) {
      return { success: false, error: 'Not authorized' };
    }

    // Get client's project IDs
    const { data: clientProjects } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', clientId);

    if (!clientProjects || clientProjects.length === 0) {
      return { success: true, data: [] };
    }

    const projectIds = clientProjects.map((cp) => cp.project_id);

    // Get project details
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, project_type, description')
      .in('id', projectIds)
      .order('name');

    if (!projects || projects.length === 0) {
      return { success: true, data: [] };
    }

    // Get all phases for these projects
    const { data: phases } = await supabase
      .from('project_phases')
      .select('id, project_id, name, status, sort_order')
      .in('project_id', projectIds)
      .order('sort_order', { ascending: true });

    // Build response with phase data per project
    const projectsWithPhases = projects.map((project) => {
      const projectPhases = (phases || []).filter((p) => p.project_id === project.id);
      const completedCount = projectPhases.filter(
        (p) => p.status === 'completed' || p.status === 'done'
      ).length;
      const progress =
        projectPhases.length > 0 ? Math.round((completedCount / projectPhases.length) * 100) : 0;

      // Find current phase (first non-completed)
      const currentPhase = projectPhases.find(
        (p) => p.status !== 'completed' && p.status !== 'done'
      );
      const currentPhaseIndex = currentPhase ? projectPhases.indexOf(currentPhase) : -1;
      const nextPhase =
        currentPhaseIndex >= 0 && currentPhaseIndex < projectPhases.length - 1
          ? projectPhases[currentPhaseIndex + 1]
          : null;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        project_type: project.project_type,
        description: project.description,
        progress,
        totalPhases: projectPhases.length,
        completedPhases: completedCount,
        currentPhase: currentPhase
          ? { name: currentPhase.name, status: currentPhase.status }
          : null,
        nextPhase: nextPhase ? { name: nextPhase.name } : null,
      };
    });

    return { success: true, data: projectsWithPhases };
  } catch (error) {
    console.error('[getClientDashboardProjects] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard projects',
    };
  }
}

/**
 * Get cross-project activity feed for a client (Messages page)
 */
export async function getClientActivityFeed(
  clientId: string,
  limit = 20,
  cursor?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id !== clientId && !(await isUserAdmin(user.id))) {
      return { success: false, error: 'Not authorized' };
    }

    // Get client's project IDs
    const { data: clientProjects } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', clientId);

    if (!clientProjects || clientProjects.length === 0) {
      return { success: true, data: { items: [], hasMore: false, nextCursor: null } };
    }

    const projectIds = clientProjects.map((cp) => cp.project_id);

    let query = supabase
      .from('activity_log')
      .select(
        `
        id,
        project_id,
        action_type,
        actor_id,
        action_data,
        is_client_visible,
        created_at,
        project:projects(id, name),
        actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url)
      `
      )
      .eq('is_client_visible', true)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((entry) => ({
      ...entry,
      project: Array.isArray(entry.project) ? entry.project[0] || null : entry.project,
      actor: Array.isArray(entry.actor) ? entry.actor[0] || null : entry.actor,
    }));

    const hasMore = normalized.length === limit;
    const lastItem = normalized[normalized.length - 1];
    const nextCursor = lastItem ? lastItem.created_at : null;

    return {
      success: true,
      data: { items: normalized, hasMore, nextCursor },
    };
  } catch (error) {
    console.error('[getClientActivityFeed] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get activity feed',
    };
  }
}

/**
 * Update client profile (name, company)
 */
export async function updateClientProfile(updates: {
  full_name?: string;
  company?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const updateData: Record<string, unknown> = {};
    if (updates.full_name !== undefined) updateData.full_name = updates.full_name.trim();
    if (updates.company !== undefined) updateData.company = updates.company?.trim() || null;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);

    if (error) throw error;

    revalidatePath('/portal/settings');
    revalidatePath('/portal');
    return { success: true };
  } catch (error) {
    console.error('[updateClientProfile] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}

/**
 * Get notification preferences for the current user
 */
export async function getNotificationPreferences(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No workspace found' };

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // If no preferences exist, return defaults
    if (!data) {
      return {
        success: true,
        data: {
          task_assigned: true,
          task_due_soon: true,
          project_update: true,
          meeting_reminder: true,
          client_activity: true,
          delivery_method: 'both',
        },
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getNotificationPreferences] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notification preferences',
    };
  }
}

/**
 * Update notification preferences for the current user
 */
export async function updateNotificationPreferences(preferences: {
  task_assigned?: boolean;
  task_due_soon?: boolean;
  project_update?: boolean;
  meeting_reminder?: boolean;
  client_activity?: boolean;
  delivery_method?: 'email' | 'in_app' | 'both';
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No workspace found' };

    // Upsert preferences (create if doesn't exist, update if it does)
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          workspace_id: workspaceId,
          ...preferences,
        },
        {
          onConflict: 'user_id,workspace_id',
        }
      )
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/portal/settings');
    revalidatePath('/portal');
    return { success: true };
  } catch (error) {
    console.error('[updateNotificationPreferences] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update notification preferences',
    };
  }
}

/**
 * Get project features (screenshots, mockups, design images)
 * Returns image files marked as client-visible for the features gallery
 */
export async function getProjectFeatures(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Authorization: user must have access to this project
    if (!(await isUserAdmin(user.id))) {
      // Check client access
      const { data: clientProject } = await supabase
        .from('client_projects')
        .select('id')
        .eq('client_id', user.id)
        .eq('project_id', projectId)
        .single();

      if (!clientProject) {
        return { success: false, error: 'Not authorized to view this project' };
      }
    }

    // Get image files that are client-visible
    const { data, error } = await supabase
      .from('project_files')
      .select(
        `
        id,
        name,
        original_name,
        description,
        file_size,
        mime_type,
        storage_path,
        phase_name,
        created_at,
        uploaded_by,
        uploader:profiles!project_files_uploaded_by_fkey(id, full_name, avatar_url)
      `
      )
      .eq('project_id', projectId)
      .eq('is_client_visible', true)
      .or('mime_type.like.image/%')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Normalize FK arrays and get signed URLs
    const features = await Promise.all(
      (data || []).map(async (file) => {
        const { data: urlData } = await supabase.storage
          .from('project-files')
          .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

        return {
          ...file,
          uploader: Array.isArray(file.uploader) ? file.uploader[0] || null : file.uploader,
          url: urlData?.signedUrl || null,
        };
      })
    );

    return { success: true, data: features };
  } catch (error) {
    console.error('[getProjectFeatures] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get project features',
    };
  }
}
