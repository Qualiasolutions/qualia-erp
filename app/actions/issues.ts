'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  parseFormData,
  createIssueSchema,
  updateIssueSchema,
  createCommentSchema,
} from '@/lib/validation';
import { notifyIssueCreated } from '@/lib/email';
import { getCurrentWorkspaceId } from './workspace';
import { createNotification, notifyTaskAssigned } from './notifications';
import { createActivity, canDeleteIssue, type ActionResult, type ActivityType } from './shared';

// ============ ISSUE ACTIONS ============

/**
 * Create a new issue
 */
export async function createIssue(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createIssueSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const {
    title,
    description,
    status,
    priority,
    team_id,
    project_id,
    custom_project_name,
    workspace_id,
    assignee_id,
  } = validation.data;

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace is required' };
  }

  // Handle custom project name - create new project if provided
  let finalProjectId = project_id;
  if (!project_id && custom_project_name) {
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: custom_project_name.trim(),
        workspace_id: wsId,
        lead_id: user.id,
        status: 'Active',
        project_group: 'active',
        project_type: 'web_design',
        deployment_platform: 'vercel',
      })
      .select('id')
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return { success: false, error: 'Failed to create project' };
    }
    finalProjectId = newProject.id;
  }

  const { data, error } = await supabase
    .from('issues')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      status,
      priority,
      team_id: team_id || null,
      project_id: finalProjectId || null,
      creator_id: user.id,
      workspace_id: wsId,
      scheduled_start_time: validation.data.scheduled_start_time || null,
      scheduled_end_time: validation.data.scheduled_end_time || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating issue:', error);
    return { success: false, error: error.message };
  }

  // Assign user if provided
  if (assignee_id) {
    const { error: assignError } = await supabase.from('issue_assignees').insert({
      issue_id: data.id,
      profile_id: assignee_id,
      assigned_by: user.id,
    });

    if (assignError) {
      console.error('Error assigning issue:', assignError);
    }
  }

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'issue_created' as ActivityType,
    {
      issue_id: data.id,
      team_id: team_id,
      project_id: finalProjectId,
      workspace_id: wsId,
    },
    { title: data.title, priority: data.priority }
  );

  // Send email notification to other admins (fire and forget)
  // Get project name for the email
  let projectName: string | undefined = custom_project_name?.trim();
  if (!projectName && finalProjectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', finalProjectId)
      .single();
    projectName = project?.name;
  }

  notifyIssueCreated(user.id, title.trim(), data.id, priority || undefined, projectName).catch(
    (err) => console.error('[createIssue] Failed to send email notification:', err)
  );

  revalidatePath('/issues');
  revalidatePath('/hub');
  revalidatePath('/board');
  revalidatePath('/');
  return { success: true, data };
}

/**
 * Update an issue
 */
