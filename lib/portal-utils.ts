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

    // Admins can access any project in the portal
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'employee') {
      return true;
    }

    const { data } = await supabase
      .from('client_projects')
      .select('id')
      .eq('client_id', userId)
      .eq('project_id', projectId)
      .single();

    return !!data;
  } catch {
    // No match found or error - deny access
    return false;
  }
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
