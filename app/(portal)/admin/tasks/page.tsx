import { redirect } from 'next/navigation';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { isPortalAdminRole } from '@/lib/portal-utils';

export default async function AdminTasksRedirect() {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  // Admins land on the workspace-wide view; everyone else just gets their own tasks.
  if (isPortalAdminRole(profile?.role ?? null)) {
    redirect('/tasks?scope=all');
  }
  redirect('/tasks');
}
