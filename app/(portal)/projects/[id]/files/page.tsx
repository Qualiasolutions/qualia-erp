import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getProjectFiles } from '@/app/actions/project-files';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { FileUploadForm } from '@/components/project-files/file-upload-form';
import { FileList } from '@/components/project-files/file-list';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectFilesPageProps {
  params: Promise<{ id: string }>;
}

async function ProjectFilesContent({ projectId }: { projectId: string }) {
  // Auth + profile via request-scoped cache (shared with layout)
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await getPortalProfile(user.id);

  // Check user role - only admin/employee can access this page
  if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
    redirect(`/projects/${projectId}`);
  }

  // Supabase client for page-specific queries (assignments, project details, phases)
  const supabase = await createClient();

  // Employees can only access files for projects they're assigned to
  if (profile.role !== 'admin') {
    const { data: assignment } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('project_id', projectId)
      .eq('employee_id', user.id)
      .is('removed_at', null)
      .single();
    if (!assignment) {
      redirect('/projects');
    }
  }

  // All three queries depend only on projectId — fan out in parallel.
  const [{ data: project }, { data: phases }, files] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', projectId).single(),
    supabase
      .from('project_phases')
      .select('id, phase_name, status')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true }),
    getProjectFiles(projectId, false),
  ]);

  if (!project) {
    redirect('/projects');
  }

  // Split files into client uploads and internal files
  const clientFiles = files.filter((f) => f.is_client_upload === true);
  const internalFiles = files.filter((f) => !f.is_client_upload);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${projectId}`}
          aria-label={`Back to ${project.name}`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-semibold tracking-tight text-foreground">Project Files</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
        </div>
      </div>

      {/* Upload Form */}
      <FileUploadForm projectId={projectId} phases={phases || []} />

      {/* Client Uploads Section — shown only when client uploads exist */}
      {clientFiles.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-semibold tracking-tight text-foreground">Client Uploads</h2>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              {clientFiles.length}
            </span>
          </div>
          <FileList files={clientFiles} />
        </div>
      )}

      {/* Internal Files List */}
      <div>
        <h2 className="mb-4 font-semibold tracking-tight text-foreground">Internal Files</h2>
        <FileList files={internalFiles} />
      </div>
    </div>
  );
}

export default async function ProjectFilesPage({ params }: ProjectFilesPageProps) {
  const { id: projectId } = await params;

  return (
    <div className="px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <ProjectFilesContent projectId={projectId} />
      </Suspense>
    </div>
  );
}
