import { getProjectsForPortalImport, type ProjectForImport } from '@/app/actions/portal-import';
import { ProjectImportList } from './project-import-list';

export default async function ProjectImportPage() {
  const result = await getProjectsForPortalImport();

  if (!result.success) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {result.error || 'Failed to load projects'}
        </div>
      </div>
    );
  }

  const projects = (result.data as ProjectForImport[]) || [];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <ProjectImportList projects={projects} />
    </div>
  );
}
