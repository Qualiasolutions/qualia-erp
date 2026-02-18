import { getResearchEntries } from '@/app/actions/research';
import { ResearchPageClient } from './research-page-client';

export default async function ResearchPage() {
  const result = await getResearchEntries({ limit: 50 });
  const entries = result.success ? result.data || [] : [];

  return <ResearchPageClient initialEntries={entries} />;
}
