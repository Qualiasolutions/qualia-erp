'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import { type ActionResult, isUserManagerOrAbove } from '../shared';
import { getCurrentWorkspaceId } from '../workspace';
import { randomBytes } from 'node:crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.qualiasolutions.net';

/**
 * H14 (OPTIMIZE.md): `getPortalHubData` + `getPortalClientManagement` both
 * called `supabase.auth.admin.listUsers({ perPage: 1000 })` on every dashboard
 * load. The GoTrue admin endpoint takes ~200-500ms per call and is rate-limited.
 *
 * Here we wrap the listUsers round-trip in `unstable_cache` keyed by a
 * stable tag so both action call sites share a single 120-second snapshot.
 * The cached value is a plain object (email -> last_sign_in_at) so it round-trips
 * through the cache layer without Map serialization issues. Callers build a
 * Map from the returned record.
 *
 * Cache is tagged `portal-auth-sign-in-map` so admin flows that need a
 * fresh read can bust it by revalidating the tag.
 */
const getCachedPortalSignInMap = unstable_cache(
  async (): Promise<Record<string, string | null>> => {
    try {
      const adminClient = createAdminClient();
      const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const map: Record<string, string | null> = {};
      for (const authUser of data?.users ?? []) {
        const email = authUser.email?.toLowerCase();
        if (email) {
          map[email] = authUser.last_sign_in_at ?? null;
        }
      }
      return map;
    } catch {
      // Service role key missing / listUsers failed — return empty map so
      // the caller continues to render without last-sign-in enrichment.
      return {};
    }
  },
  ['portal-auth-sign-in-map'],
  { revalidate: 120, tags: ['portal-auth-sign-in-map'] }
);

// ============================================================================
// SECTION: Client Invitations & Onboarding
// ============================================================================

/**
 * Invite a client to a project by email.
 * If the client already has a Supabase account, links them directly.
 * If not, creates an auth account via inviteUserByEmail and links once profile exists.
 */
export async function inviteClientByEmail(
  projectId: string,
  email: string,
  clientName?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin or manager
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins and managers can invite clients' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if a profile with this email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', normalizedEmail)
      .single();

    if (existingProfile) {
      // Profile exists — check role
      if (existingProfile.role === 'admin' || existingProfile.role === 'employee') {
        return {
          success: false,
          error: 'This email belongs to a team member, not a client',
        };
      }

      // Already a client profile — just link to project
      return inviteClientToProject(projectId, existingProfile.id);
    }

    // No existing profile — create auth account via admin API
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return {
        success: false,
        error: 'Service role key not configured. Cannot invite new users.',
      };
    }

    // Create user directly with a temporary password (no email required)
    const tempPassword = `Qualia-${randomBytes(12).toString('base64url')}!`;
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'client',
        full_name: clientName || null,
      },
    });

    if (createError) {
      console.error('[inviteClientByEmail] Create user error:', createError);
      return {
        success: false,
        error: `Failed to create client account: ${createError.message}`,
      };
    }

    if (!newUserData?.user?.id) {
      return { success: false, error: 'Account created but no user ID returned' };
    }

    const newUserId = newUserData.user.id;

    // Ensure profile exists with client role
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: newUserId,
        email: normalizedEmail,
        full_name: clientName || null,
        role: 'client',
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('[inviteClientByEmail] Profile creation error:', profileError);
    }

    // Link client to project
    const { error: linkError } = await adminClient.from('client_projects').insert({
      client_id: newUserId,
      project_id: projectId,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    });

    if (linkError) {
      console.error('[inviteClientByEmail] Link error:', linkError);
      // Rollback the created auth user to avoid orphan
      try {
        await adminClient.auth.admin.deleteUser(newUserId);
      } catch (rollbackErr) {
        console.error('[inviteClientByEmail] Rollback failed:', rollbackErr);
      }
      return {
        success: false,
        error:
          'Account created but failed to link project. Account has been cleaned up — please try again.',
      };
    }

    return {
      success: true,
      data: { userId: newUserId, tempPassword, emailSent: false },
    };
  } catch (error) {
    console.error('[inviteClientByEmail] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite client',
    };
  }
}

