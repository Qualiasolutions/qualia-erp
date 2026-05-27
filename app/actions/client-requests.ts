'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

import { type ActionResult, isUserAdmin } from './shared';
import { notifyAdminsAndAssignedEmployees } from '@/lib/notifications';
import { notifyAdminAndAssignedOfClientActivity, sendRequestCompletedEmail } from '@/lib/email';
import {
  getClientSharedProjectIds,
  getEmployeeProjectIds,
  isStaffOnProject,
} from '@/lib/auth/is-staff-on-project';
import { FeatureRequestCreateSchema, UpdateFeatureRequestSchema } from '@/lib/validation';
import { assertNotImpersonating } from '@/lib/portal-utils';

export interface ProjectClientSubmission {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  attachments: RequestAttachment[];
  client: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

function isBriefRequest(row: { title: string; brief_data?: unknown | null }): boolean {
  return Boolean(row.brief_data) || row.title.toLowerCase().includes('brief');
}

/**
 * Create a feature request from a client
 */
export async function createFeatureRequest(input: {
  project_id?: string;
  title: string;
  description?: string;
  priority?: string;
  brief_data?: unknown;
}): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const parsed = FeatureRequestCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }
    const safeInput = parsed.data;

    // Verify project_id belongs to this client if provided
    if (safeInput.project_id) {
      const { data: ownership } = await supabase
        .from('client_projects')
        .select('project_id')
        .eq('client_id', user.id)
        .eq('project_id', safeInput.project_id)
        .single();

      if (!ownership) {
        return { success: false, error: 'Project not found or access denied' };
      }
    }

    const { data, error } = await supabase
      .from('client_feature_requests')
      .insert({
        client_id: user.id,
        project_id: safeInput.project_id || null,
        title: safeInput.title.trim(),
        description: safeInput.description?.trim() || null,
        priority: safeInput.priority || 'medium',
        brief_data: safeInput.brief_data ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message || 'Failed to create request' };

    // Add activity log entry and notify assigned employees
    try {
      // Use the specified project_id, or fall back to any linked project
      const activityProjectId = safeInput.project_id || null;
      let resolvedProjectId = activityProjectId;

      if (!resolvedProjectId) {
        const { data: clientProject } = await supabase
          .from('client_projects')
          .select('project_id')
          .eq('client_id', user.id)
          .limit(1)
          .single();
        resolvedProjectId = clientProject?.project_id || null;
      }

      if (resolvedProjectId) {
        await supabase.from('activity_log').insert({
          project_id: resolvedProjectId,
          action_type: 'feature_request',
          actor_id: user.id,
          action_data: { request_title: safeInput.title, request_id: data.id },
          is_client_visible: true,
        });

        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        const actorName = clientProfile?.full_name || 'A client';

        // In-app pulse — admins + assigned employees
        await notifyAdminsAndAssignedEmployees(
          resolvedProjectId,
          `${actorName} submitted a request: ${safeInput.title}`,
          {
            request_id: data.id,
            action_type: 'feature_request',
            link: '/requests',
          }
        );

        notifyAdminAndAssignedOfClientActivity({
          projectId: resolvedProjectId,
          clientName: actorName,
          activityType: 'submitted a feature request',
          activityDetails: `${safeInput.title}${safeInput.description ? `\n\n${safeInput.description}` : ''}`,
        }).catch((err) => console.error('[createFeatureRequest email]', err));
      }
    } catch (err) {
      console.error('[createFeatureRequest] Activity/notification error:', err);
    }

    return { success: true, data };
  } catch (error) {
    console.error('[createFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create request',
    };
  }
}

/**
 * Get feature requests for the current client
 */
