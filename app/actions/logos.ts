'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

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
  const projectId = formData.get('project_id') as string | null;

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  if (!projectId) {
    return { success: false, error: 'Project ID is required' };
  }

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
    .eq('user_id', user.id)
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
  const { error: updateError } = await supabase
    .from('projects')
    .update({ logo_url: logoUrl })
    .eq('id', projectId);

  if (updateError) {
    console.error('[uploadProjectLogo] DB error:', updateError);
    // Clean up uploaded file
    await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: 'Failed to update project' };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  revalidatePath('/');

  return { success: true, data: { logo_url: logoUrl } };
}

/**
 * Delete a project's logo
 */
export async function deleteProjectLogo(projectId: string): Promise<ActionResult> {
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
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    return { success: false, error: 'Project not found' };
  }

  // Use admin client for storage (bypasses storage RLS — auth already verified above)
  const adminClient = createAdminClient();

  // Delete from storage (try common extensions)
  const extensions = ['jpg', 'png', 'webp', 'gif', 'avif'];
  for (const ext of extensions) {
    await adminClient.storage
      .from(STORAGE_BUCKET)
      .remove([`logos/projects/${projectId}/logo.${ext}`]);
  }

  // Clear logo URL in database
  const { error: updateError } = await supabase
    .from('projects')
    .update({ logo_url: null })
    .eq('id', projectId);

  if (updateError) {
    console.error('[deleteProjectLogo] DB error:', updateError);
    return { success: false, error: 'Failed to update project' };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  revalidatePath('/');

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
  const clientId = formData.get('client_id') as string | null;

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  if (!clientId) {
    return { success: false, error: 'Client ID is required' };
  }

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
    .eq('user_id', user.id)
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
  const { error: updateError } = await supabase
    .from('clients')
    .update({ logo_url: logoUrl })
    .eq('id', clientId);

  if (updateError) {
    console.error('[uploadClientLogo] DB error:', updateError);
    // Clean up uploaded file
    await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: 'Failed to update client' };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath('/clients');

  return { success: true, data: { logo_url: logoUrl } };
}

/**
 * Delete a client's logo
 */
export async function deleteClientLogo(clientId: string): Promise<ActionResult> {
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
    .eq('id', clientId)
    .single();

  if (fetchError || !client) {
    return { success: false, error: 'Client not found' };
  }

  // Use admin client for storage (bypasses storage RLS — auth already verified above)
  const adminClient = createAdminClient();

  // Delete from storage (try common extensions)
  const extensions = ['jpg', 'png', 'webp', 'gif', 'avif'];
  for (const ext of extensions) {
    await adminClient.storage
      .from(STORAGE_BUCKET)
      .remove([`logos/clients/${clientId}/logo.${ext}`]);
  }

  // Clear logo URL in database
  const { error: updateError } = await supabase
    .from('clients')
    .update({ logo_url: null })
    .eq('id', clientId);

  if (updateError) {
    console.error('[deleteClientLogo] DB error:', updateError);
    return { success: false, error: 'Failed to update client' };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath('/clients');

  return { success: true };
}
