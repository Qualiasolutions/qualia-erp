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
