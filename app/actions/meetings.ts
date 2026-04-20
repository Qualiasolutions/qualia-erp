'use server';

import { createClient } from '@/lib/supabase/server';

import {
  parseFormData,
  validateData,
  createMeetingSchema,
  updateMeetingSchema,
} from '@/lib/validation';
import { notifyMeetingCreated } from '@/lib/email';
import { getCurrentWorkspaceId } from './workspace';
import { logClientActivity } from './clients';
import {
  createActivity,
  canDeleteMeeting,
  type ActionResult,
  type ProfileRef,
  type ActivityType,
} from './shared';

// ============ MEETING TYPES ============

// For Supabase responses where FK can be array or single object
type FKResponse<T> = T | T[] | null;

// Meeting response type for getMeetings
type MeetingResponse = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
  project_id: string | null;
  created_by: string | null;
  project: FKResponse<{ id: string; name: string }>;
  client: FKResponse<{ id: string; display_name: string; lead_status: string | null }>;
  creator: FKResponse<ProfileRef>;
  attendees: Array<{
    id: string;
    profile_id: string;
    profile: FKResponse<ProfileRef>;
  }>;
};

// ============ MEETING ACTIONS ============

/**
 * Create a new meeting
 */
export async function createMeeting(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createMeetingSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const {
    title,
    description,
    start_time,
    end_time,
    project_id,
    client_id,
    custom_client_name,
    workspace_id,
    meeting_link,
  } = validation.data;

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  // Handle custom client name - create new client if provided
  let finalClientId = client_id;
  if (!client_id && custom_client_name && wsId) {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: custom_client_name.trim(),
        display_name: custom_client_name.trim(),
        workspace_id: wsId,
        lead_status: 'hot',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      return { success: false, error: 'Failed to create client' };
    }
    finalClientId = newClient.id;
  }

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      start_time,
      end_time,
      project_id: project_id || null,
      client_id: finalClientId || null,
      created_by: user.id,
      workspace_id: wsId,
      meeting_link: meeting_link || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating meeting:', error);
    return { success: false, error: error.message };
  }

  // Batch-insert attendees if any were selected
  const attendeeIds = formData.getAll('attendee_ids') as string[];
  if (attendeeIds.length > 0) {
    const attendeeRows = attendeeIds.map((profileId) => ({
      meeting_id: data.id,
      profile_id: profileId,
    }));
    const { error: attendeeError } = await supabase.from('meeting_attendees').insert(attendeeRows);
    if (attendeeError) {
      console.error('Error adding attendees:', attendeeError);
    }
  }

  // Log client activity if meeting is with a client
  if (finalClientId) {
    await logClientActivity(finalClientId, 'meeting', `Meeting scheduled: ${title}`, {
      meeting_id: data.id,
      start_time,
      end_time,
    });
  }

  // Record activity for dashboard feed
  await createActivity(
    supabase,
    user.id,
    'meeting_created' as ActivityType,
    {
      meeting_id: data.id,
      project_id: project_id,
      workspace_id: wsId,
    },
    { title: title.trim(), start_time, end_time }
  );

  // Send email notification to other admins (fire and forget)
  // Get client name for the email if meeting is with a client
  let clientName: string | undefined = custom_client_name?.trim();
  if (!clientName && finalClientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('display_name')
      .eq('id', finalClientId)
      .single();
    clientName = client?.display_name;
  }

  // Format times for email
  const formattedStart = start_time
    ? new Date(start_time).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : undefined;
  const formattedEnd = end_time
    ? new Date(end_time).toLocaleString('en-US', {
        timeStyle: 'short',
      })
    : undefined;

  notifyMeetingCreated(
    user.id,
    title.trim(),
    data.id,
    formattedStart,
    formattedEnd,
    clientName
  ).catch((err) => console.error('[createMeeting] Failed to send email notification:', err));

  if (custom_client_name && finalClientId) {
  }
  return { success: true, data };
}

