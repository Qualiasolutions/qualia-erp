'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { type ActionResult, isUserManagerOrAbove } from '../shared';
import { getCurrentWorkspaceId } from '../workspace';
import { randomBytes } from 'node:crypto';
import { inviteClientToProject } from './admin';

// ============================================================================
// SECTION: Client Project Access
// ============================================================================

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
    if (user.id !== clientId && !(await isUserManagerOrAbove(user.id))) {
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
          project_status:status,
          start_date,
          end_date:target_date,
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

// ============================================================================
// SECTION: Client Account Setup & Provisioning
// ============================================================================

/**
 * Setup client access for an existing project.
 * Auto-generates email (slug@clients.qualiasolutions.net) and credentials.
 * If a client already exists for this project, returns their info instead.
 */
export async function setupClientForProject(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found' };
    }

    // Check if client already linked to this project
    const { data: existingLink } = await supabase
      .from('client_projects')
      .select('id, client_id, client:profiles!client_id(id, full_name, email)')
      .eq('project_id', projectId)
      .limit(1)
      .maybeSingle();

    if (existingLink) {
      const client = Array.isArray(existingLink.client)
        ? existingLink.client[0]
        : existingLink.client;
      return {
        success: false,
        error: `This project already has a client: ${client?.full_name || client?.email || 'Unknown'}`,
      };
    }

    // Generate slug from project name
    const slug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 30);

    if (!slug) {
      return { success: false, error: 'Could not generate email from project name' };
    }

    const clientEmail = `${slug}@clients.qualiasolutions.net`;
    const clientName = project.name;

    // Check if this email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', clientEmail)
      .single();

    if (existingProfile) {
      // Profile exists — just link to project
      const linkResult = await inviteClientToProject(projectId, existingProfile.id);
      if (!linkResult.success) return linkResult;
      return {
        success: true,
        data: {
          userId: existingProfile.id,
          email: clientEmail,
          name: clientName,
          alreadyExisted: true,
        },
      };
    }

    // Create auth account via admin API
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return {
        success: false,
        error: 'Service role key not configured. Cannot create client accounts.',
      };
    }

    const tempPassword = `Qualia-${randomBytes(12).toString('base64url')}!`;
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: clientEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'client',
        full_name: clientName,
      },
    });

    if (createError) {
      console.error('[setupClientForProject] Create user error:', createError);
      return {
        success: false,
        error: `Failed to create client account: ${createError.message}`,
      };
    }

    if (!newUserData?.user?.id) {
      return { success: false, error: 'Account created but no user ID returned' };
    }

    const newUserId = newUserData.user.id;

    // Ensure profile exists with client role
    const { error: profileError2 } = await adminClient.from('profiles').upsert(
      {
        id: newUserId,
        email: clientEmail,
        full_name: clientName,
        role: 'client',
      },
      { onConflict: 'id' }
    );

    if (profileError2) {
      console.error('[setupClientForProject] Profile creation error:', profileError2);
      return { success: false, error: 'Account created but profile setup failed' };
    }

    // Link client to project
    const { error: linkError } = await adminClient.from('client_projects').insert({
      client_id: newUserId,
      project_id: projectId,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    });

    if (linkError) {
      console.error('[setupClientForProject] Link error:', linkError);
      // Rollback the created auth user to avoid orphan
      try {
        await adminClient.auth.admin.deleteUser(newUserId);
      } catch (rollbackErr) {
        console.error('[setupClientForProject] Rollback failed:', rollbackErr);
      }
      return {
        success: false,
        error:
          'Account created but failed to link project. Account has been cleaned up — please try again.',
      };
    }

    return {
      success: true,
      data: {
        userId: newUserId,
        email: clientEmail,
        name: clientName,
        tempPassword,
        alreadyExisted: false,
      },
    };
  } catch (error) {
    console.error('[setupClientForProject] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to setup client',
    };
  }
}

// ============================================================================
// SECTION: Portal Project Creation
// ============================================================================

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

    if (!(await isUserManagerOrAbove(user.id))) {
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
      console.error(
        '[createProjectFromPortal] DB error:',
        error.message,
        error.details,
        error.hint
      );
      return { success: false, error: 'Failed to create project. Please try again.' };
    }

    if (!data) {
      console.error('[createProjectFromPortal] No data returned after insert');
      return { success: false, error: 'Project created but no data returned' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[createProjectFromPortal] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project',
    };
  }
}

// ============================================================================
// SECTION: Client Dashboard Data
// ============================================================================

/**
 * Get dashboard summary data for a client.
 *
 * H13 (OPTIMIZE.md): collapsed the previous 3-layer sequential chain
 * (client_projects -> projects -> financial_invoices) into a single JOIN.
 * The `client_projects` select now pulls each linked project's `client_id`
 * via a FK join so we have both portal project ids AND CRM client ids after
 * one round-trip. `projectCount` comes from the same array instead of a
 * duplicate head-only COUNT query.
 */
