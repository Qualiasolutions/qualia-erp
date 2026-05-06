import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';

import { getProjectById } from '@/app/actions/projects';
import { getProjectPhases } from '@/app/actions/phases';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { createClient } from '@/lib/supabase/server';
import { QualiaRoadmap } from '@/components/portal/qualia-roadmap';

interface PageProps {
  params: Promise<{ id: string }>;
}

function RoadmapSkeleton() {
  return (
    <div className="flex h-full flex-col gap-6 p-6 lg:p-8">
      <div className="h-3 w-44 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-9 w-72 animate-pulse rounded bg-muted" />
        <div className="h-3 w-96 animate-pulse rounded bg-muted" />
        <div className="h-1 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

async function RoadmapLoader({ id }: { id: string }) {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');

  const profile = await getPortalProfile(user.id);
  const role = profile?.role ?? 'client';

  const [project, phases] = await Promise.all([getProjectById(id), getProjectPhases(id)]);

  if (!project) notFound();

  if (role === 'client') {
    const supabase = await createClient();
    const { data: link } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', user.id)
      .eq('project_id', id)
      .maybeSingle();
    if (!link) notFound();
  } else if (role !== 'admin') {
    const supabase = await createClient();
    const { data: assignment } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('project_id', id)
      .eq('employee_id', user.id)
      .is('removed_at', null)
      .maybeSingle();
    if (!assignment) notFound();
  }

  return (
    <QualiaRoadmap
      project={{
        id: project.id,
        name: project.name,
        status: project.status,
        start_date: project.start_date,
        target_date: project.target_date,
        project_type: project.project_type,
        client: project.client ? { id: project.client.id, name: project.client.name } : null,
        issue_stats: project.issue_stats,
      }}
      phases={phases.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        start_date: p.start_date,
        target_date: p.target_date,
        completed_at: p.completed_at,
        description: p.description,
        sort_order: p.sort_order,
        plan_count: p.plan_count,
        plans_completed: p.plans_completed,
      }))}
      lead={
        project.lead
          ? {
              id: project.lead.id,
              full_name: project.lead.full_name,
              avatar_url: project.lead.avatar_url,
            }
          : null
      }
      client={project.client ? { id: project.client.id, name: project.client.name } : null}
      workspaceId={project.workspace_id}
      userRole={role as 'admin' | 'employee' | 'client'}
    />
  );
}

export default async function RoadmapPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<RoadmapSkeleton />}>
      <RoadmapLoader id={id} />
    </Suspense>
  );
}
