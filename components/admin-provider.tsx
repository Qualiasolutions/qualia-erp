'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

// The super admin email address
const SUPER_ADMIN_EMAIL = 'info@qualiasolutions.net';

interface AdminContextType {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
  isManagerOrAbove: boolean;
  userRole: string | null;
  userEmail: string | null;
  userId: string | null;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isSuperAdmin: false,
  isManager: false,
  isManagerOrAbove: false,
  userRole: null,
  userEmail: null,
  userId: null,
  loading: true,
});

export function useAdminContext() {
  return useContext(AdminContext);
}

interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const [state, setState] = useState<AdminContextType>({
    isAdmin: false,
    isSuperAdmin: false,
    isManager: false,
    isManagerOrAbove: false,
    userRole: null,
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
        setState({
          isAdmin: false,
          isSuperAdmin: false,
          isManager: false,
          isManagerOrAbove: false,
          userRole: null,
          userEmail: null,
          userId: null,
          loading: false,
        });
        return;
      }

      // Check if super admin by email
      const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

      // Check role in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role || null;
      const isAdmin = userRole === 'admin' || isSuperAdmin;
      const isManager = userRole === 'manager';
      const isManagerOrAbove = isAdmin || isManager;

      setState({
        isAdmin,
        isSuperAdmin,
        isManager,
        isManagerOrAbove,
        userRole,
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

  return <AdminContext.Provider value={state}>{children}</AdminContext.Provider>;
}