/**
 * Invite a client to a project (by existing profile ID).
 * Creates a link in client_projects table allowing the client to view the project.
 */
export async function inviteClientToProject(
  projectId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins can invite clients to projects' };
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('client_projects')
      .select('id')
      .eq('client_id', clientId)
      .eq('project_id', projectId)
      .single();

    if (existingLink) {
      return { success: false, error: 'Client is already invited to this project' };
    }

    // Verify the target is a client profile (not a team member)
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', clientId)
      .single();

    if (!targetProfile) {
      return { success: false, error: 'User not found' };
    }

    if (targetProfile.role !== 'client') {
      return { success: false, error: 'Cannot grant portal access to a team member account' };
    }

    // Create the client-project link
    const { data, error } = await supabase
      .from('client_projects')
      .insert({
        client_id: clientId,
        project_id: projectId,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to invite client to project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite client',
    };
  }
}

/**
 * Remove a client's access to a project
 * Deletes the client_projects link
 */
export async function removeClientFromProject(
  projectId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins can remove client access' };
    }

    // Delete the client-project link
    const { error } = await supabase
      .from('client_projects')
      .delete()
      .eq('client_id', clientId)
      .eq('project_id', projectId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Failed to remove client from project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove client access',
    };
  }
}

/**
 * Revoke portal access for a client.
 * Removes all project links and deletes the auth account.
 */
export async function revokePortalAccess(portalUserId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Don't allow revoking own access or team members
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', portalUserId)
      .single();

    if (!targetProfile || targetProfile.role !== 'client') {
      return { success: false, error: 'Can only revoke client portal accounts' };
    }

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return { success: false, error: 'Service role key not configured' };
    }

    // Remove all project links
    const { error: unlinkError } = await adminClient
      .from('client_projects')
      .delete()
      .eq('client_id', portalUserId);
    if (unlinkError) {
      console.error('[revokePortalAccess] Unlink error:', unlinkError);
      return { success: false, error: `Failed to remove project links: ${unlinkError.message}` };
    }

    // Delete the auth user (cascades to profile via trigger)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(portalUserId);
    if (deleteError) {
      console.error('[revokePortalAccess] Delete user error:', deleteError);
      return { success: false, error: `Failed to delete account: ${deleteError.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error('[revokePortalAccess] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke portal access',
    };
  }
}

// ============================================================================
// SECTION: Portal Admin Management
// ============================================================================

/**
 * Get admin portal management data:
 * - All projects with their assigned client count
 * - All client accounts with their project assignments
 */
export async function getPortalAdminData(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Get all client accounts
    const { data: clients, error: clientsError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (clientsError) {
      return { success: false, error: clientsError.message };
    }

    // Get all client-project assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('client_projects')
      .select(
        `
        id,
        client_id,
        project_id,
        access_level,
        invited_at,
        invited_by,
        client:profiles!client_id(id, full_name, email),
        project:projects!project_id(id, name, status, project_type)
      `
      )
      .order('invited_at', { ascending: false });

    if (assignmentsError) {
      return { success: false, error: assignmentsError.message };
    }

    // Normalize FK arrays
    const normalizedAssignments = (assignments || []).map((a) => ({
      ...a,
      client: Array.isArray(a.client) ? a.client[0] || null : a.client,
      project: Array.isArray(a.project) ? a.project[0] || null : a.project,
    }));

    return {
      success: true,
      data: {
        clients: clients || [],
        assignments: normalizedAssignments,
      },
    };
  } catch (error) {
    console.error('[getPortalAdminData] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load admin data',
    };
  }
}

/**
 * Reset a client's password by sending a reset email
 */
export async function sendClientPasswordReset(email: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify target is a client-role profile before sending reset
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', normalizedEmail)
      .single();

    if (!targetProfile) {
      return { success: false, error: 'No portal account found for this email' };
    }

    if (targetProfile.role !== 'client') {
      return { success: false, error: 'Password reset is only available for client accounts' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${APP_URL}/auth/reset-password/confirm`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[sendClientPasswordReset] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reset email',
    };
  }
}

