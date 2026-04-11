'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getViewAsState, clearViewAs as clearViewAsAction } from '@/app/actions/view-as';

// The super admin email address
const SUPER_ADMIN_EMAIL = 'info@qualiasolutions.net';

interface AdminContextType {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** @deprecated Manager role removed — use isAdmin instead */
  isManagerOrAbove: boolean;
  userRole: string | null;
  userEmail: string | null;
  userId: string | null;
  loading: boolean;
  /** True when admin is viewing the platform as another role */
  isViewingAs: boolean;
  /** The real role before any view-as override */
  realRole: string | null;
  /** The user ID being viewed as */
  viewAsUserId: string | null;
  /** Start viewing as a different role (admin only) */
  startViewAs: (role: string, userId?: string) => void;
  /** Stop viewing as another role */
  stopViewAs: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isSuperAdmin: false,
  isManagerOrAbove: false,
  userRole: null,
  userEmail: null,
  userId: null,
  loading: true,
  isViewingAs: false,
  realRole: null,
  viewAsUserId: null,
  startViewAs: () => {},
  stopViewAs: () => {},
});

export function useAdminContext() {
  return useContext(AdminContext);
}

// Cookie is now httpOnly — all view-as state resolved via server actions

interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const [realRole, setRealRole] = useState<string | null>(null);
  const [viewAsRole, setViewAsRole] = useState<string | null>(null);
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const [baseState, setBaseState] = useState<{
    isSuperAdmin: boolean;
    userEmail: string | null;
    userId: string | null;
    loading: boolean;
  }>({ isSuperAdmin: false, userEmail: null, userId: null, loading: true });

  // Resolve view-as state from httpOnly cookie via server action
  useEffect(() => {
    getViewAsState().then((result) => {
      if (result.success && result.data) {
        const { userId, role } = result.data as { userId: string; role: string };
        setViewAsUserId(userId);
        setViewAsRole(role);
      }
    });
  }, []);

  const startViewAs = useCallback((role: string, userId?: string) => {
    // Cookie is set by the server action setViewAsUser() — just update local state + reload
    setViewAsRole(role);
    if (userId) setViewAsUserId(userId);
    window.location.reload();
  }, []);

  const stopViewAs = useCallback(() => {
    clearViewAsAction().then(() => {
      setViewAsRole(null);
      setViewAsUserId(null);
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRealRole(null);
        setBaseState({
          isSuperAdmin: false,
          userEmail: null,
          userId: null,
          loading: false,
        });
        return;
      }

      const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      setRealRole(profile?.role || null);
      setBaseState({
        isSuperAdmin,
        userEmail: user.email || null,
        userId: user.id,
        loading: false,
      });
    };

    checkAdminStatus();

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

  // Only admins can use view-as; compute effective role
  const isRealAdmin = realRole === 'admin' || baseState.isSuperAdmin;
  const isViewingAs = isRealAdmin && viewAsRole !== null;
  const effectiveRole = isViewingAs ? viewAsRole : realRole;

  const isAdmin = effectiveRole === 'admin' || (baseState.isSuperAdmin && !isViewingAs);
  const isManagerOrAbove = isAdmin;

  const contextValue: AdminContextType = {
    isAdmin,
    isSuperAdmin: baseState.isSuperAdmin && !isViewingAs,
    isManagerOrAbove,
    userRole: effectiveRole,
    userEmail: baseState.userEmail,
    userId: baseState.userId,
    loading: baseState.loading,
    isViewingAs,
    realRole,
    viewAsUserId,
    startViewAs,
    stopViewAs,
  };

  return <AdminContext.Provider value={contextValue}>{children}</AdminContext.Provider>;
}
