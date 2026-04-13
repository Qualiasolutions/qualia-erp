'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

import { type ActionResult, isUserManagerOrAbove, getUserRole } from './shared';
import { PortalAppConfigSchema, PortalBrandingSchema } from '@/lib/validation';

// All 7 portal app keys
const ALL_APP_KEYS = [
  'home',
  'projects',
  'messages',
  'files',
  'billing',
  'requests',
  'settings',
] as const;

// Storage bucket name
const STORAGE_BUCKET = 'project-files';

// Max portal logo size: 2MB
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

// Allowed image MIME types for portal logo
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Get the portal app config for a workspace, optionally merged with client-specific overrides.
 * Returns a Record<string, boolean> with all 7 app keys.
 * All apps default to true if no config exists.
 */
export async function getPortalAppConfig(
  workspaceId: string,
  clientId?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Build the default map — all apps enabled
    const configMap: Record<string, boolean> = {};
    for (const key of ALL_APP_KEYS) {
      configMap[key] = true;
    }

    // Fetch workspace-level defaults (client_id IS NULL)
    const { data: workspaceDefaults, error: defaultsError } = await supabase
      .from('portal_app_config')
      .select('app_key, enabled')
      .eq('workspace_id', workspaceId)
      .is('client_id', null);

    if (defaultsError) {
      console.error('[getPortalAppConfig] Defaults query error:', defaultsError);
      return { success: false, error: 'Failed to load app config' };
    }

    // Apply workspace defaults
    for (const row of workspaceDefaults || []) {
      if (row.app_key in configMap) {
        configMap[row.app_key] = row.enabled;
      }
    }

    // If a clientId is provided, fetch client-specific overrides and merge
    if (clientId) {
      const { data: clientOverrides, error: overridesError } = await supabase
        .from('portal_app_config')
        .select('app_key, enabled')
        .eq('workspace_id', workspaceId)
        .eq('client_id', clientId);

      if (overridesError) {
        console.error('[getPortalAppConfig] Overrides query error:', overridesError);
        // Non-fatal: return workspace defaults only
      } else {
        for (const row of clientOverrides || []) {
          if (row.app_key in configMap) {
            configMap[row.app_key] = row.enabled;
          }
        }
      }
    }

    return { success: true, data: configMap };
  } catch (error) {
    console.error('[getPortalAppConfig] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load app config',
    };
  }
}

/**
 * Update portal app config for a workspace (defaults) or a specific client (overrides).
 * Upserts rows for each app key. Admin/manager only.
 */
export async function updatePortalAppConfig(
  workspaceId: string,
  clientId: string | null,
  apps: Record<string, boolean>
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins and managers can update app config' };
    }

    // Validate input
    const parsed = PortalAppConfigSchema.safeParse({ workspaceId, clientId, apps });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const validApps = parsed.data.apps;

    // Upsert each app config row
    for (const [appKey, enabled] of Object.entries(validApps)) {
      // Use the sentinel UUID for NULL client_id in the unique constraint
      const { error: upsertError } = await supabase.from('portal_app_config').upsert(
        {
          workspace_id: workspaceId,
          client_id: clientId,
          app_key: appKey,
          enabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "workspace_id,COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid),app_key",
        }
      );

      if (upsertError) {
        // Fallback: try delete + insert if upsert on expression-based constraint fails
        console.warn(
          '[updatePortalAppConfig] Upsert failed, falling back to delete+insert:',
          upsertError.message
        );

        // Delete existing row
        let deleteQuery = supabase
          .from('portal_app_config')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('app_key', appKey);

        if (clientId) {
          deleteQuery = deleteQuery.eq('client_id', clientId);
        } else {
          deleteQuery = deleteQuery.is('client_id', null);
        }

        await deleteQuery;

        // Insert new row
        const { error: insertError } = await supabase.from('portal_app_config').insert({
          workspace_id: workspaceId,
          client_id: clientId,
          app_key: appKey,
          enabled,
        });

        if (insertError) {
          console.error('[updatePortalAppConfig] Insert fallback error:', insertError);
          return { success: false, error: `Failed to update config for ${appKey}` };
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[updatePortalAppConfig] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update app config',
    };
  }
}

/**
 * Get portal branding for a workspace.
 * Returns the branding row or sensible defaults if none exists.
 * Any authenticated user can read branding.
 */