// ============================================================================
// SECTION: CRM-to-Portal Integration
// ============================================================================

/**
 * Setup portal access for a CRM client by looking up their email from contacts JSONB.
 * Creates a portal user account if one doesn't exist, then links to specified projects.
 */
export async function setupPortalForClient(
  clientId: string,
  projectIds: string[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Look up the CRM client
    const { data: crmClient, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single();

    if (clientError || !crmClient) {
      return { success: false, error: 'CRM client not found' };
    }

    // Get primary contact email from client_contacts table
    const { data: primaryContact } = await supabase
      .from('client_contacts')
      .select('email')
      .eq('client_id', clientId)
      .eq('is_primary', true)
      .maybeSingle();

    // Fallback: get any contact email
    const contactEmail =
      primaryContact?.email ||
      (
        await supabase
          .from('client_contacts')
          .select('email')
          .eq('client_id', clientId)
          .not('email', 'is', null)
          .limit(1)
          .maybeSingle()
      ).data?.email;

    const normalizedEmail = contactEmail?.trim().toLowerCase();

    if (!normalizedEmail) {
      return { success: false, error: 'CRM client has no email on file' };
    }

    // Check for existing portal profile with that email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', normalizedEmail)
      .single();

    let userId: string;
    let tempPassword: string | undefined;
    let alreadyExisted = false;
    let adminClient: ReturnType<typeof createAdminClient>;

    try {
      adminClient = createAdminClient();
    } catch {
      return {
        success: false,
        error: 'Service role key not configured. Cannot manage client accounts.',
      };
    }

    if (existingProfile) {
      // Profile exists — check role
      if (existingProfile.role === 'admin' || existingProfile.role === 'employee') {
        return { success: false, error: 'This email belongs to a team member' };
      }

      // Already a client portal account
      userId = existingProfile.id;
      alreadyExisted = true;
    } else {
      // Create new auth user
      const generatedPassword = `Qualia-${randomBytes(12).toString('base64url')}`;
      tempPassword = generatedPassword;

      const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          role: 'client',
          full_name: crmClient.name,
        },
      });

      if (createError) {
        console.error('[setupPortalForClient] Create user error:', createError);
        return {
          success: false,
          error: `Failed to create client account: ${createError.message}`,
        };
      }

      if (!newUserData?.user?.id) {
        return { success: false, error: 'Account created but no user ID returned' };
      }

      userId = newUserData.user.id;

      // Upsert profile
      const { error: profileError } = await adminClient.from('profiles').upsert(
        {
          id: userId,
          email: normalizedEmail,
          full_name: crmClient.name,
          role: 'client',
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        console.error('[setupPortalForClient] Profile upsert error:', profileError);
      }
    }

    // Link to each project
    let projectsLinked = 0;
    const linkErrors: string[] = [];

    for (const projectId of projectIds) {
      // Check if link already exists
      const { data: existingLink } = await supabase
        .from('client_projects')
        .select('id')
        .eq('client_id', userId)
        .eq('project_id', projectId)
        .maybeSingle();

      if (existingLink) {
        // Already linked — skip
        projectsLinked++;
        continue;
      }

      const { error: linkError } = await adminClient.from('client_projects').insert({
        client_id: userId,
        project_id: projectId,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      });

      if (linkError) {
        console.error('[setupPortalForClient] Link error for project', projectId, linkError);
        linkErrors.push(projectId);
      } else {
        projectsLinked++;
      }
    }

    // If newly created but ALL project links failed, roll back orphaned auth user
    if (!alreadyExisted && projectIds.length > 0 && linkErrors.length === projectIds.length) {
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch (deleteErr) {
        console.error('[setupPortalForClient] Failed to roll back orphaned user:', deleteErr);
      }
      return { success: false, error: 'Account created but failed to link any projects' };
    }

    // Send invitation email to the client (new accounts only)
    if (!alreadyExisted && tempPassword) {
      try {
        await sendClientInvitationEmail(
          normalizedEmail,
          crmClient.name,
          tempPassword,
          projectsLinked
        );
      } catch (emailErr) {
        // Non-blocking — workspace was created, just log the failure
        console.error('[setupPortalForClient] Failed to send invitation email:', emailErr);
      }
    }

    return {
      success: true,
      data: {
        userId,
        email: normalizedEmail,
        name: crmClient.name,
        tempPassword,
        alreadyExisted,
        projectsLinked,
      },
    };
  } catch (error) {
    console.error('[setupPortalForClient] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to setup portal for client',
    };
  }
}