/**
 * Get all meetings for a workspace.
 *
 * When `scopeToUserId` is provided, results are filtered to meetings where:
 *   - the user is a meeting attendee, OR
 *   - the user created the meeting, OR
 *   - the meeting's project_id is in the user's project_assignments.
 * This is used to scope meetings for employees so they don't see unrelated meetings.
 */
export async function getMeetings(
  workspaceId?: string | null,
  scopeToUserId?: string | null,
  dateRange?: { start: string; end: string } | null
) {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  // Resolve time bounds. A caller-provided range wins; otherwise fall back to
  // "last 30 days forward" which avoids unbounded scans for the default call.
  const rangeStart =
    dateRange?.start ??
    (() => {
      const c = new Date();
      c.setDate(c.getDate() - 30);
      return c.toISOString();
    })();
  const rangeEnd = dateRange?.end ?? null;

  let query = supabase
    .from('meetings')
    .select(
      `
            id,
            title,
            description,
            start_time,
            end_time,
            meeting_link,
            created_at,
            project_id,
            created_by,
            project:projects (id, name),
            client:clients (id, display_name, lead_status),
            creator:profiles!meetings_created_by_fkey (id, full_name, email),
            attendees:meeting_attendees (
                id,
                profile_id,
                profile:profiles (id, full_name, email, avatar_url)
            )
        `
    )
    .gte('start_time', rangeStart)
    .order('start_time', { ascending: true })
    .limit(500);

  if (rangeEnd) {
    query = query.lt('start_time', rangeEnd);
  }

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  const { data: meetings, error } = await query;

  if (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }

  let filteredMeetings = meetings || [];

  // If scoping to a specific user, filter client-side after fetching
  // (Supabase doesn't support OR across joined tables in a single query)
  if (scopeToUserId) {
    // Fetch the user's assigned project IDs for project-based matching
    const { data: assignments } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('employee_id', scopeToUserId)
      .is('removed_at', null);

    const assignedProjectIds = new Set((assignments || []).map((a) => a.project_id));

    filteredMeetings = filteredMeetings.filter((meeting) => {
      const m = meeting as unknown as MeetingResponse;

      // User created the meeting
      if (m.created_by === scopeToUserId) return true;

      // User is an attendee
      const isAttendee = (m.attendees || []).some((a) => a.profile_id === scopeToUserId);
      if (isAttendee) return true;

      // Meeting is for a project the user is assigned to
      if (m.project_id && assignedProjectIds.has(m.project_id)) return true;

      return false;
    });
  }

  return filteredMeetings.map((meeting) => {
    const m = meeting as unknown as MeetingResponse;
    return {
      ...meeting,
      project: Array.isArray(m.project) ? m.project[0] || null : m.project,
      client: Array.isArray(m.client) ? m.client[0] || null : m.client,
      creator: Array.isArray(m.creator) ? m.creator[0] || null : m.creator,
      attendees: (m.attendees || []).map((a) => ({
        ...a,
        profile: Array.isArray(a.profile) ? a.profile[0] || null : a.profile,
      })),
    };
  });
}

/**
 * Get meetings for today only (server-side date filtering).
 */
export async function getTodaysMeetings(workspaceId?: string | null) {
  const supabase = await createClient();
  let wsId = workspaceId;
  if (!wsId) wsId = await getCurrentWorkspaceId();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  let query = supabase
    .from('meetings')
    .select(
      `id, title, description, start_time, end_time, meeting_link, created_at,
       project:projects (id, name),
       client:clients (id, display_name, lead_status),
       creator:profiles!meetings_created_by_fkey (id, full_name, email),
       attendees:meeting_attendees (id, profile:profiles (id, full_name, email, avatar_url))`
    )
    .gte('start_time', todayStart)
    .lt('start_time', todayEnd)
    .order('start_time', { ascending: true });

  if (wsId) query = query.eq('workspace_id', wsId);

  const { data: meetings, error } = await query;
  if (error) {
    console.error('Error fetching today meetings:', error);
    return [];
  }

  return (meetings || []).map((meeting) => {
    const m = meeting as unknown as MeetingResponse;
    return {
      ...meeting,
      project: Array.isArray(m.project) ? m.project[0] || null : m.project,
      client: Array.isArray(m.client) ? m.client[0] || null : m.client,
      creator: Array.isArray(m.creator) ? m.creator[0] || null : m.creator,
      attendees: (m.attendees || []).map((a) => ({
        ...a,
        profile: Array.isArray(a.profile) ? a.profile[0] || null : a.profile,
      })),
    };
  });
}

