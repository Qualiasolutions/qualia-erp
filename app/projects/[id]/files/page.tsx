import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProjectFiles } from '@/app/actions/project-files';
import { FileUploadForm } from '@/components/project-files/file-upload-form';
import { FileList } from '@/components/project-files/file-list';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectFilesPageProps {
  params: Promise<{ id: string }>;
}

async function ProjectFilesContent({ projectId }: { projectId: string }) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check user role - only admin/employee can access this page
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
    redirect(`/projects/${projectId}`);
  }

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

  // Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single();

  if (!project) {
    redirect('/projects');
  }

  // Fetch project phases for upload form
  const { data: phases } = await supabase
    .from('project_phases')
    .select('id, phase_name, status')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  // Fetch all files for this project (admin sees all)
  const files = await getProjectFiles(projectId, false);

  // Split files into client uploads and internal files
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientFiles = files.filter((f) => (f as any).is_client_upload === true);
  const internalFiles = files.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (f) => !(f as any).is_client_upload
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <a
          href={`/projects/${projectId}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Project Files</h1>
          <p className="mt-1 text-sm text-neutral-600">{project.name}</p>
        </div>
      </div>

      {/* Upload Form */}
      <FileUploadForm
        projectId={projectId}
        phases={phases || []}
        onUploadComplete={() => {
          // Trigger revalidation by forcing a refresh
          window.location.reload();
        }}
      />

      {/* Client Uploads Section — shown only when client uploads exist */}
      {clientFiles.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-neutral-900">Client Uploads</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {clientFiles.length}
            </span>
          </div>
          <FileList
            files={clientFiles}
            onFileDeleted={() => {
              window.location.reload();
            }}
          />
        </div>
      )}

      {/* Internal Files List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Internal Files</h2>
        <FileList
          files={internalFiles}
          onFileDeleted={() => {
            // Trigger revalidation by forcing a refresh
            window.location.reload();
          }}
        />
      </div>
    </div>
  );
}

export default async function ProjectFilesPage({ params }: ProjectFilesPageProps) {
  const { id: projectId } = await params;

  return (
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
  );
}
