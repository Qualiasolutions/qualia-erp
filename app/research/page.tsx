import { getCurrentWorkspaceId } from '@/app/actions';
import { getResearchFindings, getResearchTasks } from '@/app/actions/research';
import { ResearchPageClient } from './research-page-client';

export default async function ResearchPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view research</p>
      </div>
    );
  }

  const [findings, tasks] = await Promise.all([
    getResearchFindings(workspaceId),
    getResearchTasks(workspaceId),
  ]);

  return <ResearchPageClient initialFindings={findings} initialTasks={tasks} />;
}
