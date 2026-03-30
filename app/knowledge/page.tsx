import { KnowledgePageClient } from './knowledge-page-client';
import { getKnowledgeGuides } from '@/app/actions/knowledge';
import { createClient } from '@/lib/supabase/server';
import { type Guide } from '@/lib/guides-data';

export default async function KnowledgePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  // Try DB first, fall back to hardcoded
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
