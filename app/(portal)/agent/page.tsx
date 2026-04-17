import { redirect } from 'next/navigation';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { AgentClient } from './agent-client';

export default async function AgentPage() {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  if (profile?.role === 'client') redirect('/');

  return <AgentClient />;
}
