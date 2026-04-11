'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './shared';

const VIEW_AS_COOKIE = 'view-as-user-id';
const MAX_AGE = 60 * 60 * 24; // 24 hours

export interface ViewAsUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface GroupedUsers {
  clients: ViewAsUser[];
  employees: ViewAsUser[];
  managers: ViewAsUser[];
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
      managers: [],
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
        case 'manager':
          grouped.managers.push(u);
          break;
        default:
          // Other admin users — skip
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
      .select('id')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return { success: false, error: 'User not found' };
    }

    const cookieStore = await cookies();
    cookieStore.set(VIEW_AS_COOKIE, userId, {
      httpOnly: false, // Needs to be readable by client for banner
      path: '/',
      sameSite: 'strict',
      maxAge: MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
    });

    return { success: true };
  } catch (err) {
    console.error('setViewAsUser error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Clear the view-as cookie, returning the admin to their own view.
 */
export async function clearViewAs(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(VIEW_AS_COOKIE);
    return { success: true };
  } catch (err) {
    console.error('clearViewAs error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
