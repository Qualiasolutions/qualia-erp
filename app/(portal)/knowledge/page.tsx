import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCachedUserRole } from '@/app/actions/shared';
import { QualiaKnowledgeView } from '@/components/portal/qualia-knowledge-view';
import { getKnowledgeGuides } from '@/app/actions/knowledge';
import { type Guide } from '@/lib/guides-data';

export const metadata = { title: 'Knowledge Base' };

export default async function PortalKnowledgePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const role = await getCachedUserRole(user.id);
  if (role === 'client') redirect('/dashboard');

  // Try DB first, fall back to hardcoded guide bundle
  let allGuides: Guide[];
  try {
    allGuides = await getKnowledgeGuides();
  } catch {
    allGuides = (await import('@/lib/guides-data')).guides;
  }

  return <QualiaKnowledgeView guides={allGuides} />;
}