export async function updateIssue(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(updateIssueSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, title, description, status, priority, team_id, project_id } = validation.data;

  // Get the old issue data for status change detection
  const { data: oldIssue } = await supabase
    .from('issues')
    .select('status, title, creator_id, workspace_id')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('issues')
    .update({
      ...(title && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(team_id !== undefined && { team_id: team_id || null }),
      ...(project_id !== undefined && { project_id: project_id || null }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating issue:', error);
    return { success: false, error: error.message };
  }

  // Send notification when task is completed
  if (status === 'Done' && oldIssue?.status !== 'Done' && oldIssue?.workspace_id) {
    const issueTitle = title?.trim() || oldIssue?.title || 'Task';

    // Get current user's name
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const completerName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Someone';

    // Notify the issue creator (if not the person completing it)
    if (oldIssue.creator_id && oldIssue.creator_id !== user.id) {
      await createNotification(
        oldIssue.creator_id,
        oldIssue.workspace_id,
        'task_completed',
        `Task completed: ${issueTitle}`,
        `${completerName} marked this task as done`,
        `/hub`
      );
    }

    // Also notify all assignees except the person who completed it
    const { data: assignees } = await supabase
      .from('issue_assignees')
      .select('profile_id')
      .eq('issue_id', id);

    if (assignees) {
      await Promise.all(
        assignees
          .filter((a) => a.profile_id !== user.id && a.profile_id !== oldIssue.creator_id)
          .map((assignee) =>
            createNotification(
              assignee.profile_id,
              oldIssue.workspace_id,
              'task_completed',
              `Task completed: ${issueTitle}`,
              `${completerName} marked this task as done`,
              `/hub`
            )
          )
      );
    }
  }

  revalidatePath(`/issues/${id}`);
  revalidatePath('/issues');
  revalidatePath('/hub');
  revalidatePath('/board');
  return { success: true, data };
}

/**
 * Delete an issue
 */
export async function deleteIssue(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization check: only creator or admin can delete
  const canDelete = await canDeleteIssue(user.id, id);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this issue' };
  }

  const { error } = await supabase.from('issues').delete().eq('id', id);

  if (error) {
    console.error('Error deleting issue:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/issues');
  revalidatePath('/board');
  revalidatePath('/hub');
  return { success: true };
}

/**
 * Get an issue by ID
 */
export async function getIssueById(id: string) {
  const supabase = await createClient();
  const { data: issue, error } = await supabase
    .from('issues')
    .select(
      `
            *,
            creator:profiles!issues_creator_id_fkey (id, full_name, email),
            project:projects (id, name),
            team:teams (id, name, key),
            comments (
                id,
                body,
                created_at,
                user:profiles (id, full_name, email, avatar_url)
            )
        `
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching issue:', error);
    return null;
  }

  // Transform arrays to single objects for foreign keys
  return {
    ...issue,
    creator: Array.isArray(issue.creator) ? issue.creator[0] || null : issue.creator,
    project: Array.isArray(issue.project) ? issue.project[0] || null : issue.project,
    team: Array.isArray(issue.team) ? issue.team[0] || null : issue.team,
    comments: (issue.comments || []).map((c: { user: unknown[] | unknown }) => ({
      ...c,
      user: Array.isArray(c.user) ? c.user[0] || null : c.user,
    })),
  };
}

/**
 * Create a comment on an issue
 */
export async function createComment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createCommentSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { issue_id, body } = validation.data;

  const { data, error } = await supabase
    .from('comments')
    .insert({
      issue_id,
      body: body.trim(),
      user_id: user.id,
    })
    .select(
      `
            id,
            body,
            created_at,
            user:profiles (id, full_name, email, avatar_url)
        `
    )
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: error.message };
  }

  // Get the issue to find its team/project for activity visibility
  const { data: issue } = await supabase
    .from('issues')
    .select('team_id, project_id, title, creator_id, workspace_id')
    .eq('id', issue_id)
    .single();

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'comment_added' as ActivityType,
    {
      comment_id: data.id,
      issue_id,
      team_id: issue?.team_id,
      project_id: issue?.project_id,
    },
    { issue_title: issue?.title }
  );

  // Send notifications for the comment
  if (issue?.workspace_id && issue?.title) {
    // Get current user's name
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const commenterName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Someone';
    const commentPreview = body.trim().substring(0, 80) + (body.length > 80 ? '...' : '');

    // Collect users to notify (creator + assignees, excluding commenter)
    const usersToNotify = new Set<string>();

    // Add issue creator
    if (issue.creator_id && issue.creator_id !== user.id) {
      usersToNotify.add(issue.creator_id);
    }

    // Add all assignees
    const { data: assignees } = await supabase
      .from('issue_assignees')
      .select('profile_id')
      .eq('issue_id', issue_id);

    if (assignees) {
      for (const assignee of assignees) {
        if (assignee.profile_id !== user.id) {
          usersToNotify.add(assignee.profile_id);
        }
      }
    }

    // Send notifications in parallel
    await Promise.all(
      Array.from(usersToNotify).map((notifyUserId) =>
        createNotification(
          notifyUserId,
          issue.workspace_id,
          'comment_added',
          `New comment on: ${issue.title}`,
          `${commenterName}: "${commentPreview}"`,
          `/hub`
        )
      )
    );
  }

  revalidatePath(`/issues/${issue_id}`);
  revalidatePath('/');
  revalidatePath('/hub');
  return { success: true, data };
}

/**
 * Add an assignee to an issue
 */
