import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';

import { getPortalAuthUser } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';
import {
  getEmployeeProfile,
  type Period,
  type EmployeeProfilePayload,
} from '@/app/actions/admin-control';
import { EmployeeProfileShell } from '@/components/portal/employee-profile/profile-shell';

export const metadata: Metadata = {
  title: 'Employee · Admin | Qualia',
  robots: { index: false, follow: false },
};

const VALID_TABS = new Set(['tasks', 'trends', 'history']);
const VALID_PERIODS: Period[] = ['this_week', 'last_7d', 'this_month', 'last_30d'];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; period?: string }>;
}

export default async function EmployeeProfilePage({ params, searchParams }: PageProps) {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  if (!(await isUserAdmin(user.id))) redirect('/');

  const { id } = await params;
  const { tab: tabRaw, period: periodRaw } = await searchParams;
  const tab = (tabRaw && VALID_TABS.has(tabRaw) ? tabRaw : 'tasks') as
    | 'tasks'
    | 'trends'
    | 'history';
  const period: Period = VALID_PERIODS.includes(periodRaw as Period)
    ? (periodRaw as Period)
    : 'this_week';

  const profile: EmployeeProfilePayload | null = await getEmployeeProfile(id, period);
  if (!profile) notFound();

  return <EmployeeProfileShell profile={profile} initialTab={tab} />;
}