export async function getClientFeatureRequests(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserAdmin(user.id);

    // Resolve role to scope the query
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const readClient = !isAdmin && profile?.role === 'employee' ? createAdminClient() : supabase;

    let query = readClient
      .from('client_feature_requests')
      .select(
        `
        id,
        client_id,
        project_id,
        title,
        description,
        priority,
        status,
        admin_response,
        attachments,
        assigned_to,
        created_at,
        updated_at,
        project:projects(id, name, logo_url, client:clients(id, display_name, logo_url)),
        assignee:profiles!client_feature_requests_assigned_to_fkey(id, full_name, avatar_url)
      `
      )
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      if (profile?.role === 'employee') {
        const projectIds = await getEmployeeProjectIds(user.id);
        if (projectIds.length === 0) return { success: true, data: [] };
        query = query.in('project_id', projectIds);
      } else {
        // Clients see every request on a project they share via
        // client_projects (RLS enforces the same boundary). If they have no
        // shared projects, short-circuit to an empty list — querying with
        // an empty .in() would return everything they can read which is
        // not what we want here.
        const sharedProjectIds = await getClientSharedProjectIds(user.id);
        if (sharedProjectIds.length === 0) return { success: true, data: [] };
        query = query.in('project_id', sharedProjectIds);
      }
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message || 'Failed to get requests' };

    const clientIds = Array.from(new Set((data || []).map((r) => r.client_id).filter(Boolean)));
    const clientProfiles = new Map<
      string,
      { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
    >();
    if (clientIds.length > 0) {
      const { data: profiles } = await readClient
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', clientIds);
      for (const profile of profiles || []) {
        clientProfiles.set(profile.id, profile);
      }
    }

    // Normalize FK arrays
    const normalized = (data || []).map((r) => {
      const rec = r as typeof r & {
        assigned_to?: string | null;
        client_id: string;
        project?:
          | {
              id: string;
              name: string;
              logo_url: string | null;
              client:
                | { id: string; display_name: string | null; logo_url: string | null }
                | { id: string; display_name: string | null; logo_url: string | null }[]
                | null;
            }
          | Array<{
              id: string;
              name: string;
              logo_url: string | null;
              client:
                | { id: string; display_name: string | null; logo_url: string | null }
                | { id: string; display_name: string | null; logo_url: string | null }[]
                | null;
            }>
          | null;
        assignee?:
          | { id: string; full_name: string | null; avatar_url: string | null }
          | { id: string; full_name: string | null; avatar_url: string | null }[]
          | null;
      };
      const project = Array.isArray(rec.project) ? rec.project[0] || null : rec.project;
      const crmClient = project?.client
        ? Array.isArray(project.client)
          ? project.client[0] || null
          : project.client
        : null;
      return {
        ...rec,
        project: project ? { ...project, client: crmClient } : null,
        client: clientProfiles.get(rec.client_id) ?? null,
        assignee: Array.isArray(rec.assignee) ? rec.assignee[0] || null : (rec.assignee ?? null),
      };
    });

    return { success: true, data: normalized };
  } catch (error) {
    console.error('[getClientFeatureRequests] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get requests',
    };
  }
}

/**
 * Return submitted project briefs (intake-form feature requests) for a project.
 * Internal-only — admin or employee assigned to the project. Client role gets
 * back an access-denied error since this is the staff-facing readout.
 *
 * Returns rows ordered newest-first. Each row carries the structured
 * `brief_data` when present; the viewer falls back to parsing `description`
 * for older briefs that pre-date the brief_data column.
 */
