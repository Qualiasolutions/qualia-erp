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
import { MobileMenuButton } from '@/components/mobile-menu-button';

function ClientDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-sticky flex items-center gap-4 border-b border-border bg-card/80 px-6 py-3.5 backdrop-blur-xl sm:px-8">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </header>
      <div className="flex-1 p-6 lg:p-8">
        <div className="space-y-6">
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
  // NOTE: projects.status is the canonical column; the legacy `project_status`
  // column was renamed and only exists on the portal_project_mappings view.
  const { data: clientProjectsData } = await supabase
    .from('client_projects')
    .select(
      `
      id,
      project:projects (
        id,
        name,
        project_type,
        status
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
          status: string | null;
        } => p != null
      ) || [];

  // Fetch all active projects for dropdown (admin only)
  let allProjects: Array<{
    id: string;
    name: string;
    project_type?: string | null;
    status?: string | null;
  }> = [];

  if (isAdmin) {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, project_type, status')
      .in('status', ['Active', 'Demos', 'Delayed'])
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

  const linkedProjectMap = new Map<
    string,
    { id: string; name: string; project_type: string | null; status: string }
  >();
  for (const project of assignedProjects) {
    linkedProjectMap.set(project.id, {
      id: project.id,
      name: project.name,
      project_type: project.project_type ?? null,
      status: project.status ?? 'Active',
    });
  }
  for (const project of erpLinkedProjects) {
    linkedProjectMap.set(project.id, project);
  }
  const clientForView = {
    ...client,
    projects: Array.from(linkedProjectMap.values()),
  };

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

  // Fetch distinct employees assigned to any of this client's projects
  const erpProjectIds = erpLinkedProjects.map((p) => p.id);
  const assignedTeam: Array<{
    id: string;
    fullName: string | null;
    email: string | null;
    role: string | null;
    avatarUrl: string | null;
  }> = [];
  if (erpProjectIds.length > 0) {
    const { data: teamRows } = await supabase
      .from('project_assignments')
      .select(
        `employee:profiles!project_assignments_employee_id_fkey (id, full_name, email, role, avatar_url)`
      )
      .in('project_id', erpProjectIds)
      .is('removed_at', null);

    const seen = new Set<string>();
    for (const row of teamRows ?? []) {
      const emp = normalizeFKResponse(row.employee) as {
        id: string;
        full_name: string | null;
        email: string | null;
        role: string | null;
        avatar_url: string | null;
      } | null;
      if (emp && !seen.has(emp.id)) {
        seen.add(emp.id);
        assignedTeam.push({
          id: emp.id,
          fullName: emp.full_name,
          email: emp.email,
          role: emp.role,
          avatarUrl: emp.avatar_url,
        });
      }
    }
  }

  return (
    <ClientDetailView
      client={clientForView}
      assignedProjects={assignedProjects}
      availableProjects={allProjects}
      erpLinkedProjects={erpLinkedProjects}
      erpAvailableProjects={erpAvailableProjects}
      assignedTeam={assignedTeam}
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
      <header className="sticky top-0 z-sticky flex items-center gap-2 border-b border-border bg-card/80 px-6 py-3.5 backdrop-blur-xl sm:px-8">
        <MobileMenuButton />
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
