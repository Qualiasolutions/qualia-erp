'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';
import { isUserAdmin } from './shared';
import { completePhase } from './phases';
import {
  notifyPhaseSubmitted,
  notifyPhaseApproved,
  notifyPhaseChangesRequested,
} from '@/lib/email';

export interface PhaseReviewWithDetails {
  id: string;
  project_id: string;
  phase_id: string;
  phase_name: string;
  submitted_by: string;
  submitted_at: string | null;
  status: 'pending' | 'approved' | 'changes_requested';
  reviewed_by: string | null;
  reviewed_at: string | null;
  feedback: string | null;
  created_at: string | null;
  // Joined data
  submitter?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  reviewer?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  project?: { id: string; name: string } | null;
}

/**
 * Submit a phase for review (trainee action)
 */
export async function submitPhaseForReview(
  projectId: string,
  phaseId: string,
  phaseName: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Upsert — if a previous review was rejected, allow resubmission
  const { error } = await supabase.from('phase_reviews').upsert(
    {
      project_id: projectId,
      phase_id: phaseId,
      phase_name: phaseName,
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      feedback: null,
    },
    { onConflict: 'project_id,phase_name' }
  );

  if (error) {
    console.error('[submitPhaseForReview] Error:', error);
    return { success: false, error: error.message };
  }

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    action_type: 'phase_submitted',
    actor_id: user.id,
    action_data: { phase_name: phaseName, phase_id: phaseId },
    is_client_visible: true,
  });

  // Send email notification to admins
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();

  if (profile && project) {
    await notifyPhaseSubmitted(
      projectId,
      project.name,
      phaseName,
      profile.full_name || 'Team member'
    );
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  return { success: true };
}

/**
 * Approve a phase review (admin action)
 */
export async function approvePhaseReview(
  reviewId: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) return { success: false, error: 'Only admins can approve reviews' };

  const { error } = await supabase
    .from('phase_reviews')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) {
    console.error('[approvePhaseReview] Error:', error);
    return { success: false, error: error.message };
  }

  // Get review details for activity log + phase completion
  const { data: review } = await supabase
    .from('phase_reviews')
    .select('phase_name, phase_id')
    .eq('id', reviewId)
    .single();

  if (review) {
    // Log the approval
    await supabase.from('activity_log').insert({
      project_id: projectId,
      action_type: 'phase_approved',
      actor_id: user.id,
      action_data: { phase_name: review.phase_name, phase_id: review.phase_id },
      is_client_visible: true,
    });

    // Complete the phase and unlock the next one
    await completePhase(review.phase_id);

    // Send email notification to trainee
    const { data: reviewer } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data: submitter } = await supabase
      .from('phase_reviews')
      .select('submitted_by')
      .eq('id', reviewId)
      .single();

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (reviewer && submitter && project) {
      await notifyPhaseApproved(
        projectId,
        project.name,
        review.phase_name,
        submitter.submitted_by,
        reviewer.full_name || 'Admin'
      );
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  return { success: true };
}

/**
 * Request changes on a phase review (admin action)
 */
export async function requestPhaseChanges(
  reviewId: string,
  projectId: string,
  feedback: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) return { success: false, error: 'Only admins can review phases' };

  const { error } = await supabase
    .from('phase_reviews')
    .update({
      status: 'changes_requested',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      feedback,
    })
    .eq('id', reviewId);

  if (error) {
    console.error('[requestPhaseChanges] Error:', error);
    return { success: false, error: error.message };
  }

  // Get review details for activity log
  const { data: review } = await supabase
    .from('phase_reviews')
    .select('phase_name, phase_id')
    .eq('id', reviewId)
    .single();

  if (review) {
    await supabase.from('activity_log').insert({
      project_id: projectId,
      action_type: 'phase_changes_requested',
      actor_id: user.id,
      action_data: { phase_name: review.phase_name, phase_id: review.phase_id, feedback },
      is_client_visible: false,
    });

    // Send email notification to trainee
    const { data: reviewer } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data: submitter } = await supabase
      .from('phase_reviews')
      .select('submitted_by')
      .eq('id', reviewId)
      .single();

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (reviewer && submitter && project) {
      await notifyPhaseChangesRequested(
        projectId,
        project.name,
        review.phase_name,
        submitter.submitted_by,
        reviewer.full_name || 'Admin',
        feedback
      );
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  return { success: true };
}

/**
 * Get review status for a specific phase
 */
export async function getPhaseReview(
  projectId: string,
  phaseName: string
): Promise<PhaseReviewWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('phase_reviews')
    .select(
      `
      *,
      submitter:profiles!phase_reviews_submitted_by_fkey (id, full_name, avatar_url),
      reviewer:profiles!phase_reviews_reviewed_by_fkey (id, full_name, avatar_url)
    `
    )
    .eq('project_id', projectId)
    .eq('phase_name', phaseName)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    status: data.status as PhaseReviewWithDetails['status'],
    submitter: Array.isArray(data.submitter) ? data.submitter[0] || null : data.submitter,
    reviewer: Array.isArray(data.reviewer) ? data.reviewer[0] || null : data.reviewer,
  } as PhaseReviewWithDetails;
}

/**
 * Get all reviews for a project
 */
export async function getProjectReviews(projectId: string): Promise<PhaseReviewWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('phase_reviews')
    .select(
      `
      *,
      submitter:profiles!phase_reviews_submitted_by_fkey (id, full_name, avatar_url),
      reviewer:profiles!phase_reviews_reviewed_by_fkey (id, full_name, avatar_url)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((review) => ({
    ...review,
    status: review.status as PhaseReviewWithDetails['status'],
    submitter: Array.isArray(review.submitter) ? review.submitter[0] || null : review.submitter,
    reviewer: Array.isArray(review.reviewer) ? review.reviewer[0] || null : review.reviewer,
  })) as PhaseReviewWithDetails[];
}

/**
 * Get all pending reviews across all projects (admin view)
 */
export async function getPendingReviews(): Promise<PhaseReviewWithDetails[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) return [];

  const { data, error } = await supabase
    .from('phase_reviews')
    .select(
      `
      *,
      submitter:profiles!phase_reviews_submitted_by_fkey (id, full_name, avatar_url),
      reviewer:profiles!phase_reviews_reviewed_by_fkey (id, full_name, avatar_url),
      project:projects!phase_reviews_project_id_fkey (id, name)
    `
    )
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  if (error || !data) return [];

  return data.map((review) => ({
    ...review,
    status: review.status as PhaseReviewWithDetails['status'],
    submitter: Array.isArray(review.submitter) ? review.submitter[0] || null : review.submitter,
    reviewer: Array.isArray(review.reviewer) ? review.reviewer[0] || null : review.reviewer,
    project: Array.isArray(review.project) ? review.project[0] || null : review.project,
  })) as PhaseReviewWithDetails[];
}
