import { KnowledgePageClient } from './knowledge-page-client';
import { guides, getGuidesByCategory } from '@/lib/guides-data';

export default async function KnowledgePage() {
  const greenfieldGuides = getGuidesByCategory('greenfield');
  const brownfieldGuides = getGuidesByCategory('brownfield');
  const workflowGuides = getGuidesByCategory('workflow');

  return (
    <KnowledgePageClient
      initialData={{
        greenfieldGuides,
        brownfieldGuides,
        workflowGuides,
        allGuides: guides,
      }}
    />
  );
}
