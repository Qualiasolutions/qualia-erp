import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isPortalAdminRole, assertAppEnabledForClient } from '@/lib/portal-utils';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { PortalFilesContent } from './files-content';
import { fadeInClasses } from '@/lib/transitions';

export interface PortalFileWithProject {
  id: string;
  project_id: string;
  name: string;
  original_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string | null;
  description: string | null;
  phase_name: string | null;
  is_client_visible: boolean | null;
  is_client_upload: boolean;
  uploaded_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  workspace_id: string | null;
  project_name: string;
  uploader_name: string | null;
}

export default async function PortalFilesPage() {
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile/role
  const profile = await getPortalProfile(user.id);

  const role = profile?.role || 'client';
  const isAdmin = isPortalAdminRole(role);

  // App Library guard: block clients if the "files" app is disabled
  if (role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'files', role);
    if (!allowed) redirect('/');
  }

  const supabase = await createClient();
  let projectIds: string[] = [];

  if (isAdmin) {
    // Admin/manager: get all projects
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id')
      .not('status', 'eq', 'Canceled');

    projectIds = (allProjects || []).map((p) => p.id);
  } else if (role === 'employee') {
    // Internal employees see files for every project in their workspace
    const workspaceId = await getCurrentWorkspaceId();
    if (workspaceId) {
      const { data: wsProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId);
      projectIds = (wsProjects ?? []).map((p) => p.id);
    }
  } else {
    // Client: get their project IDs from client_projects
    const { data: clientProjects } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', user.id);

    projectIds = (clientProjects || []).map((cp) => cp.project_id);
  }

  if (projectIds.length === 0) {
    return (
      <div className={`space-y-6 ${fadeInClasses}`}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Files</h1>
          <p className="mt-1 text-[13px] text-muted-foreground/70">
            All files across your projects
          </p>
        </div>
        <PortalFilesContent files={[]} />
      </div>
    );
  }

  // Fetch client-visible files across all projects with project names and uploader info
  const { data: files, error } = await supabase
    .from('project_files')
    .select(
      `
      id,
      project_id,
      name,
      original_name,
      storage_path,
      file_size,
      mime_type,
      description,
      phase_name,
      is_client_visible,
      is_client_upload,
      uploaded_by,
      created_at,
      updated_at,
      workspace_id,
      project:projects!project_files_project_id_fkey (
        name
      ),
      uploader:profiles!project_files_uploaded_by_fkey (
        full_name
      )
    `
    )
    .in('project_id', projectIds)
    .eq('is_client_visible', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PortalFilesPage] Error fetching files:', error);
  }

  // Normalize FK arrays and flatten project/uploader
  const normalizedFiles: PortalFileWithProject[] = (files || []).map((file) => {
    const project = Array.isArray(file.project) ? file.project[0] : file.project;
    const uploader = Array.isArray(file.uploader) ? file.uploader[0] : file.uploader;

    return {
      id: file.id,
      project_id: file.project_id,
      name: file.name,
      original_name: file.original_name,
      storage_path: file.storage_path,
      file_size: file.file_size,
      mime_type: file.mime_type,
      description: file.description,
      phase_name: file.phase_name,
      is_client_visible: file.is_client_visible,
      is_client_upload: file.is_client_upload,
      uploaded_by: file.uploaded_by,
      created_at: file.created_at,
      updated_at: file.updated_at,
      workspace_id: file.workspace_id,
      project_name: project?.name || 'Unknown Project',
      uploader_name: uploader?.full_name || null,
    };
  });

  return (
    <div
      className={`space-y-6 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)] ${fadeInClasses}`}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Files</h1>
        <p className="mt-1 text-[13px] text-muted-foreground/70">All files across your projects</p>
      </div>
      <PortalFilesContent files={normalizedFiles} />
    </div>
  );
}
