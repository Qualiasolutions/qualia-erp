'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { createClient } from '@/lib/supabase/client';
import {
  getViewAsState,
  clearViewAs as clearViewAsAction,
  setViewAsUser,
} from '@/app/actions/view-as';
import { useAuthUser } from '@/components/providers/auth-provider';

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
  const router = useRouter();
  const { mutate } = useSWRConfig();
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

  const startViewAs = useCallback(
    (role: string, userId?: string) => {
      setViewAsRole(role);
      if (userId) {
        setViewAsUserId(userId);
        setViewAsUser(userId).then(async (result) => {
          if (!result.success) {
            console.error('[AdminProvider] Failed to switch view-as user:', result.error);
            setViewAsRole(null);
            setViewAsUserId(null);
            return;
          }
          // Static SWR keys (e.g. 'inbox-tasks') don't include the effective user,
          // so they'd serve the previous user's data after view-as switches.
          await mutate(() => true, undefined, { revalidate: true });
          router.refresh();
        });
        return;
      }

      router.refresh();
    },
    [router, mutate]
  );

  const stopViewAs = useCallback(() => {
    clearViewAsAction().then(async () => {
      setViewAsRole(null);
      setViewAsUserId(null);
      await mutate(() => true, undefined, { revalidate: true });
      router.refresh();
    });
  }, [router, mutate]);

  const { user: authUser, isLoading: authLoading } = useAuthUser();

  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      setRealRole(null);
      setBaseState({
        isSuperAdmin: false,
        userEmail: null,
        userId: null,
        loading: false,
      });
      return;
    }

    const fetchProfile = async () => {
      const supabase = createClient();
      const isSuperAdmin = authUser.email === SUPER_ADMIN_EMAIL;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', authUser.id)
        .single();

      setRealRole(profile?.role || null);
      setBaseState({
        isSuperAdmin,
        userEmail: authUser.email || null,
        userId: authUser.id,
        loading: false,
      });
    };

    fetchProfile();
  }, [authUser, authLoading]);

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