export async function addIssueAssignee(issueId: string, profileId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('issue_assignees')
    .insert({
      issue_id: issueId,
      profile_id: profileId,
      assigned_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding issue assignee:', error);
    return { success: false, error: error.message };
  }

  // Get issue details for activity
  const { data: issue } = await supabase
    .from('issues')
    .select('team_id, project_id, title, workspace_id')
    .eq('id', issueId)
    .single();

  // Get assignee name for activity
  const { data: assignee } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', profileId)
    .single();

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'issue_assigned' as ActivityType,
    {
      issue_id: issueId,
      team_id: issue?.team_id,
      project_id: issue?.project_id,
      workspace_id: issue?.workspace_id,
    },
    {
      issue_title: issue?.title,
      assignee_name: assignee?.full_name || assignee?.email,
    }
  );

  // Get current user's name for notification
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  const assignerName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Someone';

  // Send notification to the assignee (but not to themselves)
  if (profileId !== user.id && issue?.workspace_id && issue?.title) {
    await notifyTaskAssigned(issueId, issue.title, [profileId], issue.workspace_id, assignerName);
  }

  revalidatePath(`/issues/${issueId}`);
  revalidatePath('/issues');
  revalidatePath('/hub');
  return { success: true, data };
}

/**
 * Remove an assignee from an issue
 */
export async function removeIssueAssignee(
  issueId: string,
  profileId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('issue_assignees')
    .delete()
    .eq('issue_id', issueId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing issue assignee:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/issues/${issueId}`);
  revalidatePath('/issues');
  return { success: true };
}

/**
 * Get issue assignees
 */
export async function getIssueAssignees(issueId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('issue_assignees')
    .select(
      `
            id,
            assigned_at,
            profile:profiles (id, full_name, email, avatar_url),
            assigned_by_profile:profiles!issue_assignees_assigned_by_fkey (full_name)
        `
    )
    .eq('issue_id', issueId);

  if (error) {
    console.error('Error fetching issue assignees:', error);
    return [];
  }

  return (data || []).map((a) => ({
    ...a,
    profile: Array.isArray(a.profile) ? a.profile[0] || null : a.profile,
    assigned_by_profile: Array.isArray(a.assigned_by_profile)
      ? a.assigned_by_profile[0] || null
      : a.assigned_by_profile,
  }));
}

/**
 * Get scheduled issues
 */
export async function getScheduledIssues(workspaceId?: string | null) {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  let query = supabase
    .from('issues')
    .select(
      `
            id,
            title,
            description,
            status,
            priority,
            scheduled_start_time,
            scheduled_end_time,
            project:projects (id, name, project_group),
            assignee:issue_assignees(profile:profiles(full_name, avatar_url))
        `
    )
    .not('scheduled_start_time', 'is', null)
    .not('scheduled_end_time', 'is', null)
    .order('scheduled_start_time', { ascending: true });

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  const { data: issues, error } = await query;

  if (error) {
    console.error('Error fetching scheduled issues:', error);
    return [];
  }

  return (issues || []).map((issue) => {
    // Handle assignee relation - it comes as an array from the join
    const assigneeData =
      Array.isArray(issue.assignee) && issue.assignee.length > 0
        ? issue.assignee[0]?.profile
        : null;

    return {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      start_time: issue.scheduled_start_time,
      end_time: issue.scheduled_end_time,
      type: 'issue' as const,
      project: Array.isArray(issue.project) ? issue.project[0] : issue.project,
      assignee: assigneeData,
    };
  });
}

/**
 * Schedule an issue
 */
export async function scheduleIssue(
  issueId: string,
  startTime: string,
  endTime: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('issues')
    .update({
      scheduled_start_time: startTime,
      scheduled_end_time: endTime,
    })
    .eq('id', issueId);

  if (error) {
    console.error('Error scheduling issue:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/portal/schedule');
  return { success: true };
}

/**
 * Unschedule an issue
 */
export async function unscheduleIssue(issueId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('issues')
    .update({
      scheduled_start_time: null,
      scheduled_end_time: null,
    })
    .eq('id', issueId);

  if (error) {
    console.error('Error unscheduling issue:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/portal/schedule');
  return { success: true };
}
