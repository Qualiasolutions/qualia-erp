'use server';

import { createClient } from '@/lib/supabase/server';

import { type ActionResult, isUserManagerOrAbove } from './shared';
import { notifyAssignedEmployees } from '@/lib/notifications';
import { FeatureRequestCreateSchema, UpdateFeatureRequestSchema } from '@/lib/validation';
import { assertNotImpersonating } from '@/lib/portal-utils';

/**
 * Create a feature request from a client
 */
export async function createFeatureRequest(input: {
  project_id?: string;
  title: string;
  description?: string;
  priority?: string;
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
      })
      .select()
      .single();

    if (error) throw error;

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

        await notifyAssignedEmployees(
          resolvedProjectId,
          `Client submitted feature request: ${safeInput.title}`,
          {
            request_id: data.id,
            action_type: 'feature_request',
          }
        );
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

    const isAdmin = await isUserManagerOrAbove(user.id);

    let query = supabase
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
        created_at,
        updated_at,
        project:projects(id, name)
      `
      )
      .order('created_at', { ascending: false });

    // Clients only see their own (RLS enforces this too)
    if (!isAdmin) {
      query = query.eq('client_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Normalize FK arrays
    const normalized = (data || []).map((r) => ({
      ...r,
      project: Array.isArray(r.project) ? r.project[0] || null : r.project,
    }));

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

    const isAdmin = await isUserManagerOrAbove(user.id);

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

    if (error) throw error;

    if (!data) {
      return { success: false, error: 'Request not found or access denied' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[updateFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update request',
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
  const isAdmin = await isUserManagerOrAbove(userId);
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
    const { error: updateError } = await supabase
      .from('client_feature_requests')
      .update({ attachments: updated })
      .eq('id', requestId);

    if (updateError) {
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

    const auth = await assertRequestOwnership(requestId, user.id);
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
    const { error } = await supabase
      .from('client_feature_requests')
      .update({ attachments: remaining })
      .eq('id', requestId);

    if (error) return { success: false, error: 'Failed to update request' };

    return { success: true };
  } catch (error) {
    console.error('[deleteRequestAttachment] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete attachment',
    };
  }
}
