'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateToken } from '@/lib/api-auth';
import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';

/**
 * API token management for qualia-framework ERP ingest.
 *
 * All mutations are admin-only. Plaintext tokens are returned ONCE at mint
 * time and never stored — only sha256(plaintext) is persisted.
 */

const ALLOWED_SCOPES = [
  'reports:write',
  'reports:read',
  'projects:read',
  'projects:write',
  'mcp:read',
  'mcp:write',
  'admin',
  '*',
] as const;

const scopeSchema = z
  .string()
  .min(1)
  .max(200)
  .refine(
    (raw) => {
      const parts = raw.split(/\s+/).filter(Boolean);
      if (parts.length === 0) return false;
      return parts.every((p) => (ALLOWED_SCOPES as readonly string[]).includes(p));
    },
    { message: `Scope must be a space-separated subset of: ${ALLOWED_SCOPES.join(', ')}` }
  );

const mintSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1).max(120),
  scope: scopeSchema.default('reports:write'),
  expiresInDays: z.number().int().min(1).max(365).default(90),
});

export async function mintApiToken(input: z.infer<typeof mintSchema>): Promise<ActionResult> {
  const parsed = mintSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input: ' + parsed.error.message };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getClaims();
  const actorId = userData?.claims?.sub;
  if (!actorId) return { success: false, error: 'Unauthenticated' };
  if (!(await isUserAdmin(actorId))) return { success: false, error: 'Admin only' };

  const { plaintext, hash, prefix } = generateToken();
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from('api_tokens')
    .insert({
      profile_id: parsed.data.profileId,
      name: parsed.data.name,
      token_hash: hash,
      token_prefix: prefix,
      scope: parsed.data.scope,
      expires_at: expiresAt.toISOString(),
      created_by: actorId,
    })
    .select('id, expires_at')
    .single();

  if (error || !inserted) {
    return { success: false, error: error?.message ?? 'Insert failed' };
  }

  return {
    success: true,
    data: {
      id: inserted.id,
      plaintext,
      prefix,
      expiresAt: inserted.expires_at,
      shownOnce: true,
    },
  };
}

export async function revokeApiToken(tokenId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(tokenId).success) {
    return { success: false, error: 'Invalid tokenId' };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getClaims();
  const actorId = userData?.claims?.sub;
  if (!actorId) return { success: false, error: 'Unauthenticated' };

  const admin = createAdminClient();

  // Admin can revoke any; user can revoke their own.
  const { data: token } = await admin
    .from('api_tokens')
    .select('id, profile_id, revoked_at')
    .eq('id', tokenId)
    .maybeSingle();

  if (!token) return { success: false, error: 'Token not found' };
  if (token.revoked_at) return { success: true, data: { alreadyRevoked: true } };

  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin && token.profile_id !== actorId) {
    return { success: false, error: 'Not authorized to revoke this token' };
  }

  const { data, error } = await admin
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Not found or permission denied' };
  return { success: true };
}

/**
 * Admin-only: list every token across the workspace with the owner's name.
 * Used by the admin Tokens panel.
 */
export async function listAllApiTokens(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getClaims();
  const actorId = userData?.claims?.sub;
  if (!actorId) return { success: false, error: 'Unauthenticated' };
  if (!(await isUserAdmin(actorId))) return { success: false, error: 'Admin only' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('api_tokens')
    .select(
      'id, name, token_prefix, scope, expires_at, revoked_at, last_used_at, created_at, profile_id, profile:profiles!api_tokens_profile_id_fkey(id, full_name, email)'
    )
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function listApiTokens(profileId?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getClaims();
  const actorId = userData?.claims?.sub;
  if (!actorId) return { success: false, error: 'Unauthenticated' };

  const isAdmin = await isUserAdmin(actorId);
  const targetProfile = profileId ?? actorId;

  if (!isAdmin && targetProfile !== actorId) {
    return { success: false, error: "Cannot list other users' tokens" };
  }

  // RLS enforces this too, but keep explicit filter for clarity.
  const { data, error } = await supabase
    .from('api_tokens')
    .select('id, name, token_prefix, scope, expires_at, revoked_at, last_used_at, created_at')
    .eq('profile_id', targetProfile)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