/**
 * Update a meeting
 */
export async function updateMeeting(data: {
  id: string;
  title?: string;
  description?: string | null;
  start_time?: string;
  end_time?: string;
  project_id?: string | null;
  client_id?: string | null;
  meeting_link?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = validateData(updateMeetingSchema, data);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, ...updateData } = validation.data;

  // Authorization check: only creator or admin can update
  const canUpdate = await canDeleteMeeting(user.id, id); // Reuse same permission check
  if (!canUpdate) {
    return { success: false, error: 'You do not have permission to update this meeting' };
  }

  // Build update object, only including defined fields
  // Convert empty strings to null for nullable/timestamp columns
  const updates: Record<string, unknown> = {};
  if (updateData.title !== undefined) updates.title = updateData.title;
  if (updateData.description !== undefined)
    updates.description = updateData.description === '' ? null : updateData.description;
  if (updateData.start_time !== undefined)
    updates.start_time = updateData.start_time === '' ? null : updateData.start_time;
  if (updateData.end_time !== undefined)
    updates.end_time = updateData.end_time === '' ? null : updateData.end_time;
  if (updateData.project_id !== undefined)
    updates.project_id = updateData.project_id === '' ? null : updateData.project_id;
  if (updateData.client_id !== undefined)
    updates.client_id = updateData.client_id === '' ? null : updateData.client_id;
  if (updateData.meeting_link !== undefined)
    updates.meeting_link = updateData.meeting_link === '' ? null : updateData.meeting_link;
  updates.updated_at = new Date().toISOString();

  const { data: updatedMeeting, error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating meeting:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: updatedMeeting };
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(meetingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization check: only creator or admin can delete
  const canDelete = await canDeleteMeeting(user.id, meetingId);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this meeting' };
  }

  const { error } = await supabase.from('meetings').delete().eq('id', meetingId);

  if (error) {
    console.error('Error deleting meeting:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Create an instant meeting
 */
export async function createInstantMeeting(title?: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get workspace ID
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) {
    return { success: false, error: 'No workspace found' };
  }

  // Create meeting starting now, lasting 1 hour
  const now = new Date();
  const endTime = new Date(now.getTime() + 60 * 60 * 1000);

  const meetingTitle =
    title ||
    `Quick Meeting - ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: meetingTitle,
      description: 'Instant meeting created from dashboard',
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      workspace_id: wsId,
      created_by: user.id,
      meeting_link: null, // Will be updated when host pastes the link
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating instant meeting:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Update meeting link
 */
export async function updateMeetingLink(
  meetingId: string,
  meetingLink: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('meetings')
    .update({ meeting_link: meetingLink, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single();

  if (error) {
    console.error('Error updating meeting link:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Add a meeting attendee
 */
export async function addMeetingAttendee(
  meetingId: string,
  profileId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('meeting_attendees')
    .insert({
      meeting_id: meetingId,
      profile_id: profileId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding meeting attendee:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Remove a meeting attendee
 */
export async function removeMeetingAttendee(
  meetingId: string,
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
    .from('meeting_attendees')
    .delete()
    .eq('meeting_id', meetingId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing meeting attendee:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update meeting attendee status
 */
export async function updateMeetingAttendeeStatus(
  meetingId: string,
  profileId: string,
  status: 'pending' | 'accepted' | 'declined' | 'tentative'
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('meeting_attendees')
    .update({ status })
    .eq('meeting_id', meetingId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error updating attendee status:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
