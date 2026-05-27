'use server';

import { createClient } from '@/lib/supabase/server';
import { requestMeetingSchema, validateData } from '@/lib/validation';
import { assertNotImpersonating } from '@/lib/portal-utils';
import { type ActionResult } from '../shared';

/**
 * Submit a meeting REQUEST from the portal client dashboard.
 *
 * Flow:
 *   1. Verify the caller is signed in and has `role='client'`.
 *   2. Verify the caller has a `client_projects` row for the supplied
 *      `projectId` — this is the cross-workspace boundary check.
 *   3. Resolve the project's `workspace_id` and the CRM `client_id` (so
 *      admins see the request grouped under the right account).
 *   4. Insert into `meetings` with `status='requested'`. Admins will
 *      review and either confirm (flip to 'confirmed') or decline.
 *
 * Critical: `meetings.client_id` is an FK to `clients.id` (CRM), NOT to
 * `profiles.id`. We resolve it via `projects.client_id` instead of using
 * the portal user's auth id.
 */
export async function requestMeeting(input: {
  projectId: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
}): Promise<ActionResult> {
  try {
    // Block admins impersonating clients — they should use the Quick Schedule
    // dialog directly, not the client-side request flow.
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const validation = validateData(requestMeetingSchema, input);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const { projectId, startTime, endTime, title, description } = validation.data;

    // Role check: only clients use this action. Admins/employees create
    // meetings through the internal Quick Schedule dialog.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'client') {
      return {
        success: false,
        error: 'Only client accounts can submit meeting requests',
      };
    }

    // Workspace boundary check: the client must be linked to this specific
    // project through `client_projects`. Without this row, the caller is
    // either on the wrong workspace or guessing project ids.
    const { data: link } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', user.id)
      .eq('project_id', projectId)
      .maybeSingle();

    if (!link) {
      return { success: false, error: 'Not authorized for this project' };
    }

    // Resolve the project's workspace + CRM client so the row routes to the
    // right admin queue.
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('workspace_id, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found' };
    }

    const { data: meeting, error: insertError } = await supabase
      .from('meetings')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        start_time: startTime,
        end_time: endTime,
        project_id: projectId,
        // `meetings.client_id` FKs to `clients` (CRM), not `profiles`. Use
        // the project's CRM client so the request shows up correctly in the
        // admin meetings list grouped by account.
        client_id: project.client_id,
        workspace_id: project.workspace_id,
        created_by: user.id,
        status: 'requested',
        meeting_link: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[requestMeeting] insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    // Surface the request in the CRM client timeline so admins viewing the
    // account can see the pending booking ask. Inlined (rather than calling
    // the canonical `logClientActivity` helper) to keep the import surface
    // of this module small — the client-portal action tests don't load the
    // email subsystem `logClientActivity` transitively pulls in.
    if (project.client_id) {
      try {
        await supabase.from('client_activities').insert({
          client_id: project.client_id,
          type: 'meeting',
          description: `Meeting requested: ${title.trim()}`,
          metadata: {
            meeting_id: meeting.id,
            start_time: startTime,
            end_time: endTime,
            status: 'requested',
          },
          created_by: user.id,
        });
      } catch (err) {
        console.error('[requestMeeting] activity log error:', err);
      }
    }

    return { success: true, data: meeting };
  } catch (error) {
    console.error('[requestMeeting] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit meeting request',
    };
  }
}
