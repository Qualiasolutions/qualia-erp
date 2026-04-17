import { redirect } from 'next/navigation';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { isPortalAdminRole } from '@/lib/portal-utils';
import { AdminReportsClient } from './reports-client';

export default async function AdminReportsPage() {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  if (!isPortalAdminRole(profile?.role ?? null)) redirect('/');

  return <AdminReportsClient />;
}
