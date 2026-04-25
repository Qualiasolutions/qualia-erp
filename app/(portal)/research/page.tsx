import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/portal-utils';
import { QualiaResearchView } from '@/components/portal/qualia-research-view';
import { getResearchEntries } from '@/app/actions/research';

export const metadata = { title: 'Research' };

export default async function PortalResearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const role = await getUserRole(user.id);
  if (role === 'client') redirect('/');

  const isAdmin = role === 'admin';
  const result = await getResearchEntries({ limit: 50 });
  const entries = result.success ? result.data || [] : [];

  return <QualiaResearchView initialEntries={entries} isAdmin={isAdmin} />;
}
