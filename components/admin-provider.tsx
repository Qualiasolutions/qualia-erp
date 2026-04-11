'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

// The super admin email address
const SUPER_ADMIN_EMAIL = 'info@qualiasolutions.net';

// Unified view-as cookie managed by app/actions/view-as.ts
const VIEW_AS_COOKIE = 'view-as-user-id';

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

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=86400;samesite=lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

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

  // Read the unified view-as cookie on mount
  useEffect(() => {
    const cookieUser = getCookie(VIEW_AS_COOKIE);
    if (cookieUser) {
      setViewAsUserId(cookieUser);
      // Resolve the impersonated user's role
      const supabase = createClient();
      supabase
        .from('profiles')
        .select('role')
        .eq('id', cookieUser)
        .single()
        .then(({ data }) => {
          if (data?.role) setViewAsRole(data.role);
        });
    }
  }, []);

  const startViewAs = useCallback((role: string, userId?: string) => {
    setViewAsRole(role);
    if (userId) {
      setViewAsUserId(userId);
      setCookie(VIEW_AS_COOKIE, userId);
    }
    window.location.reload();
  }, []);

  const stopViewAs = useCallback(() => {
    setViewAsRole(null);
    setViewAsUserId(null);
    deleteCookie(VIEW_AS_COOKIE);
    window.location.reload();
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
