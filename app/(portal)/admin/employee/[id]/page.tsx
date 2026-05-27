import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { getPortalAuthUser } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; period?: string }>;
}

export default async function EmployeeProfileRedirectPage({ params, searchParams }: PageProps) {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  if (!(await isUserAdmin(user.id))) redirect('/dashboard');

  const { id } = await params;
  const { tab, period } = await searchParams;

  const query = new URLSearchParams();
  if (tab) query.set('tab', tab);
  if (period) query.set('period', period);

  const queryString = query.toString();
  redirect(`/admin/people/${id}${queryString ? `?${queryString}` : ''}`);
}