export async function getProjectBriefs(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      const staff = await isStaffOnProject(user.id, projectId);
      if (!staff) return { success: false, error: 'Access denied' };
    }

    const readClient = createAdminClient();

    const { data, error } = await readClient
      .from('client_feature_requests')
      .select(
        `
        id,
        client_id,
        project_id,
        title,
        description,
        priority,
        status,
        brief_data,
        attachments,
        created_at
      `
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message || 'Failed to load briefs' };

    const briefRows = (data ?? []).filter(isBriefRequest);

    // The client_id FK on client_feature_requests targets auth.users, not
    // profiles, so PostgREST can't embed the submitter. Fetch profiles in a
    // second query keyed by the distinct client_ids.
    const rows = briefRows;
    const submitterIds = Array.from(new Set(rows.map((r) => r.client_id).filter(Boolean)));
    const submittersById = new Map<
      string,
      { id: string; full_name: string | null; avatar_url: string | null }
    >();
    if (submitterIds.length > 0) {
      const { data: profiles } = await readClient
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', submitterIds);
      for (const p of profiles ?? []) submittersById.set(p.id, p);
    }

    const normalized = rows.map((r) => ({
      ...r,
      attachments: Array.isArray(r.attachments) ? (r.attachments as RequestAttachment[]) : [],
      submitter: submittersById.get(r.client_id) ?? null,
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error('[getProjectBriefs] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load briefs',
    };
  }
}

/**
 * Return non-brief client requests for one project so the project page shows
 * operational client submissions without duplicating the dedicated brief panel.
 *
 * Admins and assigned employees see all requests on the project; linked
 * clients only see requests they submitted.
 */
export async function getProjectClientSubmissions(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = await isUserAdmin(user.id);
    let canView = isAdmin;

    if (!canView && profile?.role === 'employee') {
      canView = await isStaffOnProject(user.id, projectId);
    }

    if (!canView && profile?.role === 'client') {
      const { data: link } = await supabase
        .from('client_projects')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('client_id', user.id)
        .maybeSingle();
      canView = Boolean(link);
    }

    if (!canView) return { success: false, error: 'Project not found or access denied' };

    const readClient = createAdminClient();
    let query = readClient
      .from('client_feature_requests')
      .select(
        'id, client_id, title, description, priority, status, admin_response, attachments, brief_data, created_at'
      )
      .eq('project_id', projectId)
      .is('brief_data', null)
      .not('title', 'ilike', '%brief%')
      .order('created_at', { ascending: false });

    if (profile?.role === 'client' && !isAdmin) {
      query = query.eq('client_id', user.id);
    }

    const { data: requests, error } = await query.limit(20);
    if (error) return { success: false, error: error.message || 'Failed to load submissions' };

    const visibleRequests = (requests ?? []).filter((request) => !isBriefRequest(request));
    const clientIds = Array.from(
      new Set(visibleRequests.map((request) => request.client_id).filter(Boolean))
    );
    const clientMap = new Map<
      string,
      { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
    >();

    if (clientIds.length > 0) {
      const { data: clients } = await readClient
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', clientIds);

      for (const client of clients || []) {
        clientMap.set(client.id, client);
      }
    }

    const normalized: ProjectClientSubmission[] = visibleRequests.map((request) => ({
      id: request.id,
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      admin_response: request.admin_response,
      created_at: request.created_at,
      attachments: Array.isArray(request.attachments)
        ? (request.attachments as RequestAttachment[])
        : [],
      client: request.client_id ? clientMap.get(request.client_id) || null : null,
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error('[getProjectClientSubmissions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load project submissions',
    };
  }
}

/**
 * Update a feature request (admin: status/response, client: title/description if pending)
 */
export async function updateFeatureRequest(
  requestId: string,
  updates: {
    status?: string;
    admin_response?: string;
    title?: string;
    description?: string;
  }
): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Validate input with Zod
    const parsed = UpdateFeatureRequestSchema.safeParse(updates);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }
    const safeUpdates = parsed.data;

    const isAdmin = await isUserAdmin(user.id);

    // Capture pre-update status so we can fire the completion email when the
    // kanban drag / status dropdown / detail-sheet transitions status to
    // 'completed'. markFeatureRequestDone() bypasses this path, so the email
    // there isn't double-sent.
    let preStatus: string | null = null;
    let preTitle = '';
    let preClientId: string | null = null;
    if (safeUpdates.status === 'completed') {
      const { data: pre } = await supabase
        .from('client_feature_requests')
        .select('status, title, client_id')
        .eq('id', requestId)
        .maybeSingle();
      preStatus = pre?.status ?? null;
      preTitle = pre?.title ?? '';
      preClientId = pre?.client_id ?? null;
    }

    // Employee-assignee path: if a non-admin employee is the assignee on this
    // request, allow them to update status only (no title/description/response).
    // RLS UPDATE policy stays admin-only, so this path writes via service role
    // after enforcing the gate + column whitelist in code.
    if (!isAdmin && safeUpdates.status !== undefined) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'employee') {
        const { data: req } = await supabase
          .from('client_feature_requests')
          .select('assigned_to')
          .eq('id', requestId)
          .maybeSingle();

        const requestAssignedTo = (req as { assigned_to?: string | null } | null)?.assigned_to;
        if (requestAssignedTo === user.id) {
          const adminClient = createAdminClient();
          const { data, error } = await adminClient
            .from('client_feature_requests')
            .update({
              status: safeUpdates.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .eq('assigned_to', user.id) // belt-and-braces
            .select()
            .single();
          if (error) return { success: false, error: error.message || 'Failed to update request' };
          if (!data) return { success: false, error: 'Request not found' };
          await sendCompletionEmailIfTransitioned({
            newStatus: safeUpdates.status,
            preStatus,
            requestTitle: preTitle,
            clientId: preClientId,
          });
          return { success: true, data };
        }
      }
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (isAdmin) {
      // Admins can update all fields
      if (safeUpdates.status) updateData.status = safeUpdates.status;
      if (safeUpdates.admin_response !== undefined)
        updateData.admin_response = safeUpdates.admin_response;
      if (safeUpdates.title) updateData.title = safeUpdates.title.trim();
      if (safeUpdates.description !== undefined)
        updateData.description = safeUpdates.description?.trim() || null;
    } else {
      // Clients can only update title and description of pending/in_review requests
      if (safeUpdates.title !== undefined) updateData.title = safeUpdates.title.trim();
      if (safeUpdates.description !== undefined)
        updateData.description = safeUpdates.description?.trim() || null;
    }

    let query = supabase.from('client_feature_requests').update(updateData).eq('id', requestId);

    // Non-admin clients can only update their own pending/in_review requests
    if (!isAdmin) {
      query = query.eq('client_id', user.id).in('status', ['pending', 'in_review']);
    }

    const { data, error } = await query.select().single();

    if (error) return { success: false, error: error.message || 'Failed to update request' };

    if (!data) {
      return { success: false, error: 'Request not found or access denied' };
    }

    await sendCompletionEmailIfTransitioned({
      newStatus: safeUpdates.status,
      preStatus,
      requestTitle: preTitle,
      clientId: preClientId,
    });

    return { success: true, data };
  } catch (error) {
    console.error('[updateFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update request',
    };
  }
}

/**
 * Fire-and-log helper. Emails the client when a request transitions to
 * 'completed' (was not completed before). Failures are swallowed — the
 * status change has already committed.
 */
async function sendCompletionEmailIfTransitioned(args: {
  newStatus?: string;
  preStatus: string | null;
  requestTitle: string;
  clientId: string | null;
}): Promise<void> {
  const { newStatus, preStatus, requestTitle, clientId } = args;
  if (newStatus !== 'completed') return;
  if (preStatus === 'completed') return;
  if (!clientId || !requestTitle) return;
  try {
    const supabase = await createClient();
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', clientId)
      .single();
    if (!clientProfile?.email) return;
    await sendRequestCompletedEmail({
      clientEmail: clientProfile.email,
      clientName: clientProfile.full_name,
      requestTitle,
    });
  } catch (err) {
    console.error('[sendCompletionEmailIfTransitioned] failed (non-blocking):', err);
  }
}

/**
 * Admin-only: assign a feature request to a staff member (or unassign via null).
 * The assignee field is intentionally NOT exposed via updateFeatureRequest —
 * clients and even assignees themselves should not be able to reassign.
 */
export async function assignFeatureRequest(
  requestId: string,
  assigneeId: string | null
): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Only admins can assign requests' };
    }

    // If assigning (not unassigning), verify the target is staff
    if (assigneeId !== null) {
      const { data: target } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', assigneeId)
        .single();
      if (!target || (target.role !== 'admin' && target.role !== 'employee')) {
        return { success: false, error: 'Assignee must be an admin or employee' };
      }
    }

    const { data, error } = await supabase
      .from('client_feature_requests')
      .update({
        assigned_to: assigneeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) return { success: false, error: error.message || 'Failed to assign request' };
    if (!data) return { success: false, error: 'Request not found' };

    return { success: true, data };
  } catch (error) {
    console.error('[assignFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign request',
    };
  }
}

