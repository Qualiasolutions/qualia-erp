import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { safeCompare } from '@/lib/auth-utils';

/**
 * Dual-auth for qualia-framework ERP ingest endpoints.
 *
 * Priority:
 *  1. Bearer token matching an active api_tokens row (per-user, qlt_* prefix).
 *  2. Legacy shared CLAUDE_API_KEY env (grandfathered — emits deprecation headers).
 *
 * Legacy path is revoked in v3.6 (feature/erp-v3.6-cleanup). Until then, any
 * response from an endpoint that accepted the legacy key MUST merge
 * LEGACY_DEPRECATION_HEADERS into its response.
 */

export const TOKEN_PREFIX = 'qlt_';
export const TOKEN_BYTES = 32;

/** RFC 8594 Sunset + RFC 9745 Deprecation. 30-day grandfather window. */
export const LEGACY_SUNSET_DATE = '2026-05-17T00:00:00Z';

export const LEGACY_DEPRECATION_HEADERS = {
  Deprecation: 'true',
  Sunset: LEGACY_SUNSET_DATE,
  Link: '</docs/erp-contract#per-user-tokens>; rel="deprecation"; type="text/html"',
  Warning:
    '299 - "CLAUDE_API_KEY is deprecated. Migrate to per-user tokens before ' +
    LEGACY_SUNSET_DATE +
    '."',
} as const;

export type AuthResult =
  | {
      ok: true;
      method: 'per_user_token';
      tokenId: string;
      profileId: string;
      scope: string;
    }
  | {
      ok: true;
      method: 'legacy_shared_key';
      tokenId: null;
      profileId: null;
      scope: 'reports:write';
    }
  | {
      ok: false;
      error: 'MISSING_BEARER' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'TOKEN_REVOKED';
      message: string;
    };

export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export function hashToken(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Generate a new per-user token. Returns { plaintext, hash, prefix }.
 * The plaintext is shown to the user ONCE at mint time and never stored.
 */
export function generateToken(): { plaintext: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const plaintext = `${TOKEN_PREFIX}${random}`;
  return {
    plaintext,
    hash: hashToken(plaintext),
    prefix: plaintext.slice(0, 12),
  };
}

export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const bearer = extractBearer(request.headers.get('authorization'));

  if (!bearer) {
    return {
      ok: false,
      error: 'MISSING_BEARER',
      message: 'Authorization: Bearer <token> required',
    };
  }

  // Per-user token path: any token starting with qlt_ must resolve via api_tokens.
  if (bearer.startsWith(TOKEN_PREFIX)) {
    const hash = hashToken(bearer);
    const supabase = createAdminClient();

    const { data: token, error } = await supabase
      .from('api_tokens')
      .select('id, profile_id, scope, expires_at, revoked_at')
      .eq('token_hash', hash)
      .maybeSingle();

    if (error || !token) {
      return { ok: false, error: 'INVALID_TOKEN', message: 'Token not recognized' };
    }
    if (token.revoked_at) {
      return { ok: false, error: 'TOKEN_REVOKED', message: 'Token revoked' };
    }
    if (new Date(token.expires_at) < new Date()) {
      return {
        ok: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token expired — request a new one from admin',
      };
    }

    // Fire-and-forget last_used_at update. Don't block ingest on telemetry.
    supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', token.id)
      .then(() => {});

    return {
      ok: true,
      method: 'per_user_token',
      tokenId: token.id,
      profileId: token.profile_id,
      scope: token.scope,
    };
  }

  // Legacy shared-key path (grandfathered until LEGACY_SUNSET_DATE).
  const legacyKey = process.env.CLAUDE_API_KEY;
  if (legacyKey && safeCompare(bearer, legacyKey)) {
    return {
      ok: true,
      method: 'legacy_shared_key',
      tokenId: null,
      profileId: null,
      scope: 'reports:write',
    };
  }

  return { ok: false, error: 'INVALID_TOKEN', message: 'Token not recognized' };
}
