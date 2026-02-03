'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/app/actions';
import { z } from 'zod';

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

// Blog post type
export type BlogPost = {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  url: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  published_at: string | null;
  keywords: string[] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    name: string;
    project_type: string | null;
  } | null;
};

// Blog task from the tasks table (auto-generated daily)
export type BlogTask = {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  project_id: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
};

// Validation schemas
const createBlogPostSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(500),
  url: z.string().url('Invalid URL').optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
  published_at: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const updateBlogPostSchema = z.object({
  id: z.string().uuid('Invalid blog post ID'),
  title: z.string().min(1).max(500).optional(),
  url: z.string().url('Invalid URL').optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
  published_at: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  project_id: z.string().uuid().optional(),
});

/**
 * Get all blog posts for the workspace
 */
export async function getBlogPosts(workspaceId?: string | null): Promise<BlogPost[]> {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    console.error('[getBlogPosts] No workspace ID available');
    return [];
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      id,
      workspace_id,
      project_id,
      title,
      url,
      status,
      published_at,
      keywords,
      notes,
      created_by,
      created_at,
      updated_at,
      project:projects (id, name, project_type)
    `
    )
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getBlogPosts] Error:', error);
    return [];
  }

  return (data || []).map((post) => {
    const p = post as unknown as {
      project: BlogPost['project'] | BlogPost['project'][];
    };
    return {
      ...post,
      project: Array.isArray(p.project) ? p.project[0] || null : p.project,
    } as BlogPost;
  });
}

/**
 * Get SEO projects (projects with project_type = 'seo')
 */
export async function getSeoProjects(workspaceId?: string | null) {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return [];
  }

  // Get SEO projects + additional projects for blog tracking
  // Includes: SEO type projects, Qualia Solutions, Aquador, ZNSO
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, project_type, client:clients(id, name)')
    .eq('workspace_id', wsId)
    .or('project_type.eq.seo,name.ilike.%Qualia Solutions%,name.ilike.%Aquador%,name.ilike.%ZNSO%')
    .order('name');

  if (error) {
    console.error('[getSeoProjects] Error:', error);
    return [];
  }

  return (data || []).map((p) => ({
    ...p,
    client: Array.isArray(p.client) ? p.client[0] || null : p.client,
  }));
}

/**
 * Get blog-related tasks (auto-generated daily tasks for blog writing)
 */
export async function getBlogTasks(workspaceId?: string | null): Promise<BlogTask[]> {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      status,
      due_date,
      completed_at,
      created_at,
      project_id,
      project:projects (id, name)
    `
    )
    .eq('workspace_id', wsId)
    .ilike('title', '%blog post%')
    .order('due_date', { ascending: false });

  if (error) {
    console.error('[getBlogTasks] Error:', error);
    return [];
  }

  return (data || []).map((task) => {
    const t = task as unknown as {
      project: BlogTask['project'] | BlogTask['project'][];
    };
    return {
      ...task,
      project: Array.isArray(t.project) ? t.project[0] || null : t.project,
    } as BlogTask;
  });
}

/**
 * Create a new blog post
 */
export async function createBlogPost(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return { success: false, error: 'No workspace found' };
  }

  // Parse form data
  const rawData = {
    project_id: formData.get('project_id') as string,
    title: formData.get('title') as string,
    url: (formData.get('url') as string) || null,
    status: (formData.get('status') as string) || 'draft',
    published_at: (formData.get('published_at') as string) || null,
    keywords: formData.get('keywords')
      ? (formData.get('keywords') as string)
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : null,
    notes: (formData.get('notes') as string) || null,
  };

  const parsed = createBlogPostSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      ...parsed.data,
      workspace_id: workspaceId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[createBlogPost] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/seo');
  return { success: true, data };
}

/**
 * Update a blog post
 */
export async function updateBlogPost(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const rawData = {
    id: formData.get('id') as string,
    title: (formData.get('title') as string) || undefined,
    url: (formData.get('url') as string) || null,
    status: (formData.get('status') as string) || undefined,
    published_at: (formData.get('published_at') as string) || null,
    keywords: formData.get('keywords')
      ? (formData.get('keywords') as string)
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : null,
    notes: (formData.get('notes') as string) || null,
    project_id: (formData.get('project_id') as string) || undefined,
  };

  const parsed = updateBlogPostSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const { id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from('blog_posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateBlogPost] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/seo');
  return { success: true, data };
}

/**
 * Delete a blog post
 */
export async function deleteBlogPost(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase.from('blog_posts').delete().eq('id', id);

  if (error) {
    console.error('[deleteBlogPost] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/seo');
  return { success: true };
}