/**
 * Cancel a feature request owned by the current client.
 * Uses the existing terminal `declined` status to avoid a live DB constraint
 * change; the portal renders this as "Cancelled" when the response marker is set.
 */
export async function cancelFeatureRequest(requestId: string): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserAdmin(user.id);
    const adminClient = createAdminClient();

    const { data: request, error: readError } = await adminClient
      .from('client_feature_requests')
      .select('id, client_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (readError) return { success: false, error: readError.message || 'Failed to read request' };
    if (!request) return { success: false, error: 'Request not found' };
    if (!isAdmin && request.client_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }
    if (['completed', 'declined'].includes(request.status || '')) {
      return { success: false, error: 'Request is already closed' };
    }

    const { data, error } = await adminClient
      .from('client_feature_requests')
      .update({
        status: 'declined',
        admin_response: 'Cancelled by client',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('id, title, project_id')
      .single();

    if (error) return { success: false, error: error.message || 'Failed to cancel request' };

    // Notify admin + assigned employees only when the cancel was initiated
    // by the client themselves (not an admin canceling on their behalf).
    if (!isAdmin && data.project_id) {
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      notifyAdminAndAssignedOfClientActivity({
        projectId: data.project_id,
        clientName: clientProfile?.full_name || 'A client',
        activityType: 'cancelled a request',
        activityDetails: data.title,
      }).catch((err) => console.error('[cancelFeatureRequest email]', err));
    }

    return { success: true, data };
  } catch (error) {
    console.error('[cancelFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel request',
    };
  }
}

/**
 * Delete a feature request owned by the current client.
 * Clients can delete pending/in-review requests; admins can delete any request.
 */
export async function deleteFeatureRequest(requestId: string): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserAdmin(user.id);
    const adminClient = createAdminClient();

    const { data: request, error: readError } = await adminClient
      .from('client_feature_requests')
      .select('id, client_id, status, attachments, title, project_id')
      .eq('id', requestId)
      .maybeSingle();

    if (readError) return { success: false, error: readError.message || 'Failed to read request' };
    if (!request) return { success: false, error: 'Request not found' };
    if (!isAdmin && request.client_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }
    if (!isAdmin && !['pending', 'in_review'].includes(request.status || '')) {
      return { success: false, error: 'Only pending or in-review requests can be deleted' };
    }

    const attachments = Array.isArray(request.attachments)
      ? (request.attachments as RequestAttachment[])
      : [];
    const storagePaths = attachments.map((a) => a.path).filter(Boolean);
    if (storagePaths.length > 0) {
      await adminClient.storage.from('project-files').remove(storagePaths);
    }

    const { error: commentsError } = await adminClient
      .from('request_comments')
      .delete()
      .eq('request_id', requestId)
      .select('id');
    if (commentsError)
      return {
        success: false,
        error: commentsError.message || 'Failed to delete request comments',
      };
    // deletedComments may be empty if there were no comments — that's OK

    const { data: deletedRequest, error } = await adminClient
      .from('client_feature_requests')
      .delete()
      .eq('id', requestId)
      .select()
      .single();
    if (error) return { success: false, error: error.message || 'Failed to delete request' };
    if (!deletedRequest) return { success: false, error: 'Not found or permission denied' };

    if (!isAdmin && request.project_id) {
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      notifyAdminAndAssignedOfClientActivity({
        projectId: request.project_id,
        clientName: clientProfile?.full_name || 'A client',
        activityType: 'deleted a request',
        activityDetails: request.title,
      }).catch((err) => console.error('[deleteFeatureRequest email]', err));
    }

    return { success: true };
  } catch (error) {
    console.error('[deleteFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete request',
    };
  }
}

