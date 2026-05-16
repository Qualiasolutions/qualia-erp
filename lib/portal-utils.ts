import { createClient } from '@/lib/supabase/server';

/**
 * Synchronous admin check — takes an already-resolved role string.
 * After 2026-04-18 this is just admin — `manager` was removed from the role
 * model. For the async DB-fetching variant use `isUserAdmin` from
 * `@/app/actions/shared`.
 */
export function isPortalAdminRole(role: string | null): boolean {
  return role === 'admin';
}

/**
 * Strict project-access check used by client-facing surfaces (feature
 * requests, comments, file downloads). Employees must be explicitly
 * assigned via `project_assignments` — plain workspace membership is NOT
 * sufficient here.
 *
 * For the looser "any workspace member can read" variant used by internal
 * operations, use `canAccessProject` from `@/app/actions/shared`.
 */
export async function canAccessProjectStrict(userId: string, projectId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') return true;

    if (profile?.role === 'employee') {
      const { data } = await supabase
        .from('project_assignments')
        .select('id')
        .eq('employee_id', userId)
        .eq('project_id', projectId)
        .is('removed_at', null)
        .maybeSingle();
      return !!data;
    }

    const { data } = await supabase
      .from('client_projects')
      .select('id')
      .eq('client_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Resolve effective user for portal pages considering view-as impersonation.
 * Returns the target user's id and role when an admin is viewing-as, otherwise the real user.
 */
export async function resolveEffectiveUser(
  userId: string,
  userRole: string
): Promise<{ effectiveUserId: string; effectiveRole: string }> {
  if (userRole !== 'admin') {
    return { effectiveUserId: userId, effectiveRole: userRole };
  }

  // Dynamic import to avoid pulling cookies() into non-server contexts
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const viewAsUserId = cookieStore.get('view-as-user-id')?.value;

  if (!viewAsUserId) {
    return { effectiveUserId: userId, effectiveRole: userRole };
  }

  const supabase = await createClient();
  const { data: viewAsProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', viewAsUserId)
    .single();

  if (viewAsProfile) {
    return {
      effectiveUserId: viewAsProfile.id,
      effectiveRole: viewAsProfile.role || 'client',
    };
  }

  return { effectiveUserId: userId, effectiveRole: userRole };
}

/**
 * Resolve a client's workspace from their first linked client_projects row.
 * Mirrors the workspace resolution in app/(portal)/layout.tsx — clients are
 * never inserted into workspace_members, so getCurrentWorkspaceId() returns
 * null for them. Use this helper instead.
 */
export async function getClientWorkspaceId(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('client_projects')
      .select('projects!inner(workspace_id)')
      .eq('client_id', userId)
      .limit(1)
      .maybeSingle();

    if (!data?.projects) return null;
    const proj = Array.isArray(data.projects) ? data.projects[0] : data.projects;
    return proj?.workspace_id ?? null;
  } catch (error) {
    console.error('Failed to resolve client workspace:', error);
    return null;
  }
}

/**
 * Assert that a given portal app is enabled for a user.
 * Internal users (admin, employee) always pass.
 * Clients are checked against the App Library config via getEnabledAppsForClient.
 * Workspace is resolved internally — callers don't need to pass it.
 *
 * @param userId - The user to check
 * @param appKey - The app key to check (e.g. 'messages', 'billing', 'files')
 * @param role - The user's role
 * @returns true if the user may access the app, false otherwise
 */
export async function assertAppEnabledForClient(
  userId: string,
  appKey: string,
  role: string | null
): Promise<boolean> {
  // Internal users pass unconditionally.
  if (role === 'admin' || role === 'employee') return true;
  if (role !== 'client') return false;

  const workspaceId = await getClientWorkspaceId(userId);
  // No workspace yet (client not linked to a project): allow the default client
  // shell so the portal is usable on day one. Pages render empty states. The
  // App Library still gates access once a workspace is resolved.
  if (!workspaceId) {
    const SHELL_APPS = ['home', 'requests', 'messages', 'billing', 'settings'];
    return SHELL_APPS.includes(appKey);
  }

  const { getEnabledAppsForClient } = await import('@/app/actions/portal-admin');
  const result = await getEnabledAppsForClient(workspaceId, userId);
  if (!result.success || !Array.isArray(result.data)) return false;
  return (result.data as string[]).includes(appKey);
}

/**
 * Get all project IDs that a client has access to
 * @param userId - The client user ID
 * @returns Array of project IDs the client can access
 */
export async function getClientProjectIds(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', userId);

    if (error) throw error;
    if (!data) return [];

    return data.map((row: { project_id: string }) => row.project_id);
  } catch (error) {
    console.error('Failed to get client project IDs:', error);
    return [];
  }
}

/**
 * Guard for mutation actions: blocks writes while an admin is impersonating another user.
 * Call at the top of any create/update/delete server action, right after auth.
 */
export async function assertNotImpersonating(): Promise<{ ok: boolean; error?: string }> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const viewAsId = cookieStore.get('view-as-user-id')?.value;
  if (viewAsId) {
    return {
      ok: false,
      error: 'Cannot modify data while viewing as another user. Exit view-as first.',
    };
  }
  return { ok: true };
}
