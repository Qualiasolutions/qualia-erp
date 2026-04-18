'use client';

import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { setDefaultWorkspace } from '@/app/actions/workspace';
import { createClient } from '@/lib/supabase/client';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
}

export interface WorkspaceWithAccess extends Workspace {
  hasAccess: boolean;
  role: string | null;
}

interface WorkspaceContextType {
  currentWorkspace: WorkspaceWithAccess | null;
  workspaces: WorkspaceWithAccess[];
  setCurrentWorkspace: (workspace: WorkspaceWithAccess) => Promise<boolean>;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspace, setCurrentWorkspaceState] = useState<WorkspaceWithAccess | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Fetch all workspaces
    const { data: allWorkspaces } = await supabase
      .from('workspaces')
      .select('id, name, slug, logo_url, description')
      .order('name');

    // Fetch user's workspace memberships
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, is_default')
      .eq('profile_id', user.id);

    if (allWorkspaces) {
      const membershipMap = new Map(
        (memberships || []).map((m) => [m.workspace_id, { role: m.role, is_default: m.is_default }])
      );

      const workspacesWithAccess: WorkspaceWithAccess[] = allWorkspaces.map((ws) => ({
        ...ws,
        hasAccess: membershipMap.has(ws.id),
        role: membershipMap.get(ws.id)?.role || null,
      }));

      // Sort: Qualia first, then alphabetically
      workspacesWithAccess.sort((a, b) => {
        if (a.slug === 'qualia') return -1;
        if (b.slug === 'qualia') return 1;
        return a.name.localeCompare(b.name);
      });

      setWorkspaces(workspacesWithAccess);

      // Find default workspace or first workspace user has access to
      const defaultMembership = memberships?.find((m) => m.is_default);
      let defaultWorkspace: WorkspaceWithAccess | null = null;

      if (defaultMembership) {
        defaultWorkspace =
          workspacesWithAccess.find((ws) => ws.id === defaultMembership.workspace_id) || null;
      }

      if (!defaultWorkspace) {
        // Fall back to first workspace user has access to
        defaultWorkspace = workspacesWithAccess.find((ws) => ws.hasAccess) || null;
      }

      if (defaultWorkspace) {
        setCurrentWorkspaceState(defaultWorkspace);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const setCurrentWorkspace = useCallback(
    async (workspace: WorkspaceWithAccess): Promise<boolean> => {
      // If user doesn't have access, return false (UI should show error)
      if (!workspace.hasAccess) {
        return false;
      }

      // Persist selection via server action so the mutation + access check
      // runs with the session on the server, not with the anon client.
      const result = await setDefaultWorkspace(workspace.id);
      if (!result.success) {
        console.error('Error setting default workspace:', result.error);
        return false;
      }

      // Update local state after DB is confirmed updated
      setCurrentWorkspaceState(workspace);

      return true;
    },
    []
  );

  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  // Only recreate when actual values change, not on every parent render
  const contextValue = useMemo(
    () => ({
      currentWorkspace,
      workspaces,
      setCurrentWorkspace,
      isLoading,
      refreshWorkspaces,
    }),
    [currentWorkspace, workspaces, setCurrentWorkspace, isLoading, refreshWorkspaces]
  );

  return <WorkspaceContext.Provider value={contextValue}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