// ============================================================================
// SECTION: Feature Request Attachments
// ============================================================================

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB per file
const MAX_ATTACHMENTS_PER_REQUEST = 10;

const ALLOWED_ATTACHMENT_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
]);

export type RequestAttachment = {
  name: string;
  path: string;
  size: number;
  type: string;
  uploaded_at: string;
};

async function assertRequestOwnership(
  requestId: string,
  userId: string
): Promise<
  | { ok: true; request: { id: string; client_id: string; attachments: RequestAttachment[] } }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const isAdmin = await isUserAdmin(userId);
  const { data, error } = await supabase
    .from('client_feature_requests')
    .select('id, client_id, attachments')
    .eq('id', requestId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'Request not found' };
  if (!isAdmin && data.client_id !== userId) return { ok: false, error: 'Access denied' };
  return {
    ok: true,
    request: {
      id: data.id,
      client_id: data.client_id,
      attachments: Array.isArray(data.attachments) ? (data.attachments as RequestAttachment[]) : [],
    },
  };
}

async function assertRequestReadAccess(
  requestId: string,
  userId: string
): Promise<
  | {
      ok: true;
      request: {
        id: string;
        client_id: string;
        project_id: string | null;
        attachments: RequestAttachment[];
      };
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const isAdmin = await isUserAdmin(userId);
  const { data, error } = await supabase
    .from('client_feature_requests')
    .select('id, client_id, project_id, attachments')
    .eq('id', requestId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'Request not found' };
  if (!isAdmin && data.client_id !== userId) {
    if (!data.project_id) return { ok: false, error: 'Access denied' };
    const staff = await isStaffOnProject(userId, data.project_id);
    if (!staff) return { ok: false, error: 'Access denied' };
  }
  return {
    ok: true,
    request: {
      id: data.id,
      client_id: data.client_id,
      project_id: data.project_id,
      attachments: Array.isArray(data.attachments) ? (data.attachments as RequestAttachment[]) : [],
    },
  };
}

