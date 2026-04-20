import { redirect } from 'next/navigation';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getPortalAuthUser();

  if (!user) redirect('/auth/login');

  const profile = await getPortalProfile(user.id);

  if (profile?.role !== 'admin') redirect('/');

  return <>{children}</>;
}
