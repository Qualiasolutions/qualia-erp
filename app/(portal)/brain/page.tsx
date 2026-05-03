import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getPortalAuthUser } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';
import { BrainView } from './brain-client';

export const metadata: Metadata = {
  title: 'Brain | Qualia',
  description: 'Search across reports, projects, and client activity.',
};

export default async function BrainPage() {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  if (!(await isUserAdmin(user.id))) redirect('/');

  return <BrainView />;
}