// ============================================================================
// SECTION: Email Notifications (Internal Helpers)
// ============================================================================

/**
 * Send a portal invitation email to a newly created client.
 */
async function sendClientInvitationEmail(
  email: string,
  clientName: string,
  tempPassword: string,
  projectCount: number
) {
  const { Resend } = await import('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[sendClientInvitationEmail] RESEND_API_KEY not set, skipping email');
    return;
  }

  const resend = new Resend(apiKey);
  const portalUrl = APP_URL;
  const firstName = clientName.split(' ')[0];

  await resend.emails.send({
    from: 'Qualia Solutions <notifications@qualiasolutions.net>',
    to: email,
    subject: `Your Qualia client portal is ready`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #00A4AC; color: white; font-weight: bold; font-size: 20px; width: 48px; height: 48px; line-height: 48px; border-radius: 12px;">Q</div>
        </div>
        <h1 style="font-size: 22px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px;">Welcome to your portal, ${firstName}</h1>
        <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 24px;">
          Your client portal is set up with ${projectCount} project${projectCount !== 1 ? 's' : ''}. Track progress, submit requests, view invoices, and share files — all in one place.
        </p>
        <div style="background: #f5f7f7; border: 1px solid #e0e5e5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #888; margin: 0 0 8px;">Your login credentials</p>
          <p style="font-size: 15px; color: #1a1a1a; margin: 0 0 6px;"><strong>Email:</strong> ${email}</p>
          <p style="font-size: 15px; color: #1a1a1a; margin: 0;"><strong>Password:</strong> ${tempPassword}</p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${portalUrl}/auth/login" style="display: inline-block; background: #00A4AC; color: white; font-size: 15px; font-weight: 500; text-decoration: none; padding: 12px 32px; border-radius: 10px;">Sign in to your portal</a>
        </div>
        <p style="font-size: 13px; color: #999; line-height: 1.5; margin: 0;">
          We recommend changing your password after your first login. If you have any questions, reply to this email or contact <a href="mailto:support@qualiasolutions.net" style="color: #00A4AC;">support@qualiasolutions.net</a>.
        </p>
      </div>
    `,
  });
}

// ============================================================================
// SECTION: Portal Project Assignment Management
// ============================================================================

/**
 * Update a portal client's project assignments (add new, remove deselected).
 * Uses the portal user ID (from profiles) to manage client_projects rows.
 */
export async function updateClientPortalProjects(
  crmClientId: string,
  projectIds: string[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Find the portal user ID via CRM client email
    const { data: primaryContact } = await supabase
      .from('client_contacts')
      .select('email')
      .eq('client_id', crmClientId)
      .eq('is_primary', true)
      .maybeSingle();

    const contactEmail =
      primaryContact?.email ||
      (
        await supabase
          .from('client_contacts')
          .select('email')
          .eq('client_id', crmClientId)
          .not('email', 'is', null)
          .limit(1)
          .maybeSingle()
      ).data?.email;

    if (!contactEmail) {
      return { success: false, error: 'Client has no email on file' };
    }

    const { data: portalProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', contactEmail.trim().toLowerCase())
      .eq('role', 'client')
      .single();

    if (!portalProfile) {
      return { success: false, error: 'Client has no portal account' };
    }

    const portalUserId = portalProfile.id;

    let adminClient: ReturnType<typeof createAdminClient>;
    try {
      adminClient = createAdminClient();
    } catch {
      return { success: false, error: 'Service role key not configured' };
    }

    // Get current assignments
    const { data: currentLinks } = await adminClient
      .from('client_projects')
      .select('id, project_id')
      .eq('client_id', portalUserId);

    const currentProjectIds = new Set((currentLinks ?? []).map((l) => l.project_id));
    const desiredProjectIds = new Set(projectIds);

    // Remove deselected
    const toRemove = (currentLinks ?? []).filter((l) => !desiredProjectIds.has(l.project_id));
    if (toRemove.length > 0) {
      const { error: delError } = await adminClient
        .from('client_projects')
        .delete()
        .in(
          'id',
          toRemove.map((l) => l.id)
        );
      if (delError) {
        console.error('[updateClientPortalProjects] Delete error:', delError);
      }
    }

    // Add new
    const toAdd = projectIds.filter((pid) => !currentProjectIds.has(pid));
    for (const projectId of toAdd) {
      const { error: insertError } = await adminClient.from('client_projects').insert({
        client_id: portalUserId,
        project_id: projectId,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error('[updateClientPortalProjects] Insert error:', insertError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[updateClientPortalProjects] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update projects',
    };
  }
}

// ============================================================================
// PORTAL CLIENT MANAGEMENT (admin overview with last login)
// ============================================================================

/**
 * Type for a merged client record with auth login data and project assignments.
 */
export interface MergedPortalClient {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  lastSignIn: string | null;
  isActive: boolean;
  projects: Array<{ id: string; name: string }>;
}

/**
 * Get all portal clients with their last sign-in date and project assignments.
 * Uses auth.admin.listUsers to fetch real last_sign_in_at from Supabase Auth.
 *
 * Note: listUsers is called with perPage=1000. For agencies with <1000 portal
 * clients this is fine. If you exceed 1000, add pagination here.
 */
export async function getPortalClientManagement(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Fetch all data in parallel. The cached sign-in map (H14) is shared
    // with getPortalHubData so both hit the same 120s snapshot.
    const [clientsResult, assignmentsResult, signInRecord] = await Promise.all([
      // All client profiles
      supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('role', 'client')
        .order('created_at', { ascending: false }),

      // All client-project assignments with project names
      supabase
        .from('client_projects')
        .select('client_id, project_id, project:projects!project_id(id, name)'),

      // Auth users last_sign_in_at — cached per H14
      getCachedPortalSignInMap(),
    ]);

    if (clientsResult.error) {
      return { success: false, error: clientsResult.error.message };
    }

    const signInMap = new Map<string, string | null>(Object.entries(signInRecord));

    // Build client_id -> projects map from assignments
    const projectsMap = new Map<string, Array<{ id: string; name: string }>>();
    for (const assignment of assignmentsResult.data ?? []) {
      const projectRaw = assignment.project;
      const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;
      if (!project) continue;

      const existing = projectsMap.get(assignment.client_id) ?? [];
      existing.push({ id: project.id, name: project.name });
      projectsMap.set(assignment.client_id, existing);
    }

    // 30-day activity threshold
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Merge all data
    const clients: MergedPortalClient[] = (clientsResult.data ?? []).map((profile) => {
      const email = profile.email?.toLowerCase() ?? null;
      const lastSignIn = email ? (signInMap.get(email) ?? null) : null;
      const isActive = lastSignIn ? new Date(lastSignIn) >= thirtyDaysAgo : false;
      const projects = projectsMap.get(profile.id) ?? [];

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        created_at: profile.created_at,
        lastSignIn,
        isActive,
        projects,
      };
    });

    const totalActive = clients.filter((c) => c.isActive).length;
    const totalInactive = clients.length - totalActive;

    return {
      success: true,
      data: { clients, totalActive, totalInactive },
    };
  } catch (error) {
    console.error('[getPortalClientManagement] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load client management data',
    };
  }
}

// ============================================================================
// SECTION: Bulk Operations
// ============================================================================

/**
 * Bulk setup portal access for multiple CRM clients at once.
 * Runs setupPortalForClient sequentially for each crmClientId (not in parallel to avoid rate limits).
 * Returns per-client results. success:true if at least one client succeeded.
 */
export async function bulkSetupPortalForClients(
  crmClientIds: string[],
  projectIds: string[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Validate inputs
    if (!crmClientIds || crmClientIds.length === 0) {
      return { success: false, error: 'At least one CRM client must be selected' };
    }

    if (!projectIds || projectIds.length === 0) {
      return { success: false, error: 'At least one project must be selected' };
    }

    type BulkResult = {
      crmClientId: string;
      success: boolean;
      email?: string;
      name?: string;
      tempPassword?: string;
      alreadyExisted?: boolean;
      projectsLinked?: number;
      error?: string;
    };

    const results: BulkResult[] = [];

    // Run sequentially to avoid rate limits with auth admin API
    for (const crmClientId of crmClientIds) {
      const result = await setupPortalForClient(crmClientId, projectIds);

      if (result.success && result.data) {
        const data = result.data as {
          userId: string;
          email: string;
          name: string;
          tempPassword?: string;
          alreadyExisted: boolean;
          projectsLinked: number;
        };

        results.push({
          crmClientId,
          success: true,
          email: data.email,
          name: data.name,
          tempPassword: data.tempPassword,
          alreadyExisted: data.alreadyExisted,
          projectsLinked: data.projectsLinked,
        });
      } else {
        results.push({
          crmClientId,
          success: false,
          error: result.error || 'Unknown error',
        });
      }
    }

    const totalSuccess = results.filter((r) => r.success).length;
    const totalFailed = results.filter((r) => !r.success).length;

    // Return success:true if at least one client succeeded; false only if ALL failed
    return {
      success: totalSuccess > 0,
      data: {
        results,
        totalSuccess,
        totalFailed,
      },
      ...(totalSuccess === 0 && { error: 'All client setups failed' }),
    };
  } catch (error) {
    console.error('[bulkSetupPortalForClients] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk setup portal clients',
    };
  }
}

// ============================================================================
// SECTION: Password Management
// ============================================================================

/**
 * Reset a client's portal password.
 * Generates a cryptographically secure temp password and updates the auth account via admin API.
 * Does NOT send an email — returns the new password for Moayad to share manually.
 */
export async function resetClientPassword(email: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Admin/manager only
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins and managers can reset client passwords' };
    }

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate cryptographically secure temp password
    const tempPassword = 'Qualia-' + randomBytes(6).toString('hex') + '!';

    // Look up user in auth by email
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return {
        success: false,
        error: 'Service role key not configured. Cannot reset password.',
      };
    }

    // Look up profile by email to get auth user ID
    const { data: profileRow } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .eq('email', normalizedEmail)
      .eq('role', 'client')
      .single();

    if (!profileRow) {
      return { success: false, error: 'No portal account found for this email' };
    }

    // Update password via admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(profileRow.id, {
      password: tempPassword,
    });

    if (updateError) {
      console.error('[resetClientPassword] Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      data: {
        email: normalizedEmail,
        tempPassword,
        name: profileRow.full_name ?? null,
      },
    };
  } catch (error) {
    console.error('[resetClientPassword] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset client password',
    };
  }
}

// ============================================================================
// PORTAL HUB — ALL CRM CLIENTS WITH PORTAL STATUS
// ============================================================================

export interface PortalHubClient {
  id: string;
  name: string;
  email: string | null;
  leadStatus: string | null;
  projects: Array<{ id: string; name: string; status: string | null; project_type: string | null }>;
  hasPortalAccess: boolean;
  portalUserId: string | null;
  lastSignIn: string | null;
}

/**
 * Get all CRM clients with their projects and portal access status.
 * Used by the admin portal hub page.
 */
export async function getPortalHubData(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Fetch CRM clients, contacts, projects, portal profiles, and assignments in parallel
    const [clientsResult, contactsResult, projectsResult, portalProfilesResult, assignmentsResult] =
      await Promise.all([
        supabase.from('clients').select('id, name, lead_status').order('name'),
        supabase.from('client_contacts').select('client_id, email, is_primary'),
        supabase
          .from('projects')
          .select('id, name, status, project_type, client_id')
          .not('status', 'eq', 'Canceled')
          .order('name'),
        supabase.from('profiles').select('id, email, full_name').eq('role', 'client'),
        supabase.from('client_projects').select('client_id, project_id'),
      ]);

    if (clientsResult.error) {
      return { success: false, error: clientsResult.error.message };
    }

    // Build email -> portal profile map
    const emailToPortalProfile = new Map<string, { id: string; email: string | null }>();
    for (const profile of portalProfilesResult.data ?? []) {
      if (profile.email) {
        emailToPortalProfile.set(profile.email.toLowerCase(), {
          id: profile.id,
          email: profile.email,
        });
      }
    }

    // Build portal user ID -> assigned project IDs
    const portalAssignments = new Map<string, Set<string>>();
    for (const a of assignmentsResult.data ?? []) {
      const existing = portalAssignments.get(a.client_id) ?? new Set();
      existing.add(a.project_id);
      portalAssignments.set(a.client_id, existing);
    }

    // Build client_id -> projects map
    const clientProjectsMap = new Map<
      string,
      Array<{ id: string; name: string; status: string | null; project_type: string | null }>
    >();
    for (const project of projectsResult.data ?? []) {
      if (!project.client_id) continue;
      const existing = clientProjectsMap.get(project.client_id) ?? [];
      existing.push({
        id: project.id,
        name: project.name,
        status: project.status,
        project_type: project.project_type,
      });
      clientProjectsMap.set(project.client_id, existing);
    }

    // Last-sign-in data via the cached shared helper (H14). Swallows
    // service-role-missing errors internally and returns an empty record.
    const signInRecord = await getCachedPortalSignInMap();
    const signInMap = new Map<string, string | null>(Object.entries(signInRecord));

    // Build client_id -> primary email map from client_contacts
    const clientEmailMap = new Map<string, string>();
    for (const contact of contactsResult.data ?? []) {
      if (!contact.email) continue;
      const email = contact.email.trim().toLowerCase();
      // Prefer primary contact, otherwise first one found
      if (contact.is_primary || !clientEmailMap.has(contact.client_id)) {
        clientEmailMap.set(contact.client_id, email);
      }
    }

    // Build project ID -> project detail map for portal assignment lookups
    const projectById = new Map<
      string,
      { id: string; name: string; status: string | null; project_type: string | null }
    >();
    for (const project of projectsResult.data ?? []) {
      projectById.set(project.id, {
        id: project.id,
        name: project.name,
        status: project.status,
        project_type: project.project_type,
      });
    }

    // Build the hub data — merge CRM projects + portal assignments
    const clients: PortalHubClient[] = (clientsResult.data ?? []).map((client) => {
      const firstEmail = clientEmailMap.get(client.id) ?? null;
      const portalProfile = firstEmail ? emailToPortalProfile.get(firstEmail) : null;

      // Start with CRM-linked projects
      const crmProjects = clientProjectsMap.get(client.id) ?? [];
      const projectIdSet = new Set(crmProjects.map((p) => p.id));

      // Merge in portal-assigned projects (from client_projects table)
      if (portalProfile) {
        const assignedIds = portalAssignments.get(portalProfile.id);
        if (assignedIds) {
          for (const pid of assignedIds) {
            if (!projectIdSet.has(pid)) {
              const proj = projectById.get(pid);
              if (proj) {
                crmProjects.push(proj);
                projectIdSet.add(pid);
              }
            }
          }
        }
      }

      return {
        id: client.id,
        name: client.name,
        email: firstEmail,
        leadStatus: client.lead_status,
        projects: crmProjects,
        hasPortalAccess: !!portalProfile,
        portalUserId: portalProfile?.id ?? null,
        lastSignIn: firstEmail ? (signInMap.get(firstEmail) ?? null) : null,
      };
    });

    // Collect all project IDs that are assigned to any portal user (for deduplication in UI)
    const allAssignedProjectIds: string[] = [];
    for (const ids of portalAssignments.values()) {
      for (const pid of ids) {
        allAssignedProjectIds.push(pid);
      }
    }

    return {
      success: true,
      data: { clients, assignedProjectIds: allAssignedProjectIds },
    };
  } catch (error) {
    console.error('[getPortalHubData] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load portal hub data',
    };
  }
}

// ============================================================================
// CREATE CLIENT WORKSPACE (admin — no pre-existing CRM entry required)
// ============================================================================

/**
 * Create a new client workspace from scratch:
 * 1. Optionally creates a CRM client row if none exists with this email
 * 2. Calls setupPortalForClient to create auth account + link projects
 *
 * Returns credential data (email, tempPassword) so the admin can copy it.
 */
export async function createClientWorkspace(
  name: string,
  email: string,
  projectIds: string[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin access required' };
    }

    // Input validation
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      return { success: false, error: 'Client name is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    if (!projectIds || projectIds.length === 0) {
      return { success: false, error: 'Select at least one project' };
    }

    // Early check: reject team member emails before creating CRM entry
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', normalizedEmail)
      .single();

    if (
      existingProfile &&
      (existingProfile.role === 'admin' || existingProfile.role === 'employee')
    ) {
      return {
        success: false,
        error: `This email belongs to a team member (${existingProfile.role}). Use a client email instead.`,
      };
    }

    // Get workspace ID
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: 'No workspace found' };
    }

    // Use admin client for CRM operations (bypasses RLS — we already verified permissions above)
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return { success: false, error: 'Service role key not configured' };
    }

    // Check if a CRM client with this email already exists (via client_contacts table)
    const { data: existingContact } = await adminClient
      .from('client_contacts')
      .select('client_id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    let clientId: string | null = existingContact?.client_id ?? null;
    let isNewCrmClient = false;

    // If not found, create a new CRM client row + contact
    if (!clientId) {
      const { data: newClient, error: insertError } = await adminClient
        .from('clients')
        .insert({
          name: trimmedName,
          workspace_id: workspaceId,
          lead_status: 'active_client',
        })
        .select('id')
        .single();

      if (insertError || !newClient) {
        console.error('[createClientWorkspace] CRM insert error:', insertError);
        return {
          success: false,
          error: `Failed to create CRM client entry: ${insertError?.message || 'Unknown error'}`,
        };
      }

      clientId = newClient.id;
      isNewCrmClient = true;

      // Create contact record
      const { error: contactError } = await adminClient.from('client_contacts').insert({
        client_id: clientId,
        name: trimmedName,
        email: normalizedEmail,
        is_primary: true,
      });

      if (contactError) {
        console.error('[createClientWorkspace] Contact insert error:', contactError);
      }
    }

    // Delegate to setupPortalForClient to handle auth account + project linking
    if (!clientId) {
      return { success: false, error: 'Failed to resolve client ID' };
    }
    const setupResult = await setupPortalForClient(clientId, projectIds);
    if (!setupResult.success) {
      return setupResult;
    }

    return {
      success: true,
      data: {
        ...(setupResult.data as object),
        clientId,
        isNewCrmClient,
      },
    };
  } catch (error) {
    console.error('[createClientWorkspace] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create client workspace',
    };
  }
}
