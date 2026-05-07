import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { getPortalAuthUser } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';
import { AdminAttendanceClient } from './attendance-client';

export const metadata: Metadata = {
  title: 'Attendance log | Qualia',
  robots: { index: false, follow: false },
};

export default async function AdminAttendancePage() {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  if (!(await isUserAdmin(user.id))) redirect('/dashboard');

  return <AdminAttendanceClient />;
}
