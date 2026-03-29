import { KnowledgePageClient } from './knowledge-page-client';
import { guides, getGuidesByCategory } from '@/lib/guides-data';

export default async function KnowledgePage() {
  const foundationsGuides = getGuidesByCategory('foundations');
  const lifecycleGuides = getGuidesByCategory('lifecycle');
  const operationsGuides = getGuidesByCategory('operations');
  const referenceGuides = getGuidesByCategory('reference');
  const checklistGuides = getGuidesByCategory('checklist');

  return (
    <KnowledgePageClient
      initialData={{
        foundationsGuides,
        lifecycleGuides,
        operationsGuides,
        referenceGuides,
        checklistGuides,
        allGuides: guides,
      }}
    />
  );
}
