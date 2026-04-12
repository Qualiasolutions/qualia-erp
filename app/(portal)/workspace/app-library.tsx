'use client';

import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Home,
  FolderKanban,
  MessageSquare,
  FileText,
  CreditCard,
  Lightbulb,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { usePortalAppConfig, invalidatePortalAppConfig } from '@/lib/swr';
import { updatePortalAppConfig } from '@/app/actions/portal-admin';
import { createClient } from '@/lib/supabase/client';

// App definitions with metadata
const APP_DEFINITIONS: {
  key: string;
  label: string;
  icon: LucideIcon;
  alwaysOn: boolean;
}[] = [
  { key: 'home', label: 'Home', icon: Home, alwaysOn: true },
  { key: 'projects', label: 'Projects', icon: FolderKanban, alwaysOn: false },
  { key: 'messages', label: 'Messages', icon: MessageSquare, alwaysOn: false },
  { key: 'files', label: 'Files', icon: FileText, alwaysOn: false },
  { key: 'billing', label: 'Billing', icon: CreditCard, alwaysOn: false },
  { key: 'requests', label: 'Requests', icon: Lightbulb, alwaysOn: false },
  { key: 'settings', label: 'Settings', icon: Settings, alwaysOn: true },
];

interface ClientWithAccess {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AppLibraryProps {
  workspaceId: string;
}

export function AppLibrary({ workspaceId }: AppLibraryProps) {
  const [clients, setClients] = useState<ClientWithAccess[]>([]);
  const [clientConfigs, setClientConfigs] = useState<Record<string, Record<string, boolean>>>({});
  const [loadingClients, setLoadingClients] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Workspace defaults
  const { config: workspaceConfig, isLoading: loadingWorkspaceConfig } =
    usePortalAppConfig(workspaceId);

  // Fetch clients with portal access
  useEffect(() => {
    async function fetchClients() {
      try {
        const supabase = createClient();
        // Get unique client IDs from client_projects
        const { data: assignments } = await supabase.from('client_projects').select('client_id');

        if (!assignments || assignments.length === 0) {
          setClients([]);
          setLoadingClients(false);
          return;
        }

        const uniqueClientIds = [...new Set(assignments.map((a) => a.client_id))];

        // Fetch profiles for these client IDs
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', uniqueClientIds)
          .eq('role', 'client');

        setClients(profiles ?? []);

        // Fetch configs for each client
        const configs: Record<string, Record<string, boolean>> = {};
        for (const profile of profiles ?? []) {
          const { getPortalAppConfig } = await import('@/app/actions/portal-admin');
          const result = await getPortalAppConfig(workspaceId, profile.id);
          if (result.success && result.data) {
            configs[profile.id] = result.data as Record<string, boolean>;
          }
        }
        setClientConfigs(configs);
      } catch (error) {
        console.error('Failed to fetch portal clients:', error);
        toast.error('Failed to load client data');
      } finally {
        setLoadingClients(false);
      }
    }

    fetchClients();
  }, [workspaceId]);

  // Handle workspace default toggle
  const handleWorkspaceToggle = useCallback(
    async (appKey: string, checked: boolean) => {
      if (!workspaceConfig) return;
      const updateKey = `workspace-${appKey}`;
      setUpdatingKey(updateKey);

      const updatedApps = { ...workspaceConfig, [appKey]: checked };
      const result = await updatePortalAppConfig(workspaceId, null, updatedApps);

      if (result.success) {
        toast.success(
          `${APP_DEFINITIONS.find((a) => a.key === appKey)?.label ?? appKey} ${checked ? 'enabled' : 'disabled'} for workspace`
        );
        invalidatePortalAppConfig(workspaceId);
      } else {
        toast.error(result.error ?? 'Failed to update app config');
      }
      setUpdatingKey(null);
    },
    [workspaceConfig, workspaceId]
  );

  // Handle client-specific toggle
  const handleClientToggle = useCallback(
    async (clientId: string, appKey: string, checked: boolean) => {
      const updateKey = `${clientId}-${appKey}`;
      setUpdatingKey(updateKey);

      const currentConfig = clientConfigs[clientId] ?? workspaceConfig ?? {};
      const updatedApps = { ...currentConfig, [appKey]: checked };

      const result = await updatePortalAppConfig(workspaceId, clientId, updatedApps);

      if (result.success) {
        toast.success(`Updated app config for client`);
        setClientConfigs((prev) => ({
          ...prev,
          [clientId]: updatedApps,
        }));
        invalidatePortalAppConfig(workspaceId, clientId);
      } else {
        toast.error(result.error ?? 'Failed to update app config');
      }
      setUpdatingKey(null);
    },
    [clientConfigs, workspaceConfig, workspaceId]
  );

  if (loadingWorkspaceConfig || loadingClients) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace defaults */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Workspace Defaults</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Default app visibility for all clients. Individual clients can be customized below.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {APP_DEFINITIONS.map((app) => {
            const Icon = app.icon;
            const isEnabled = workspaceConfig?.[app.key] ?? true;
            const isUpdating = updatingKey === `workspace-${app.key}`;

            return (
              <div
                key={app.key}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Label
                    htmlFor={`workspace-${app.key}`}
                    className="cursor-pointer text-sm font-medium"
                  >
                    {app.label}
                  </Label>
                </div>
                <Switch
                  id={`workspace-${app.key}`}
                  checked={app.alwaysOn ? true : isEnabled}
                  disabled={app.alwaysOn || isUpdating}
                  onCheckedChange={(checked) => handleWorkspaceToggle(app.key, checked)}
                  aria-label={`Toggle ${app.label} for workspace`}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-client overrides */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Client-Specific Access</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Override workspace defaults for individual clients.
          </p>
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FolderKanban className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <p className="mt-3 text-base font-medium text-foreground">
              No clients with portal access
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign clients to projects to grant portal access.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => {
              const config = clientConfigs[client.id] ?? workspaceConfig ?? {};

              return (
                <div key={client.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(client.full_name ?? client.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {client.full_name ?? 'Unnamed Client'}
                      </p>
                      {client.email && (
                        <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {APP_DEFINITIONS.map((app) => {
                      const Icon = app.icon;
                      const isEnabled = config[app.key] ?? true;
                      const isUpdating = updatingKey === `${client.id}-${app.key}`;

                      return (
                        <div
                          key={app.key}
                          className="flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <Label
                              htmlFor={`${client.id}-${app.key}`}
                              className="cursor-pointer text-xs font-medium"
                            >
                              {app.label}
                            </Label>
                          </div>
                          <Switch
                            id={`${client.id}-${app.key}`}
                            checked={app.alwaysOn ? true : isEnabled}
                            disabled={app.alwaysOn || isUpdating}
                            onCheckedChange={(checked) =>
                              handleClientToggle(client.id, app.key, checked)
                            }
                            aria-label={`Toggle ${app.label} for ${client.full_name ?? 'client'}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
