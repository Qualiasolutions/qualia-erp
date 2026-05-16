import { redirect } from 'next/navigation';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { AdminSectionNav } from '@/components/portal/admin-section-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getPortalAuthUser();

  if (!user) redirect('/auth/login');

  const profile = await getPortalProfile(user.id);

  if (profile?.role !== 'admin') redirect('/dashboard');

  return (
    <div className="flex min-h-full flex-col">
      <AdminSectionNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