/**
 * Upload a file attachment to a feature request.
 * Stored in the `project-files` storage bucket under
 * `feature-requests/<client_id>/<request_id>/<timestamp>_<name>`.
 */
export async function uploadRequestAttachment(formData: FormData): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const requestId = formData.get('request_id') as string | null;
    const file = formData.get('file') as File | null;

    if (!requestId) return { success: false, error: 'request_id required' };
    if (!file) return { success: false, error: 'No file provided' };

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return { success: false, error: 'File size exceeds 20MB limit' };
    }
    if (!ALLOWED_ATTACHMENT_MIME.has(file.type)) {
      return { success: false, error: `File type "${file.type || 'unknown'}" is not allowed` };
    }

    const auth = await assertRequestOwnership(requestId, user.id);
    if (!auth.ok) return { success: false, error: auth.error };

    if (auth.request.attachments.length >= MAX_ATTACHMENTS_PER_REQUEST) {
      return {
        success: false,
        error: `Max ${MAX_ATTACHMENTS_PER_REQUEST} attachments per request`,
      };
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `feature-requests/${auth.request.client_id}/${requestId}/${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.error('[uploadRequestAttachment] Storage error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    const newAttachment: RequestAttachment = {
      name: file.name,
      path: storagePath,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    };

    const updated = [...auth.request.attachments, newAttachment];
    const { data: updatedRow, error: updateError } = await supabase
      .from('client_feature_requests')
      .update({ attachments: updated })
      .eq('id', requestId)
      .select('id')
      .single();

    if (updateError || !updatedRow) {
      await supabase.storage.from('project-files').remove([storagePath]);
      return { success: false, error: 'Failed to save attachment record' };
    }

    return { success: true, data: newAttachment };
  } catch (error) {
    console.error('[uploadRequestAttachment] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload attachment',
    };
  }
}

/**
 * Get a signed download URL for a feature request attachment.
 */
export async function getRequestAttachmentUrl(
  requestId: string,
  attachmentPath: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const auth = await assertRequestReadAccess(requestId, user.id);
    if (!auth.ok) return { success: false, error: auth.error };

    const match = auth.request.attachments.find((a) => a.path === attachmentPath);
    if (!match) return { success: false, error: 'Attachment not found' };

    const { data, error } = await supabase.storage
      .from('project-files')
      .createSignedUrl(attachmentPath, 3600, { download: match.name });

    if (error || !data) return { success: false, error: 'Failed to generate download URL' };
    return { success: true, data: { url: data.signedUrl, filename: match.name } };
  } catch (error) {
    console.error('[getRequestAttachmentUrl] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate URL',
    };
  }
}

/**
 * Delete a feature request attachment (owner or admin).
 */
export async function deleteRequestAttachment(
  requestId: string,
  attachmentPath: string
): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const auth = await assertRequestOwnership(requestId, user.id);
    if (!auth.ok) return { success: false, error: auth.error };

    const match = auth.request.attachments.find((a) => a.path === attachmentPath);
    if (!match) return { success: false, error: 'Attachment not found' };

    await supabase.storage.from('project-files').remove([attachmentPath]);

    const remaining = auth.request.attachments.filter((a) => a.path !== attachmentPath);
    const { data: updatedRow, error } = await supabase
      .from('client_feature_requests')
      .update({ attachments: remaining })
      .eq('id', requestId)
      .select('id')
      .single();

    if (error) return { success: false, error: 'Failed to update request' };
    if (!updatedRow) return { success: false, error: 'Not found or permission denied' };

    return { success: true };
  } catch (error) {
    console.error('[deleteRequestAttachment] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete attachment',
    };
  }
}

/**
 * Mark a feature request as done (admin or assigned employee).
 * Posts a system comment, updates status to 'completed', and sends a
 * notification email to the client. The email is fire-and-log — its
 * failure does NOT roll back the status change.
 */
export async function markFeatureRequestDone(
  requestId: string,
  doneNote?: string
): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Authorization: admin always allowed; employees must be the assigned owner.
    // Use the service role for the request read/write after enforcing that gate
    // in application code; the normal RLS policy does not allow employee status
    // writes even when the UI permits assigned owners to manage the request.
    const isAdmin = await isUserAdmin(user.id);
    const adminClient = createAdminClient();

    const { data: request, error: fetchError } = await adminClient
      .from('client_feature_requests')
      .select('id, title, status, project_id, client_id, assigned_to')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !request) {
      return { success: false, error: 'Request not found' };
    }

    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'employee') {
        return { success: false, error: 'Not authorized' };
      }

      if (request.assigned_to !== user.id) {
        return { success: false, error: 'Not authorized' };
      }
    }

    if (['completed', 'declined'].includes(request.status)) {
      return { success: false, error: 'Request is already closed' };
    }

    // Fetch client email + name
    const { data: clientProfile } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', request.client_id)
      .maybeSingle();

    // Update status to completed
    let updateQuery = adminClient
      .from('client_feature_requests')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (!isAdmin) {
      updateQuery = updateQuery.eq('assigned_to', user.id);
    }

    const { data: updatedRequest, error: updateError } = await updateQuery.select('id').single();

    if (updateError)
      return { success: false, error: updateError.message || 'Failed to mark request as done' };
    if (!updatedRequest) return { success: false, error: 'Not found or permission denied' };

    // Get current user's name for the system comment
    const { data: staffProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const staffName = staffProfile?.full_name || 'Staff';
    const commentBody = `Marked done by ${staffName}${doneNote?.trim() ? ' — ' + doneNote.trim() : ''}`;

    // Post system comment
    await adminClient.from('request_comments').insert({
      request_id: requestId,
      author_id: user.id,
      content: commentBody,
    });

    // Send email notification — fire-and-log
    if (clientProfile?.email) {
      try {
        await sendRequestCompletedEmail({
          clientEmail: clientProfile.email,
          clientName: clientProfile.full_name,
          requestTitle: request.title,
          doneNote: doneNote?.trim() || undefined,
        });
      } catch (emailErr) {
        console.error('[markFeatureRequestDone] Email failed (non-blocking):', emailErr);
      }
    }

    return { success: true, data: { id: requestId, status: 'completed' } };
  } catch (error) {
    console.error('[markFeatureRequestDone] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark request as done',
    };
  }
}

/**
 * Client-initiated reopen of a completed request.
 *
 * If the team marked something done but the client thinks the work isn't
 * actually complete, they can reopen it with a short reason. Status flips
 * `completed → in_progress`, a system comment is posted with the reason,
 * and the admin + assigned employees get notified.
 *
 * Only the request owner (the client who submitted it) or an admin may
 * reopen. The action no-ops with an error if the request isn't currently
 * completed — there's nothing to reopen.
 */
export async function reopenCompletedRequest(
  requestId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      return { success: false, error: 'Tell us briefly why — at least 5 characters.' };
    }
    if (trimmedReason.length > 1000) {
      return { success: false, error: 'Reason is too long (max 1000 characters).' };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserAdmin(user.id);
    const adminClient = createAdminClient();

    const { data: request, error: readError } = await adminClient
      .from('client_feature_requests')
      .select('id, title, status, client_id, project_id')
      .eq('id', requestId)
      .maybeSingle();

    if (readError) return { success: false, error: readError.message || 'Failed to read request' };
    if (!request) return { success: false, error: 'Request not found' };
    if (!isAdmin && request.client_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }
    if (request.status !== 'completed') {
      return { success: false, error: 'Only completed requests can be reopened.' };
    }

    const { error: updateError } = await adminClient
      .from('client_feature_requests')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError)
      return { success: false, error: updateError.message || 'Failed to reopen request' };

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const actorName = actorProfile?.full_name || (isAdmin ? 'Admin' : 'Client');
    const commentBody = `Reopened by ${actorName} — work isn't complete yet: ${trimmedReason}`;

    await adminClient.from('request_comments').insert({
      request_id: requestId,
      author_id: user.id,
      content: commentBody,
    });

    if (!isAdmin && request.project_id) {
      notifyAdminAndAssignedOfClientActivity({
        projectId: request.project_id,
        clientName: actorName,
        activityType: 'reopened a completed request',
        activityDetails: `"${request.title}" — ${trimmedReason}`,
      }).catch((err) => console.error('[reopenCompletedRequest notify]', err));
    }

    return { success: true, data: { id: requestId, status: 'in_progress' } };
  } catch (error) {
    console.error('[reopenCompletedRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reopen request',
    };
  }
}

/**
 * Count open (non-completed, non-declined) feature requests visible to the current user.
 * Admin sees all workspace requests; employee sees requests on assigned projects.
 */
export async function getOpenRequestsCount(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserAdmin(user.id);

    let query = supabase
      .from('client_feature_requests')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("completed","declined")');

    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'employee') {
        const projectIds = await getEmployeeProjectIds(user.id);
        if (projectIds.length === 0) return { success: true, data: 0 };
        query = query.in('project_id', projectIds);
      } else {
        // Client: count every open request on a project they share. Matches
        // the visibility surface in getClientFeatureRequests so the badge
        // and the list stay in sync.
        const sharedProjectIds = await getClientSharedProjectIds(user.id);
        if (sharedProjectIds.length === 0) return { success: true, data: 0 };
        query = query.in('project_id', sharedProjectIds);
      }
    }

    const { count, error } = await query;
    if (error) return { success: false, error: error.message || 'Failed to count requests' };

    return { success: true, data: count ?? 0 };
  } catch (error) {
    console.error('[getOpenRequestsCount] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to count requests',
    };
  }
}
