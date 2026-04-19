import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Request-scoped memoization helpers for the portal render tree.
 *
 * Layout + page + nested segments all need the same facts about the current
 * user (auth user, profile, view-as target, effective role). Without
 * memoization, each render segment re-queries Supabase, which is why OPTIMIZE.md
 * flagged H9 (layout waterfall) and H10 (admin page chain).
 *
 * React's `cache()` deduplicates calls within a single request — first call
 * fires the query, subsequent calls in the same render return the same promise.
 * Use these helpers everywhere in the portal tree instead of inline
 * `supabase.auth.getUser()` + profile selects.
 */

export type PortalProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
};

/**
 * Request-scoped auth user. Prefer this over inline `supabase.auth.getUser()`
 * so layout + page share a single roundtrip.
 */
export const getPortalAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Request-scoped profile by id. Always selects the full display projection
 * so every caller can read name/email/avatar/role without extra queries.
 */
export const getPortalProfile = cache(async (userId: string): Promise<PortalProfile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role')
    .eq('id', userId)
    .single();
  return data;
});

/**
 * Reads the `view-as-user-id` cookie. Cached so that layout + page don't each
 * parse cookies independently.
 */
export const getViewAsCookieId = cache(async (): Promise<string | null> => {
  const store = await cookies();
  return store.get('view-as-user-id')?.value || null;
});

/**
 * Resolves a client user's primary brand logo. Prefers the first linked
 * project's `logo_url`, falls back to the CRM client's `logo_url`. Returns
 * null when nothing is set so the UI renders its letter fallback.
 *
 * `profileId` is the portal profile.id (== client_projects.client_id).
 * Cached per request so layout + page share one roundtrip.
 */
export const getClientPrimaryLogo = cache(async (profileId: string): Promise<string | null> => {
  const supabase = await createClient();

  const { data: cp } = await supabase
    .from('client_projects')
    .select('projects!inner(logo_url)')
    .eq('client_id', profileId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const proj =
    (cp?.projects as { logo_url?: string | null } | { logo_url?: string | null }[] | null) || null;
  const projectLogo = Array.isArray(proj) ? proj[0]?.logo_url : proj?.logo_url;
  if (projectLogo) return projectLogo;

  // Fallback: the CRM client linked to this profile's primary contact.
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', profileId)
    .maybeSingle();
  const email = profile?.email?.trim().toLowerCase();
  if (!email) return null;

  const { data: contact } = await supabase
    .from('client_contacts')
    .select('clients:clients!inner(logo_url)')
    .eq('email', email)
    .eq('is_primary', true)
    .limit(1)
    .maybeSingle();
  const clientRow =
    (contact?.clients as { logo_url?: string | null } | { logo_url?: string | null }[] | null) ||
    null;
  const clientLogo = Array.isArray(clientRow) ? clientRow[0]?.logo_url : clientRow?.logo_url;
  return clientLogo || null;
});

/**
 * Resolves the logo for a known workspace/client id (admin flow where the
 * workspace IS the CRM client record). Prefers first project's logo, falls
 * back to the client's own `logo_url`.
 */
export const getWorkspaceClientLogo = cache(async (clientId: string): Promise<string | null> => {
  const supabase = await createClient();

  const { data: cp } = await supabase
    .from('client_projects')
    .select('projects!inner(logo_url)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const proj =
    (cp?.projects as { logo_url?: string | null } | { logo_url?: string | null }[] | null) || null;
  const projectLogo = Array.isArray(proj) ? proj[0]?.logo_url : proj?.logo_url;
  if (projectLogo) return projectLogo;

  const { data: client } = await supabase
    .from('clients')
    .select('logo_url')
    .eq('id', clientId)
    .maybeSingle();
  return client?.logo_url || null;
});
