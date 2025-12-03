'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// The super admin email address
const SUPER_ADMIN_EMAIL = 'info@qualiasolutions.net';

export interface AdminStatus {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userEmail: string | null;
  userId: string | null;
  loading: boolean;
}

export function useAdmin(): AdminStatus {
  const [status, setStatus] = useState<AdminStatus>({
    isAdmin: false,
    isSuperAdmin: false,
    userEmail: null,
    userId: null,
    loading: true,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus({
          isAdmin: false,
          isSuperAdmin: false,
          userEmail: null,
          userId: null,
          loading: false,
        });
        return;
      }

      // Check if super admin by email
      const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

      // Check if admin role in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin' || isSuperAdmin;

      setStatus({
        isAdmin,
        isSuperAdmin,
        userEmail: user.email || null,
        userId: user.id,
        loading: false,
      });
    };

    checkAdminStatus();

    // Listen for auth changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return status;
}

export function useCanEditProject(projectLeadId?: string | null): boolean {
  const { isAdmin, isSuperAdmin, userId } = useAdmin();

  // Super admin can edit anything
  if (isSuperAdmin) return true;

  // Admin can edit anything
  if (isAdmin) return true;

  // Project lead can edit their project
  if (userId && projectLeadId && userId === projectLeadId) return true;

  return false;
}

export function useCanDeleteProject(projectLeadId?: string | null): boolean {
  const { isAdmin, isSuperAdmin, userId } = useAdmin();

  // Super admin can delete anything
  if (isSuperAdmin) return true;

  // Admin can delete anything
  if (isAdmin) return true;

  // Project lead can delete their project
  if (userId && projectLeadId && userId === projectLeadId) return true;

  return false;
}
