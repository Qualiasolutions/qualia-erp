import { NextResponse } from 'next/server';
import {
  clearOwnerAssistantCookie,
  hasValidOwnerAssistantSession,
  isValidOwnerAssistantCode,
  setOwnerAssistantCookie,
} from '@/lib/owner-assistant-auth';

export async function GET() {
  return NextResponse.json({ authenticated: await hasValidOwnerAssistantSession() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code || !isValidOwnerAssistantCode(body.code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  setOwnerAssistantCookie(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  clearOwnerAssistantCookie(response);
  return response;
}
