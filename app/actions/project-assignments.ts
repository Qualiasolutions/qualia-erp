'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseFormData, assignEmployeeSchema, reassignEmployeeSchema } from '@/lib/validation';
import {
  createActivity,
  isUserManagerOrAbove,
  type ActionResult,
  type ActivityType,
} from './shared';
import { normalizeFKResponse } from '@/lib/server-utils';
import { getActiveMilestone, createTasksFromMilestone } from './auto-assign';

// ============ PROJECT ASSIGNMENT ACTIONS ============

/**
 * Assign an employee to a project
 */
export async function assignEmployeeToProject(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization: admin only
  const isAdmin = await isUserManagerOrAbove(user.id);
  if (!isAdmin) {
    return { success: false, error: 'Only admins and managers can assign employees to projects' };
  }

  // Validate input
  const validation = parseFormData(assignEmployeeSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { project_id, employee_id, notes } = validation.data;

  // Get project and employee to verify workspace match
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id, name')
    .eq('id', project_id)
    .single();

  if (!project) {
    return { success: false, error: 'Project not found' };
  }

  const { data: employee } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', employee_id)
    .single();

  if (!employee) {
    return { success: false, error: 'Employee not found' };
  }

  // Verify employee belongs to the same workspace via workspace_members
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('profile_id', employee_id)
    .eq('workspace_id', project.workspace_id)
    .single();

  if (!membership) {
    return { success: false, error: 'Employee is not a member of this workspace' };
  }

  // Check for duplicate active assignment
  const { data: existingAssignment } = await supabase
    .from('project_assignments')
    .select('id')
    .eq('project_id', project_id)
    .eq('employee_id', employee_id)
    .is('removed_at', null)
    .single();

  if (existingAssignment) {
    return { success: false, error: 'Employee is already assigned to this project' };
  }

  // Create assignment
  const { data: assignment, error } = await supabase
    .from('project_assignments')
    .insert({
      project_id,
      employee_id,
      assigned_by: user.id,
      workspace_id: project.workspace_id,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    return { success: false, error: error.message };
  }

  // Create activity log
  await createActivity(
    supabase,
    user.id,
    'project_updated' as ActivityType,
    {
      project_id,
      workspace_id: project.workspace_id,
    },
    {
      action: 'employee_assigned',
      employee_name: employee.full_name || employee_id,
      project_name: project.name,
    }
  );

  // Auto-task: transfer existing undone auto-tasks or create from active milestone
  try {
    const { data: undoneTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', project_id)
      .neq('status', 'Done')
      .not('source_phase_item_id', 'is', null);

    if (undoneTasks && undoneTasks.length > 0) {
      // Transfer existing auto-created tasks to the new assignee
      await supabase
        .from('tasks')
        .update({ assignee_id: employee_id })
        .eq('project_id', project_id)
        .neq('status', 'Done')
        .not('source_phase_item_id', 'is', null);
    } else {
      // No existing auto-tasks — create from active milestone
      const milestone = await getActiveMilestone(project_id);
      if (milestone) {
        await createTasksFromMilestone(
          project_id,
          milestone.milestoneNumber,
          employee_id,
          'assignment'
        );
      }
    }
  } catch (autoTaskError) {
    // Auto-task creation is best-effort — never fail the assignment
    console.error('[assignEmployeeToProject] Auto-task error (non-blocking):', autoTaskError);
  }

  // Revalidate paths
  revalidatePath(`/projects/${project_id}`);
  revalidatePath('/admin/assignments');

  return { success: true, data: assignment };
}

/**
 * Reassign an employee from one project to another
 */
export async function reassignEmployee(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization: admin only
  const isAdmin = await isUserManagerOrAbove(user.id);
  if (!isAdmin) {
    return { success: false, error: 'Only admins and managers can reassign employees' };
  }

  // Validate input
  const validation = parseFormData(reassignEmployeeSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { assignment_id, new_project_id, notes } = validation.data;

  // Get current assignment
  const { data: currentAssignment } = await supabase
    .from('project_assignments')
    .select('project_id, employee_id, workspace_id')
    .eq('id', assignment_id)
    .is('removed_at', null)
    .single();

  if (!currentAssignment) {
    return { success: false, error: 'Assignment not found or already removed' };
  }

  // Get new project to verify workspace
  const { data: newProject } = await supabase
    .from('projects')
    .select('workspace_id, name')
    .eq('id', new_project_id)
    .single();

  if (!newProject) {
    return { success: false, error: 'New project not found' };
  }

  // Verify workspace match
  if (newProject.workspace_id !== currentAssignment.workspace_id) {
    return { success: false, error: 'New project must be in the same workspace' };
  }

  // Check for duplicate active assignment on new project
  const { data: existingAssignment } = await supabase
    .from('project_assignments')
    .select('id')
    .eq('project_id', new_project_id)
    .eq('employee_id', currentAssignment.employee_id)
    .is('removed_at', null)
    .single();

  if (existingAssignment) {
    return { success: false, error: 'Employee is already assigned to the new project' };
  }

  // Transaction: Remove old assignment and create new one
  // Step 1: Remove old assignment
  const { error: removeError } = await supabase
    .from('project_assignments')
    .update({
      removed_at: new Date().toISOString(),
      removed_by: user.id,
    })
    .eq('id', assignment_id);

  if (removeError) {
    console.error('Error removing old assignment:', removeError);
    return { success: false, error: 'Failed to remove old assignment' };
  }

  // Step 2: Create new assignment
  const { data: newAssignment, error: createError } = await supabase
    .from('project_assignments')
    .insert({
      project_id: new_project_id,
      employee_id: currentAssignment.employee_id,
      assigned_by: user.id,
      workspace_id: currentAssignment.workspace_id,
      notes: notes || null,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating new assignment:', createError);
    // Attempt to rollback (restore old assignment)
    await supabase
      .from('project_assignments')
      .update({
        removed_at: null,
        removed_by: null,
      })
      .eq('id', assignment_id);
    return { success: false, error: 'Failed to create new assignment' };
  }

  // Create activity logs for both projects
  await createActivity(
    supabase,
    user.id,
    'project_updated' as ActivityType,
    {
      project_id: currentAssignment.project_id,
      workspace_id: currentAssignment.workspace_id,
    },
    { action: 'employee_removed' }
  );

  await createActivity(
    supabase,
    user.id,
    'project_updated' as ActivityType,
    {
      project_id: new_project_id,
      workspace_id: currentAssignment.workspace_id,
    },
    { action: 'employee_assigned', project_name: newProject.name }
  );

  // Auto-task: create tasks from new project's active milestone
  try {
    const milestone = await getActiveMilestone(new_project_id);
    if (milestone) {
      await createTasksFromMilestone(
        new_project_id,
        milestone.milestoneNumber,
        currentAssignment.employee_id,
        'assignment'
      );
    }
  } catch (autoTaskError) {
    console.error('[reassignEmployee] Auto-task error (non-blocking):', autoTaskError);
  }

  // Revalidate paths for both projects
  revalidatePath(`/projects/${currentAssignment.project_id}`);
  revalidatePath(`/projects/${new_project_id}`);
  revalidatePath('/admin/assignments');

  return { success: true, data: newAssignment };
}

/**
 * Remove an employee assignment from a project
 */
export async function removeAssignment(assignmentId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization: admin only
  const isAdmin = await isUserManagerOrAbove(user.id);
  if (!isAdmin) {
    return { success: false, error: 'Only admins and managers can remove assignments' };
  }

  // Get assignment to verify it exists and get project_id for activity log
  const { data: assignment } = await supabase
    .from('project_assignments')
    .select('project_id, employee_id, workspace_id')
    .eq('id', assignmentId)
    .is('removed_at', null)
    .single();

  if (!assignment) {
    return { success: false, error: 'Assignment not found or already removed' };
  }

  // Update assignment to mark as removed
  const { error } = await supabase
    .from('project_assignments')
    .update({
      removed_at: new Date().toISOString(),
      removed_by: user.id,
    })
    .eq('id', assignmentId);

  if (error) {
    console.error('Error removing assignment:', error);
    return { success: false, error: error.message };
  }

  // Create activity log
  await createActivity(
    supabase,
    user.id,
    'project_updated' as ActivityType,
    {
      project_id: assignment.project_id,
      workspace_id: assignment.workspace_id,
    },
    { action: 'employee_removed' }
  );

  // Revalidate paths
  revalidatePath(`/projects/${assignment.project_id}`);
  revalidatePath('/admin/assignments');

  return { success: true };
}

/**
 * Get all assignments for a project
 */
export async function getProjectAssignments(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Fetch active assignments with employee profile data
  const { data: assignments, error } = await supabase
    .from('project_assignments')
    .select(
      `
      id,
      assigned_at,
      notes,
      employee:profiles!project_assignments_employee_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `
    )
    .eq('project_id', projectId)
    .is('removed_at', null)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching project assignments:', error);
    return { success: false, error: error.message };
  }

  // Normalize FK response
  const normalized = (assignments || []).map((a) => ({
    ...a,
    employee: normalizeFKResponse(a.employee),
  }));

  return { success: true, data: normalized };
}

/**
 * Get all assignments for an employee
 */
export async function getEmployeeAssignments(employeeId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Fetch active assignments with project data
  const { data: assignments, error } = await supabase
    .from('project_assignments')
    .select(
      `
      id,
      assigned_at,
      notes,
      project:projects!project_assignments_project_id_fkey (
        id,
        name,
        status,
        project_type,
        client:clients (
          id,
          name
        )
      )
    `
    )
    .eq('employee_id', employeeId)
    .is('removed_at', null)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee assignments:', error);
    return { success: false, error: error.message };
  }

  // Normalize FK responses (both project and nested client)
  const normalized = (assignments || []).map((a) => {
    const project = normalizeFKResponse(a.project);
    return {
      ...a,
      project: project
        ? {
            ...project,
            client: normalizeFKResponse(project.client),
          }
        : null,
    };
  });

  return { success: true, data: normalized };
}

/**
 * Get assignment history (all assignments including removed)
 */
export async function getAssignmentHistory(
  projectId?: string,
  employeeId?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization: admin only for full history
  const isAdmin = await isUserManagerOrAbove(user.id);
  if (!isAdmin) {
    return { success: false, error: 'Only admins and managers can view assignment history' };
  }

  // Build query with optional filters
  let query = supabase
    .from('project_assignments')
    .select(
      `
      id,
      assigned_at,
      removed_at,
      notes,
      employee:profiles!project_assignments_employee_id_fkey (
        id,
        full_name,
        email
      ),
      project:projects!project_assignments_project_id_fkey (
        id,
        name,
        status
      ),
      assigned_by_user:profiles!project_assignments_assigned_by_fkey (
        id,
        full_name
      ),
      removed_by_user:profiles!project_assignments_removed_by_fkey (
        id,
        full_name
      )
    `
    )
    .order('assigned_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data: assignments, error } = await query;

  if (error) {
    console.error('Error fetching assignment history:', error);
    return { success: false, error: error.message };
  }

  // Normalize FK responses
  const normalized = (assignments || []).map((a) => ({
    ...a,
    employee: normalizeFKResponse(a.employee),
    project: normalizeFKResponse(a.project),
    assigned_by_user: normalizeFKResponse(a.assigned_by_user),
    removed_by_user: normalizeFKResponse(a.removed_by_user),
  }));

  return { success: true, data: normalized };
}
