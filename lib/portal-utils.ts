import { createClient } from '@/lib/supabase/server';

/**
 * Check if a user has the 'client' role
 * @param userId - The user ID to check
 * @returns true if user has client role, false otherwise
 */
export async function isClientRole(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    return data?.role === 'client';
  } catch (error) {
    console.error('Failed to check client role:', error);
    return false;
  }
}

/**
 * Check if a user has the 'admin' role
 */
export async function isAdminRole(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    return data?.role === 'admin';
  } catch (error) {
    console.error('Failed to check admin role:', error);
    return false;
  }
}

/**
 * Check if a user has portal admin privileges (admin or manager)
 */
export function isPortalAdminRole(role: string | null): boolean {
  return role === 'admin' || role === 'manager';
}

/**
 * Get user role from profiles
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    return data?.role || null;
  } catch (error) {
    console.error('Failed to get user role:', error);
    return null;
  }
}

/**
 * Check if a client has access to a specific project
 * @param userId - The client user ID
 * @param projectId - The project ID to check access for
 * @returns true if client has access, false otherwise
 */
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // Admins and managers can access any project
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      return true;
    }

    // Employees: check project_assignments
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

    // Clients: check client_projects
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
