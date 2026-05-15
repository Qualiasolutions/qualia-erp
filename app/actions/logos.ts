'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateData } from '@/lib/validation';

import type { ActionResult } from './shared';

// ============ ZOD SCHEMAS ============

const projectLogoUploadSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
});

const clientLogoUploadSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
});

const entityIdSchema = z.string().uuid('Invalid ID');

// Max logo size: 5MB
const MAX_LOGO_SIZE = 5 * 1024 * 1024;

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

// Storage bucket name - use existing project-files bucket
const STORAGE_BUCKET = 'project-files';

/**
 * Upload a logo for a project
 */
export async function uploadProjectLogo(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const file = formData.get('file') as File | null;
  const rawProjectId = formData.get('project_id') as string | null;

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  if (!rawProjectId) {
    return { success: false, error: 'Project ID is required' };
  }

  const parsed = validateData(projectLogoUploadSchema, { project_id: rawProjectId });
  if (!parsed.success) return { success: false, error: parsed.error };
  const projectId = parsed.data.project_id;

  // Validate file size
  if (file.size > MAX_LOGO_SIZE) {
    return { success: false, error: 'Logo size exceeds 5MB limit' };
  }

  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
  }

  // Verify project exists and user has access via workspace membership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, workspace_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: 'Project not found' };
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', project.workspace_id)
    .eq('profile_id', user.id)
    .single();

  if (!membership) {
    return { success: false, error: 'Not authorized for this project' };
  }

  // Generate storage path with extension from mime type
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const storagePath = `logos/projects/${projectId}/logo.${ext}`;

  // Use admin client for storage (bypasses storage RLS — auth already verified above)
  const adminClient = createAdminClient();

  // Upload to storage (upsert to replace existing)
  const { error: uploadError } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[uploadProjectLogo] Storage error:', uploadError);
    return { success: false, error: 'Failed to upload logo' };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = adminClient.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  // Add cache-busting timestamp
  const logoUrl = `${publicUrl}?t=${Date.now()}`;

  // Update project with logo URL
  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update({ logo_url: logoUrl })
    .eq('id', projectId)
    .select()
    .single();

  if (updateError) {
    console.error('[uploadProjectLogo] DB error:', updateError);
    // Clean up uploaded file
    await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: 'Failed to update project' };
  }
  if (!updatedProject) {
    await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: 'Project update blocked by RLS' };
  }

  return { success: true, data: { logo_url: logoUrl } };
}

/**
 * Delete a project's logo
 */
export async function deleteProjectLogo(projectId: string): Promise<ActionResult> {
  const parsed = validateData(entityIdSchema, projectId);
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current logo URL to find storage path
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id, logo_url')
    .eq('id', parsed.data)
    .single();

  if (fetchError || !project) {
    return { success: false, error: 'Project not found' };
  }

  // Use admin client for storage (bypasses storage RLS — auth already verified above)
  const adminClient = createAdminClient();

  // Item 20: Batch delete all possible extensions in one call
  const extensions = ['jpg', 'png', 'webp', 'gif', 'avif'];
  await adminClient.storage
    .from(STORAGE_BUCKET)
    .remove(extensions.map((ext) => `logos/projects/${parsed.data}/logo.${ext}`));

  // Clear logo URL in database
  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update({ logo_url: null })
    .eq('id', parsed.data)
    .select()
    .single();

  if (updateError) {
    console.error('[deleteProjectLogo] DB error:', updateError);
    return { success: false, error: 'Failed to update project' };
  }
  if (!updatedProject) {
    return { success: false, error: 'Project update blocked by RLS' };
  }

  return { success: true };
}

/**
 * Upload a logo for a client
 */
export async function uploadClientLogo(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const file = formData.get('file') as File | null;
  const rawClientId = formData.get('client_id') as string | null;

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  if (!rawClientId) {
    return { success: false, error: 'Client ID is required' };
  }

  const parsedClient = validateData(clientLogoUploadSchema, { client_id: rawClientId });
  if (!parsedClient.success) return { success: false, error: parsedClient.error };
  const clientId = parsedClient.data.client_id;

  // Validate file size
  if (file.size > MAX_LOGO_SIZE) {
    return { success: false, error: 'Logo size exceeds 5MB limit' };
  }

  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
  }

  // Verify client exists and user has access via workspace membership
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, workspace_id')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    return { success: false, error: 'Client not found' };
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', client.workspace_id)
    .eq('profile_id', user.id)
    .single();

  if (!membership) {
    return { success: false, error: 'Not authorized for this client' };
  }

  // Generate storage path with extension from mime type
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const storagePath = `logos/clients/${clientId}/logo.${ext}`;

  // Use admin client for storage (bypasses storage RLS — auth already verified above)
  const adminClient = createAdminClient();

  // Upload to storage (upsert to replace existing)
  const { error: uploadError } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[uploadClientLogo] Storage error:', uploadError);
    return { success: false, error: 'Failed to upload logo' };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = adminClient.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  // Add cache-busting timestamp
  const logoUrl = `${publicUrl}?t=${Date.now()}`;

  // Update client with logo URL
  const { data: updatedClient, error: updateError } = await supabase
    .from('clients')
    .update({ logo_url: logoUrl })
    .eq('id', clientId)
    .select()
    .single();

  if (updateError) {
    console.error('[uploadClientLogo] DB error:', updateError);
    // Clean up uploaded file
    await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: 'Failed to update client' };
  }
  if (!updatedClient) {
    await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: 'Client update blocked by RLS' };
  }

  return { success: true, data: { logo_url: logoUrl } };
}

/**
 * Delete a client's logo
 */
export async function deleteClientLogo(clientId: string): Promise<ActionResult> {
  const parsed = validateData(entityIdSchema, clientId);
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify client exists
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, logo_url')
    .eq('id', parsed.data)
    .single();

  if (fetchError || !client) {
    return { success: false, error: 'Client not found' };
  }

  // Use admin client for storage (bypasses storage RLS — auth already verified above)
  const adminClient = createAdminClient();

  // Item 20: Batch delete all possible extensions in one call
  const extensions = ['jpg', 'png', 'webp', 'gif', 'avif'];
  await adminClient.storage
    .from(STORAGE_BUCKET)
    .remove(extensions.map((ext) => `logos/clients/${parsed.data}/logo.${ext}`));

  // Clear logo URL in database
  const { data: updatedClient, error: updateError } = await supabase
    .from('clients')
    .update({ logo_url: null })
    .eq('id', parsed.data)
    .select()
    .single();

  if (updateError) {
    console.error('[deleteClientLogo] DB error:', updateError);
    return { success: false, error: 'Failed to update client' };
  }
  if (!updatedClient) {
    return { success: false, error: 'Client update blocked by RLS' };
  }

  return { success: true };
}
