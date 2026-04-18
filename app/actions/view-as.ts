'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './shared';

const VIEW_AS_COOKIE = 'view-as-user-id';
const MAX_AGE = 60 * 60; // 1 hour — short window limits risk if admin session is compromised

export interface ViewAsUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface GroupedUsers {
  clients: ViewAsUser[];
  employees: ViewAsUser[];
}

/**
 * Get all users that an admin can impersonate, grouped by role.
 * Only admins can call this.
 */
export async function getViewableUsers(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return { success: false, error: 'Only admins can use view-as' };
    }

    // Fetch all users except the current admin
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .neq('id', user.id)
      .order('role')
      .order('full_name');

    if (error) {
      console.error('Failed to fetch viewable users:', error);
      return { success: false, error: 'Failed to load users' };
    }

    const grouped: GroupedUsers = {
      clients: [],
      employees: [],
    };

    for (const profile of profiles || []) {
      const u: ViewAsUser = {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
      };

      switch (profile.role) {
        case 'client':
          grouped.clients.push(u);
          break;
        case 'employee':
          grouped.employees.push(u);
          break;
        default:
          // admin users — skip (admin cannot view-as another admin)
          break;
      }
    }

    return { success: true, data: grouped };
  } catch (err) {
    console.error('getViewableUsers error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Set the view-as cookie to impersonate a user.
 * Only admins can call this.
 */
export async function setViewAsUser(userId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return { success: false, error: 'Only admins can use view-as' };
    }

    // Verify the target user exists
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return { success: false, error: 'User not found' };
    }

    const cookieStore = await cookies();
    cookieStore.set(VIEW_AS_COOKIE, userId, {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      maxAge: MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
    });

    console.info(
      '[VIEW-AS] Admin %s started viewing as user %s (role: %s)',
      user.id,
      userId,
      targetProfile.role
    );

    return { success: true };
  } catch (err) {
    console.error('setViewAsUser error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get current view-as state (server-side cookie read).
 * Used by AdminProvider so the cookie can be httpOnly.
 */
export async function getViewAsState(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, data: null };
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return { success: true, data: null };
    }

    const cookieStore = await cookies();
    const viewAsUserId = cookieStore.get(VIEW_AS_COOKIE)?.value;

    if (!viewAsUserId) {
      return { success: true, data: null };
    }

    // Resolve the impersonated user
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', viewAsUserId)
      .single();

    if (!targetProfile) {
      // Cookie refers to a deleted user — clean up
      cookieStore.delete(VIEW_AS_COOKIE);
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        userId: targetProfile.id,
        role: targetProfile.role,
        fullName: targetProfile.full_name,
        email: targetProfile.email,
      },
    };
  } catch (err) {
    console.error('getViewAsState error:', err);
    return { success: true, data: null };
  }
}

/**
 * Clear the view-as cookie, returning the admin to their own view.
 */
export async function clearViewAs(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    cookieStore.delete(VIEW_AS_COOKIE);

    if (user) {
      console.info('[VIEW-AS] Admin %s stopped viewing as another user', user.id);
    }

    return { success: true };
  } catch (err) {
    console.error('clearViewAs error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
