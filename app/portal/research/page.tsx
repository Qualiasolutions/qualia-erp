import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/portal-utils';
import { ResearchPageClient } from './research-page-client';
import { getResearchEntries } from '@/app/actions/research';

export const metadata = { title: 'Research' };

export const dynamic = 'force-dynamic';

export default async function PortalResearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const role = await getUserRole(user.id);
  // Only admin, manager, employee can access research
  if (role === 'client') redirect('/portal');

  const result = await getResearchEntries({ limit: 50 });
  const entries = result.success ? result.data || [] : [];

  return <ResearchPageClient initialEntries={entries} />;
}
