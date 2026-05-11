'use server';

import { createClient } from '@/lib/supabase/server';
import { getPortalAuthUser } from '@/lib/portal-cache';

export interface IntegrationRow {
  provider: string;
  is_connected: boolean;
  last_verified_at: string | null;
  config: unknown;
}

export type IntegrationsPayload = {
  workspaceId: string;
  integrations: IntegrationRow[];
};

/**
 * Load data for the Integrations tab inside /admin hub.
 * Mirrors the data-fetching from `app/(portal)/settings/integrations/page.tsx`.
 */
export async function loadIntegrationsTab(): Promise<IntegrationsPayload> {
  const supabase = await createClient();
  const user = await getPortalAuthUser();

  if (!user) {
    return { workspaceId: '', integrations: [] };
  }

  // Get workspace from membership
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .single();

  const workspaceId = membership?.workspace_id ?? '';

  if (!workspaceId) {
    return { workspaceId: '', integrations: [] };
  }

  const { data: integrations } = await supabase
    .from('workspace_integrations')
    .select('provider, is_connected, last_verified_at, config')
    .eq('workspace_id', workspaceId);

  return {
    workspaceId,
    integrations: (integrations || []) as IntegrationRow[],
  };
}
