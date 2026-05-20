import Link from 'next/link';
import type { ComponentType } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ArrowLeft, CalendarClock, FolderKanban, Mail, MessageSquareText } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, getInitials } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Portal Client | Admin',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

type ProjectRow = {
  id: string;
  name: string;
  status: string | null;
  progress: number | null;
  logo_url: string | null;
};

type RequestRow = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  project: ProjectRow | null;
};

export default async function AdminPortalClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  await connection();
  const supabase = await createClient();

  const [{ data: profile }, { data: links }, { data: requestsRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, company, created_at, updated_at')
      .eq('id', id)
      .eq('role', 'client')
      .maybeSingle(),
    supabase
      .from('client_projects')
      .select(
        'project:projects!client_projects_project_id_fkey(id, name, status, progress, logo_url)'
      )
      .eq('client_id', id),
    supabase
      .from('client_feature_requests')
      .select(
        'id, title, description, priority, status, created_at, project:projects(id, name, status, progress, logo_url)'
      )
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!profile) notFound();

  const projects: ProjectRow[] = (links ?? [])
    .map((link) => normalizeOne(link.project))
    .filter((project): project is ProjectRow => project != null);

  const requests: RequestRow[] = (requestsRaw ?? []).map((request) => ({
    ...request,
    project: normalizeOne(request.project),
  }));

  const openRequests = requests.filter(
    (request) => request.status !== 'completed' && request.status !== 'declined'
  );
  const completedRequests = requests.filter((request) => request.status === 'completed');
  const clientName = profile.full_name || profile.company || profile.email || 'Unnamed client';

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 gap-2">
            <Link href="/admin/clients">
              <ArrowLeft className="size-4" />
              Portal clients
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-2xl">
              {profile.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />
              )}
              <AvatarFallback className="rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                {getInitials(clientName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="inline-block h-px w-5 bg-primary/60" aria-hidden />
                <span>Portal account</span>
              </div>
              <h1 className="mt-1 truncate text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] font-semibold tracking-tight">
                {clientName}
              </h1>
              {profile.email && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="size-3.5" />
                  {profile.email}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
          <SummaryTile label="Projects" value={projects.length} icon={FolderKanban} />
          <SummaryTile
            label="Open requests"
            value={openRequests.length}
            icon={MessageSquareText}
            tone="warn"
          />
          <SummaryTile
            label="Completed"
            value={completedRequests.length}
            icon={CalendarClock}
            tone="primary"
          />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Project status</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Projects this portal account can currently access.
            </p>
          </div>
          {projects.length === 0 ? (
            <EmptyBlock label="No linked projects" />
          ) : (
            <div className="divide-y divide-border">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <Avatar className="size-10 rounded-xl">
                    {project.logo_url && (
                      <AvatarImage src={project.logo_url} alt="" className="object-cover" />
                    )}
                    <AvatarFallback className="rounded-xl text-xs">
                      {getInitials(project.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {project.name}
                      </p>
                      <StatusBadge status={project.status || 'Unknown'} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/35">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(project.progress ?? 0, 100))}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {project.progress ?? 0}%
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Requests from this client
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Clear attribution, linked project, priority, and current status.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/requests">Open board</Link>
            </Button>
          </div>
          {requests.length === 0 ? (
            <EmptyBlock label="No requests submitted" />
          ) : (
            <div className="divide-y divide-border">
              {requests.map((request) => (
                <article key={request.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                        {request.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.project?.name || 'No linked project'} ·{' '}
                        {new Date(request.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PriorityBadge priority={request.priority} />
                    {request.project?.status && (
                      <Badge variant="outline" className="rounded-full px-2 text-[10px]">
                        Project {request.project.status}
                      </Badge>
                    )}
                  </div>
                  {request.description && (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {request.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function normalizeOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'primary' | 'warn';
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon
          className={cn(
            'size-3.5',
            tone === 'primary'
              ? 'text-primary'
              : tone === 'warn'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
          )}
        />
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === 'completed' || normalized === 'active'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : normalized === 'in_progress' || normalized === 'planned'
        ? 'border-primary/20 bg-primary/10 text-primary'
        : normalized === 'delayed' || normalized === 'urgent'
          ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
          : 'border-border bg-muted text-muted-foreground';
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 rounded-full px-2 text-[10px] capitalize', tone)}
    >
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === 'urgent'
      ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
      : priority === 'high'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'border-border bg-muted text-muted-foreground';
  return (
    <Badge variant="outline" className={cn('rounded-full px-2 text-[10px] capitalize', tone)}>
      {priority}
    </Badge>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center px-5 py-10 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
