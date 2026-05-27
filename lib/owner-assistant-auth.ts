import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { UserInfo } from '@/lib/ai/tools';

export const OWNER_ASSISTANT_COOKIE = 'qualia_owner_assistant';
export const OWNER_ASSISTANT_MAX_AGE = 60 * 60 * 24 * 60;

type OwnerAssistantContext = {
  user: UserInfo;
  workspaceId: string;
  supabase: ReturnType<typeof createAdminClient>;
  source: 'owner-code';
};

function ownerAssistantCode() {
  return process.env.OWNER_ASSISTANT_CODE || '0777233772';
}

function ownerAssistantSecret() {
  return (
    process.env.OWNER_ASSISTANT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ownerAssistantCode()
  );
}

function hmac(payload: string) {
  return createHmac('sha256', ownerAssistantSecret()).update(payload).digest('base64url');
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isValidOwnerAssistantCode(input: string) {
  return safeCompare(input.trim(), ownerAssistantCode());
}

export function createOwnerAssistantToken() {
  const issuedAt = Date.now().toString();
  const nonce = randomBytes(18).toString('base64url');
  const payload = `${issuedAt}.${nonce}`;
  return `${payload}.${hmac(payload)}`;
}

export async function hasValidOwnerAssistantSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OWNER_ASSISTANT_COOKIE)?.value;
  if (!token) return false;

  const [issuedAt, nonce, signature] = token.split('.');
  if (!issuedAt || !nonce || !signature) return false;

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) return false;
  if (Date.now() - issuedAtMs > OWNER_ASSISTANT_MAX_AGE * 1000) return false;

  return safeCompare(signature, hmac(`${issuedAt}.${nonce}`));
}

export function setOwnerAssistantCookie(response: NextResponse) {
  response.cookies.set(OWNER_ASSISTANT_COOKIE, createOwnerAssistantToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: OWNER_ASSISTANT_MAX_AGE,
  });
}

export function clearOwnerAssistantCookie(response: NextResponse) {
  response.cookies.set(OWNER_ASSISTANT_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

async function findOwnerProfile(supabase: ReturnType<typeof createAdminClient>) {
  const ownerEmail = process.env.OWNER_ASSISTANT_EMAIL || 'info@qualiasolutions.net';

  const byEmail = await supabase
    .from('profiles')
    .select('id, full_name, email, role, skill_level')
    .eq('email', ownerEmail)
    .maybeSingle();

  if (byEmail.data) return byEmail.data as UserInfo;

  const fallback = await supabase
    .from('profiles')
    .select('id, full_name, email, role, skill_level')
    .or('email.ilike.%fawzi%,full_name.ilike.%fawzi%')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  return (fallback.data as UserInfo | null) || null;
}

export async function getOwnerAssistantContext(): Promise<OwnerAssistantContext | null> {
  if (!(await hasValidOwnerAssistantSession())) return null;

  const supabase = createAdminClient();
  const user = await findOwnerProfile(supabase);
  if (!user || user.role !== 'admin') return null;

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, is_default')
    .eq('profile_id', user.id)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) return null;

  return {
    user,
    workspaceId: membership.workspace_id,
    supabase,
    source: 'owner-code',
  };
}
