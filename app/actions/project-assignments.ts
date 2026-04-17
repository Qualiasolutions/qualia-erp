'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

import { parseFormData, assignEmployeeSchema, reassignEmployeeSchema } from '@/lib/validation';
import {
  createActivity,
  isUserManagerOrAbove,
  type ActionResult,
  type ActivityType,
} from './shared';
import { normalizeFKResponse } from '@/lib/server-utils';
import { syncPlanningFromGitHubWithServiceRole } from '@/lib/planning-sync-core';

// Debounce window for auto-sync on assign: skip if a phase was synced within this many seconds.
// Prevents spam when an admin assigns multiple people to the same project in quick succession.
const AUTO_SYNC_DEBOUNCE_SECONDS = 60;

/**
 * Best-effort: if the project has a GitHub integration, pull .planning/ from the
 * repo and upsert phases. Debounced by AUTO_SYNC_DEBOUNCE_SECONDS so rapid-fire
 * assignments don't hammer the GitHub API.
 *
 * Never throws. Logs errors and returns silently — the caller is an assignment
 * action and must not fail because of sync issues.
 */
async function autoSyncPlanningIfGitHubLinked(
  projectId: string,
  workspaceId: string,
  githubRepoUrl: string | null,
  caller: string
): Promise<void> {
  if (!githubRepoUrl) return; // No GitHub integration — nothing to sync

  try {
    const adminClient = createAdminClient();

    // Debounce check: read max github_synced_at from project_phases
    const { data: phases } = await adminClient
      .from('project_phases')
      .select('github_synced_at')
      .eq('project_id', projectId)
      .not('github_synced_at', 'is', null)
      .order('github_synced_at', { ascending: false })
      .limit(1);

    const lastSync = phases?.[0]?.github_synced_at;
    if (lastSync) {
      const ageSeconds = (Date.now() - new Date(lastSync).getTime()) / 1000;
      if (ageSeconds < AUTO_SYNC_DEBOUNCE_SECONDS) {
        console.log(
          `[${caller}] auto-sync skipped — last sync was ${Math.round(ageSeconds)}s ago (debounced)`
        );
        return;
      }
    }

    // Fire the sync
    const result = await syncPlanningFromGitHubWithServiceRole(adminClient, projectId, workspaceId);

    if (result.success) {
      console.log(
        `[${caller}] auto-sync complete — upserted ${result.phasesUpserted} phases from GitHub`
      );
    } else {
      console.warn(`[${caller}] auto-sync failed (non-blocking):`, result.error);
    }
  } catch (err) {
    console.error(`[${caller}] auto-sync error (non-blocking):`, err);
  }
}

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
    .select('workspace_id, name, github_repo_url')
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

  // Auto-sync planning from GitHub (best-effort, debounced)
  // The moment an employee is assigned, pull the latest .planning/ROADMAP.md and
  // phases so they see current work without having to click "Sync" manually.
  await autoSyncPlanningIfGitHubLinked(
    project_id,
    project.workspace_id,
    project.github_repo_url,
    'assignEmployeeToProject'
  );

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
    .select('workspace_id, name, github_repo_url')
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

  // Auto-sync planning from GitHub for the new project (best-effort, debounced)
  await autoSyncPlanningIfGitHubLinked(
    new_project_id,
    newProject.workspace_id,
    newProject.github_repo_url,
    'reassignEmployee'
  );

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

  // Authorization: users can only view their own assignments, admins/managers can view any
  if (user.id !== employeeId) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (callerProfile?.role !== 'admin' && callerProfile?.role !== 'manager') {
      return { success: false, error: 'Not authorized' };
    }
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