export async function getPortalBranding(workspaceId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('portal_branding')
      .select('id, workspace_id, company_name, logo_url, accent_color, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('[getPortalBranding] Query error:', error);
      return { success: false, error: 'Failed to load branding' };
    }

    // Return defaults if no branding row exists
    if (!data) {
      return {
        success: true,
        data: {
          workspace_id: workspaceId,
          company_name: null,
          logo_url: null,
          accent_color: null,
        },
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getPortalBranding] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load branding',
    };
  }
}

/**
 * Update portal branding for a workspace.
 * Upserts the branding row. Admin/manager only.
 */
export async function updatePortalBranding(
  workspaceId: string,
  data: { company_name?: string; accent_color?: string }
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins and managers can update branding' };
    }

    // Validate input
    const parsed = PortalBrandingSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.company_name !== undefined) {
      updateData.company_name = parsed.data.company_name;
    }
    if (parsed.data.accent_color !== undefined) {
      updateData.accent_color = parsed.data.accent_color;
    }

    // Try upsert
    const { error: upsertError } = await supabase.from('portal_branding').upsert(
      {
        workspace_id: workspaceId,
        ...updateData,
      },
      { onConflict: 'workspace_id' }
    );

    if (upsertError) {
      console.error('[updatePortalBranding] Upsert error:', upsertError);
      return { success: false, error: 'Failed to update branding' };
    }

    return { success: true };
  } catch (error) {
    console.error('[updatePortalBranding] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update branding',
    };
  }
}

/**
 * Upload a portal logo.
 * Accepts FormData with `file` (image) and `workspace_id`.
 * Validates file type (JPEG/PNG/WebP, max 2MB).
 * Uploads to Supabase Storage and updates portal_branding.logo_url.
 * Admin/manager only.
 */
export async function uploadPortalLogo(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins and managers can upload portal logos' };
    }

    const file = formData.get('file') as File | null;
    const workspaceId = formData.get('workspace_id') as string | null;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (!workspaceId) {
      return { success: false, error: 'Workspace ID is required' };
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      return { success: false, error: 'Logo size exceeds 2MB limit' };
    }

    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
    }

    // Generate storage path
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const storagePath = `logos/projects/${workspaceId}/logo.${ext}`;

    // Use admin client for storage (bypasses storage RLS — auth already verified above)
    const adminClient = createAdminClient();

    // Upload to storage (upsert to replace existing)
    const { error: uploadError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[uploadPortalLogo] Storage error:', uploadError);
      return { success: false, error: 'Failed to upload logo' };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = adminClient.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

    // Add cache-busting timestamp
    const logoUrl = `${publicUrl}?t=${Date.now()}`;

    // Upsert portal_branding row with new logo_url
    const { error: upsertError } = await supabase.from('portal_branding').upsert(
      {
        workspace_id: workspaceId,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id' }
    );

    if (upsertError) {
      console.error('[uploadPortalLogo] DB error:', upsertError);
      // Clean up uploaded file
      await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return { success: false, error: 'Failed to update branding' };
    }

    return { success: true, data: { logo_url: logoUrl } };
  } catch (error) {
    console.error('[uploadPortalLogo] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload portal logo',
    };
  }
}

/**
 * Get the list of enabled app keys for a specific client.
 * Used by the portal sidebar to determine which navigation items to show.
 * Auth: the client themselves OR admin/manager.
 */
export async function getEnabledAppsForClient(
  workspaceId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Auth check: must be the client themselves or admin/manager
    if (user.id !== clientId) {
      if (!(await isUserManagerOrAbove(user.id))) {
        // Also allow if user has 'client' role and is the same user
        const role = await getUserRole(user.id);
        if (role !== 'client' || user.id !== clientId) {
          return { success: false, error: 'Not authorized to view this client config' };
        }
      }
    }

    // Use getPortalAppConfig to get the merged config
    const configResult = await getPortalAppConfig(workspaceId, clientId);
    if (!configResult.success) {
      return configResult;
    }

    const configMap = configResult.data as Record<string, boolean>;

    // Filter to only enabled app keys
    const enabledApps = Object.entries(configMap)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    return { success: true, data: enabledApps };
  } catch (error) {
    console.error('[getEnabledAppsForClient] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get enabled apps',
    };
  }
}
