'use server';

import { createClient } from '@/lib/supabase/server';

import type { Tables } from '@/types/database';

type ProjectFile = Tables<'project_files'>;
export type ProjectFileWithUploader = ProjectFile & {
  uploader?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  phase?: { id: string; phase_name: string | null } | null;
};
import { canAccessProject, canDeleteProjectFile, type ActionResult } from './shared';
import { canAccessProject as canClientAccessProject } from '@/lib/portal-utils';
import { createActivityLogEntry } from './activity-feed';
import { notifyEmployeesOfClientFileUpload } from '@/lib/email';

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
// Must stay in sync with storage.buckets.allowed_mime_types for 'project-files'.
// If code allows a type that the bucket rejects, uploads 400 from storage.
// If the bucket allows a type that code rejects, user gets a clear error before upload.
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/heic', // iPhone photos
  'image/heif',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  // Archives / data
  'application/json',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-zip-compressed',
  'application/octet-stream', // browser fallback when type is unknown
  // Media
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
];

/**
 * Get all files for a project
 * @param projectId - Project ID to fetch files for
 * @param clientVisibleOnly - If true, only return files with is_client_visible=true
 */
export async function getProjectFiles(
  projectId: string,
  clientVisibleOnly = false
): Promise<ProjectFileWithUploader[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getProjectFiles] No authenticated user');
    return [];
  }

  // Authorization: workspace members OR clients with project access
  const canAccess = await canAccessProject(user.id, projectId);
  const clientAccess =
    !canAccess && clientVisibleOnly ? await canClientAccessProject(user.id, projectId) : false;
  if (!canAccess && !clientAccess) {
    console.error('[getProjectFiles] User does not have access to this project');
    return [];
  }

  let query = supabase
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
      description,
      phase_name,
      is_client_visible,
      is_client_upload,
      uploader:profiles!project_files_uploaded_by_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `
    )
    .eq('project_id', projectId);

  // Filter by client visibility if requested
  if (clientVisibleOnly) {
    query = query.eq('is_client_visible', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[getProjectFiles] Error:', error);
    return [];
  }

  // Normalize FK arrays
  return (data || []).map((file) => ({
    ...file,
    uploader: Array.isArray(file.uploader) ? file.uploader[0] || null : file.uploader,
  })) as unknown as ProjectFile[];
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
  const description = formData.get('description') as string | null;
  const phaseId = formData.get('phase_id') as string | null;
  const isClientVisible = formData.get('is_client_visible') as string | null;

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

  // Authorization: Only workspace members can upload to project
  const canAccess = await canAccessProject(user.id, projectId);
  if (!canAccess) {
    return { success: false, error: 'You do not have permission to upload to this project' };
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
      description: description || null,
      phase_name: phaseId || null,
      is_client_visible: isClientVisible === 'true',
    })
    .select()
    .single();

  if (dbError) {
    console.error('[uploadProjectFile] DB error:', dbError);
    // Try to clean up the uploaded file
    await supabase.storage.from('project-files').remove([storagePath]);
    return { success: false, error: 'Failed to save file record' };
  }

  // Log activity (only if upload succeeds)
  await createActivityLogEntry({
    projectId,
    actionType: 'file_uploaded',
    actionData: {
      file_name: file.name,
      description: description || undefined,
      is_client_visible: isClientVisible === 'true',
    },
    isClientVisible: isClientVisible === 'true',
  });

  // Notify assigned employees if file is client-visible
  if (isClientVisible === 'true') {
    const { data: uploader } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    // Only notify if uploader is a client (not admin/employee)
    if (uploader && uploader.role !== 'admin' && uploader.role !== 'employee') {
      await notifyEmployeesOfClientFileUpload(
        projectId,
        uploader.full_name || 'A client',
        file.name,
        description || undefined
      );
    }
  }

  return { success: true, data: fileRecord };
}

/**
 * Upload a file from a portal client to a project
 */
export async function uploadClientFile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const file = formData.get('file') as File | null;
  const projectId = formData.get('project_id') as string | null;
  const description = formData.get('description') as string | null;

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

  // Verify client has access to this project
  const clientAccess = await canClientAccessProject(user.id, projectId);
  if (!clientAccess) {
    return { success: false, error: 'You do not have access to this project' };
  }

  // Get project to retrieve workspace_id
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, workspace_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: 'Project not found' };
  }

  // Generate storage path in client-uploads subfolder
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${projectId}/client-uploads/${timestamp}_${sanitizedName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadClientFile] Storage error:', uploadError);
    return { success: false, error: 'Failed to upload file to storage' };
  }

  // Create database record with is_client_upload=true
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
      description: description || null,
      is_client_upload: true,
      is_client_visible: true,
    })
    .select()
    .single();

  if (dbError) {
    console.error('[uploadClientFile] DB error:', dbError);
    // Try to clean up the uploaded file
    await supabase.storage.from('project-files').remove([storagePath]);
    return { success: false, error: 'Failed to save file record' };
  }

  // Fetch uploader name for notification
  const { data: uploader } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const uploaderName = uploader?.full_name || 'A client';

  // Log activity
  await createActivityLogEntry({
    projectId,
    actionType: 'client_file_uploaded',
    actionData: {
      file_name: file.name,
      description: description || undefined,
      is_client_upload: true,
    },
    isClientVisible: true,
  });

  // Notify team members of the client upload
  await notifyEmployeesOfClientFileUpload(
    projectId,
    uploaderName,
    file.name,
    description || undefined
  );

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

  // Authorization: Only uploader, project lead, or admin can delete
  const canDelete = await canDeleteProjectFile(user.id, fileId);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this file' };
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
    .select('storage_path, original_name, workspace_id, project_id, is_client_visible')
    .eq('id', fileId)
    .single();

  if (fetchError || !file) {
    return { success: false, error: 'File not found' };
  }

  // Authorization: Check if user is a workspace member OR a client with access to this file
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', file.workspace_id)
    .eq('profile_id', user.id)
    .single();

  let hasAccess = !!membership;

  // If not a workspace member, check if user is a client with access to this project
  // AND the file is marked as client-visible
  if (!hasAccess && file.is_client_visible) {
    const { data: clientProject } = await supabase
      .from('client_projects')
      .select('id')
      .eq('project_id', file.project_id)
      .eq('client_id', user.id)
      .single();

    hasAccess = !!clientProject;
  }

  if (!hasAccess) {
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
