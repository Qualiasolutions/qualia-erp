'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ProjectFile } from '@/types/database';

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/zip',
  'application/x-rar-compressed',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
];

/**
 * Get all files for a project
 */
export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getProjectFiles] No authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('project_files')
    .select(
      `
      id,
      project_id,
      workspace_id,
      name,
      original_name,
      storage_path,
      file_size,
      mime_type,
      uploaded_by,
      created_at,
      updated_at,
      uploader:profiles!project_files_uploaded_by_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getProjectFiles] Error:', error);
    return [];
  }

  // Normalize FK arrays
  return (data || []).map((file) => ({
    ...file,
    uploader: Array.isArray(file.uploader) ? file.uploader[0] || null : file.uploader,
  })) as ProjectFile[];
}

/**
 * Upload a file to a project
 */
export async function uploadProjectFile(formData: FormData): Promise<ActionResult> {
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
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File size exceeds 50MB limit' };
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: `File type ${file.type} is not allowed` };
  }

  // Get project to verify workspace
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, workspace_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: 'Project not found' };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${projectId}/${timestamp}_${sanitizedName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadProjectFile] Storage error:', uploadError);
    return { success: false, error: 'Failed to upload file to storage' };
  }

  // Create database record
  const { data: fileRecord, error: dbError } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      workspace_id: project.workspace_id,
      name: sanitizedName,
      original_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    console.error('[uploadProjectFile] DB error:', dbError);
    // Try to clean up the uploaded file
    await supabase.storage.from('project-files').remove([storagePath]);
    return { success: false, error: 'Failed to save file record' };
  }

  revalidatePath(`/projects/${projectId}`);

  return { success: true, data: fileRecord };
}

/**
 * Delete a file from a project
 */
export async function deleteProjectFile(fileId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get file record
  const { data: file, error: fetchError } = await supabase
    .from('project_files')
    .select('id, project_id, storage_path')
    .eq('id', fileId)
    .single();

  if (fetchError || !file) {
    return { success: false, error: 'File not found' };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('project-files')
    .remove([file.storage_path]);

  if (storageError) {
    console.error('[deleteProjectFile] Storage error:', storageError);
    // Continue anyway - file might already be deleted
  }

  // Delete database record
  const { error: dbError } = await supabase.from('project_files').delete().eq('id', fileId);

  if (dbError) {
    console.error('[deleteProjectFile] DB error:', dbError);
    return { success: false, error: 'Failed to delete file record' };
  }

  revalidatePath(`/projects/${file.project_id}`);

  return { success: true };
}

/**
 * Get a signed download URL for a file
 */
export async function getFileDownloadUrl(fileId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get file record with workspace info for authorization check
  const { data: file, error: fetchError } = await supabase
    .from('project_files')
    .select('storage_path, original_name, workspace_id')
    .eq('id', fileId)
    .single();

  if (fetchError || !file) {
    return { success: false, error: 'File not found' };
  }

  // Authorization: Verify user is a member of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', file.workspace_id)
    .eq('profile_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { success: false, error: 'Access denied' };
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('project-files')
    .createSignedUrl(file.storage_path, 3600, {
      download: file.original_name,
    });

  if (urlError || !signedUrl) {
    console.error('[getFileDownloadUrl] Error:', urlError);
    return { success: false, error: 'Failed to generate download URL' };
  }

  return { success: true, data: { url: signedUrl.signedUrl, filename: file.original_name } };
}
