import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/portal-utils';
import { KnowledgePageClient } from '@/app/knowledge/knowledge-page-client';
import { getKnowledgeGuides } from '@/app/actions/knowledge';
import { type Guide } from '@/lib/guides-data';

export const metadata = { title: 'Knowledge Base' };

export default async function PortalKnowledgePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const role = await getUserRole(user.id);
  // Only admin, manager, employee can access knowledge
  if (role === 'client') redirect('/portal');

  const isAdmin = role === 'admin';

  // Try DB first, fall back to hardcoded (matching app/knowledge/page.tsx logic)
  let allGuides: Guide[];
  try {
    allGuides = await getKnowledgeGuides();
  } catch {
    allGuides = (await import('@/lib/guides-data')).guides;
  }

  const byCategory = (cat: string) => allGuides.filter((g) => g.category === cat);

  return (
    <KnowledgePageClient
      initialData={{
        foundationsGuides: byCategory('foundations'),
        lifecycleGuides: byCategory('lifecycle'),
        operationsGuides: byCategory('operations'),
        referenceGuides: byCategory('reference'),
        checklistGuides: byCategory('checklist'),
        allGuides,
      }}
      isAdmin={isAdmin}
    />
  );
}
