import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getClientById } from '@/app/actions';
import { ClientDetailView } from './client-detail-view';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { normalizeFKResponse } from '@/lib/server-utils';

function ClientDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border/40 bg-card/80 px-6 py-3.5 backdrop-blur-xl">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </header>
      <div className="flex-1 p-6">
        <div className="max-w-4xl space-y-6">
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

interface ClientLoaderProps {
  id: string;
}

async function ClientLoader({ id }: ClientLoaderProps) {
  const supabase = await createClient();

  // Fetch client data on the server
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  // Get current user and check if admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user ? await isUserAdmin(user.id) : false;

  // Fetch assigned projects via client_projects
  const { data: clientProjectsData } = await supabase
    .from('client_projects')
    .select(
      `
      id,
      project:projects (
        id,
        name,
        project_type,
        project_status
      )
    `
    )
    .eq('client_id', id);

  const assignedProjects =
    clientProjectsData
      ?.map((cp) => normalizeFKResponse(cp.project))
      .filter(
        (
          p
        ): p is {
          id: string;
          name: string;
          project_type: string | null;
          project_status: string | null;
        } => p != null
      ) || [];

  // Fetch all active projects for dropdown (admin only)
  let allProjects: Array<{
    id: string;
    name: string;
    project_type?: string | null;
    project_status?: string | null;
  }> = [];

  if (isAdmin) {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, project_type, project_status')
      .in('project_status', ['Active', 'Demos', 'Delayed'])
      .order('name');

    allProjects = projectsData || [];
  }

  // Fetch ERP-linked projects (projects.client_id = this client)
  const { data: erpLinkedRaw } = await supabase
    .from('projects')
    .select('id, name, project_type, status')
    .eq('client_id', id)
    .order('name');

  const erpLinkedProjects = (erpLinkedRaw || []).map((p) => ({
    id: p.id,
    name: p.name,
    project_type: p.project_type,
    status: p.status,
  }));

  // Fetch all projects without a client_id for the link dropdown (admin only)
  let erpAvailableProjects: Array<{ id: string; name: string; project_type: string | null }> = [];
  if (isAdmin) {
    const { data: unlinkedRaw } = await supabase
      .from('projects')
      .select('id, name, project_type')
      .is('client_id', null)
      .order('name');
    erpAvailableProjects = (unlinkedRaw || []).map((p) => ({
      id: p.id,
      name: p.name,
      project_type: p.project_type,
    }));
  }

  return (
    <ClientDetailView
      client={client}
      assignedProjects={assignedProjects}
      availableProjects={allProjects}
      erpLinkedProjects={erpLinkedProjects}
      erpAvailableProjects={erpAvailableProjects}
      isAdmin={isAdmin}
    />
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border/40 bg-card/80 px-6 py-3.5 backdrop-blur-xl">
        <Link href="/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </header>

      <div className="flex-1">
        <Suspense fallback={<ClientDetailSkeleton />}>
          <ClientLoader id={id} />
        </Suspense>
      </div>
    </div>
  );
}
