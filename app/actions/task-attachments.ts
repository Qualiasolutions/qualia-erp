'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/app/actions';
import { isUserAdmin } from './shared';

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  workspace_id: string;
  uploader_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  uploader?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
  'text/html',
  'application/json',
  'application/zip',
  'application/x-rar-compressed',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
];

/**
 * Get all attachments for a task
 */
export async function getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('task_attachments')
    .select(
      `
      id, task_id, workspace_id, uploader_id, file_name, file_size, mime_type, storage_path, created_at,
      uploader:profiles!task_attachments_uploader_id_fkey (id, full_name, avatar_url)
    `
    )
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getTaskAttachments] Error:', error);
    return [];
  }

  return (data || []).map((a) => ({
    ...a,
    uploader: Array.isArray(a.uploader) ? a.uploader[0] || null : a.uploader,
  })) as unknown as TaskAttachment[];
}

/**
 * Upload a file attachment to a task
 */
export async function uploadTaskAttachment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const file = formData.get('file') as File | null;
  const taskId = formData.get('task_id') as string | null;
  const markAsDone = formData.get('mark_as_done') === 'true';

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  if (!taskId) {
    return { success: false, error: 'Task ID is required' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File size exceeds 50MB limit' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: `File type ${file.type} is not allowed` };
  }

  // Get workspace from task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, workspace_id')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { success: false, error: 'Task not found' };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `tasks/${taskId}/${timestamp}_${sanitizedName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadTaskAttachment] Storage error:', uploadError);
    return { success: false, error: 'Failed to upload file to storage' };
  }

  // Create database record
  const { data: attachment, error: dbError } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      workspace_id: task.workspace_id,
      uploader_id: user.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    console.error('[uploadTaskAttachment] DB error:', dbError);
    await supabase.storage.from('project-files').remove([storagePath]);
    return { success: false, error: 'Failed to save file record' };
  }

  // Optionally mark task as done
  if (markAsDone) {
    await supabase
      .from('tasks')
      .update({ status: 'Done', completed_at: new Date().toISOString() })
      .eq('id', taskId);
  }

  revalidatePath('/inbox');
  return { success: true, data: attachment };
}

/**
 * Delete a task attachment
 */
export async function deleteTaskAttachment(attachmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get the attachment
  const { data: attachment, error: fetchError } = await supabase
    .from('task_attachments')
    .select('id, uploader_id, storage_path, task_id')
    .eq('id', attachmentId)
    .single();

  if (fetchError || !attachment) {
    return { success: false, error: 'Attachment not found' };
  }

  // Auth check: uploader or admin
  if (attachment.uploader_id !== user.id) {
    const admin = await isUserAdmin(user.id);
    if (!admin) {
      return { success: false, error: 'You do not have permission to delete this attachment' };
    }
  }

  // Delete from storage
  await supabase.storage.from('project-files').remove([attachment.storage_path]);

  // Delete from DB
  const { error: dbError } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId);

  if (dbError) {
    console.error('[deleteTaskAttachment] DB error:', dbError);
    return { success: false, error: 'Failed to delete attachment' };
  }

  revalidatePath('/inbox');
  return { success: true };
}

/**
 * Get a signed download URL for a task attachment
 */
export async function getTaskAttachmentUrl(attachmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: attachment, error: fetchError } = await supabase
    .from('task_attachments')
    .select('storage_path, file_name, workspace_id')
    .eq('id', attachmentId)
    .single();

  if (fetchError || !attachment) {
    return { success: false, error: 'Attachment not found' };
  }

  // Workspace membership check
  const wsId = await getCurrentWorkspaceId();
  if (wsId !== attachment.workspace_id) {
    return { success: false, error: 'Access denied' };
  }

  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('project-files')
    .createSignedUrl(attachment.storage_path, 3600, {
      download: attachment.file_name,
    });

  if (urlError || !signedUrl) {
    console.error('[getTaskAttachmentUrl] Error:', urlError);
    return { success: false, error: 'Failed to generate download URL' };
  }

  return { success: true, data: { url: signedUrl.signedUrl, filename: attachment.file_name } };
}