export async function getClientDashboardData(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id !== clientId && !(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Not authorized' };
    }

    // Single JOIN: client_projects -> projects gives us projectIds + crmClientIds.
    const { data: clientProjectLinks } = await supabase
      .from('client_projects')
      .select('project_id, project:projects!inner(client_id)')
      .eq('client_id', clientId);

    type LinkRow = {
      project_id: string;
      project: { client_id: string | null } | { client_id: string | null }[] | null;
    };
    const links = (clientProjectLinks || []) as unknown as LinkRow[];

    const clientProjectIds = links.map((l) => l.project_id);
    const projectCount = clientProjectIds.length;
    const crmClientIds = Array.from(
      new Set(
        links
          .map((l) => (Array.isArray(l.project) ? l.project[0] : l.project))
          .map((p) => p?.client_id)
          .filter((cid): cid is string => !!cid)
      )
    );

    // Run all remaining dashboard queries in parallel.
    const [{ count: pendingRequests }, { data: unpaidInvoices }, { data: recentActivity }] =
      await Promise.all([
        supabase
          .from('client_feature_requests')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .in('status', ['pending', 'in_review']),
        crmClientIds.length > 0
          ? supabase
              .from('financial_invoices')
              .select('balance')
              .in('client_id', crmClientIds)
              .eq('is_hidden', false)
              .in('status', ['pending', 'overdue'])
          : Promise.resolve({ data: [] as Array<{ balance: number | string }> }),
        clientProjectIds.length > 0
          ? supabase
              .from('activity_log')
              .select(
                `id, action_type, action_data, created_at,
                 actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url),
                 project:projects!activity_log_project_id_fkey(id, name)`
              )
              .eq('is_client_visible', true)
              .in('project_id', clientProjectIds)
              .order('created_at', { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [] }),
      ]);

    const unpaidTotal = (unpaidInvoices || []).reduce((sum, inv) => sum + Number(inv.balance), 0);

    const normalizedActivity = (recentActivity || []).map((a) => ({
      ...a,
      actor: Array.isArray(a.actor) ? a.actor[0] || null : a.actor,
      project: Array.isArray(a.project) ? a.project[0] || null : a.project,
    }));

    return {
      success: true,
      data: {
        projectCount,
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
 * Get client dashboard projects with phase progress.
 *
 * H13 (OPTIMIZE.md): collapsed the 3-query chain
 * (client_projects -> projects -> project_phases) into a single JOIN:
 * `client_projects -> projects -> project_phases`. One round-trip returns
 * each linked project and its ordered phase array in one shot.
 */
export async function getClientDashboardProjects(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id !== clientId && !(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Not authorized' };
    }

    // Single JOIN: client_projects -> projects -> project_phases.
    const { data: rawRows } = await supabase
      .from('client_projects')
      .select(
        `
        project:projects!inner(
          id,
          name,
          status,
          project_type,
          description,
          phases:project_phases(id, name, status, sort_order, phase_type)
        )
      `
      )
      .eq('client_id', clientId);

    if (!rawRows || rawRows.length === 0) {
      return { success: true, data: [] };
    }

    type PhaseRow = {
      id: string;
      name: string;
      status: string | null;
      sort_order: number | null;
      phase_type: string | null;
    };
    type ProjectRow = {
      id: string;
      name: string;
      status: string | null;
      project_type: string | null;
      description: string | null;
      phases: PhaseRow[] | null;
    };
    type LinkRow = { project: ProjectRow | ProjectRow[] | null };

    // Normalize + sort + dedupe by project id.
    const byId = new Map<string, ProjectRow>();
    for (const row of rawRows as unknown as LinkRow[]) {
      const proj = Array.isArray(row.project) ? row.project[0] : row.project;
      if (!proj || byId.has(proj.id)) continue;
      byId.set(proj.id, proj);
    }
    const projects = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));

    const projectsWithPhases = projects.map((project) => {
      // Exclude milestone rollup rows — they're derived headers, not real phases.
      const projectPhases = [...(project.phases || [])]
        .filter((p) => p.phase_type !== 'milestone')
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const completedCount = projectPhases.filter(
        (p) => p.status === 'completed' || p.status === 'done'
      ).length;
      const progress =
        projectPhases.length > 0 ? Math.round((completedCount / projectPhases.length) * 100) : 0;

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

// ============================================================================
// SECTION: Project Features & Media
// ============================================================================

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
    if (!(await isUserManagerOrAbove(user.id))) {
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

    // Normalize FK arrays and get public URLs (bucket is public)
    const features = (data || []).map((file) => {
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(file.storage_path);

      return {
        ...file,
        uploader: Array.isArray(file.uploader) ? file.uploader[0] || null : file.uploader,
        url: urlData?.publicUrl || null,
      };
    });

    return { success: true, data: features };
  } catch (error) {
    console.error('[getProjectFeatures] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get project features',
    };
  }
}
