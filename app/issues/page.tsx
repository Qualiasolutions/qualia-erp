import { Suspense } from 'react';
import { connection } from 'next/server';
import { IssueList } from '@/components/issue-list';
import { createClient } from '@/lib/supabase/server';
import { NewIssueModal } from '@/components/new-issue-modal';
import { getCurrentWorkspaceId, getProjects } from '@/app/actions';
import { IssuesFilter } from '@/components/issues-filter';
import { ListPagination } from '@/components/list-pagination';
import { ListTodo } from 'lucide-react';

const PAGE_SIZE = 50;

interface FilterParams {
  status?: string;
  project?: string;
  page?: string;
}

async function IssueListLoader({ filters }: { filters: FilterParams }) {
  await connection();
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();
  const currentPage = Math.max(1, parseInt(filters.page || '1', 10));
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Build base query for counting
  let countQuery = supabase.from('issues').select('*', { count: 'exact', head: true });

  if (workspaceId) {
    countQuery = countQuery.eq('workspace_id', workspaceId);
  }

  if (filters.status) {
    const statuses = filters.status.split(',');
    countQuery = countQuery.in('status', statuses);
  }

  if (filters.project) {
    const projects = filters.project.split(',');
    countQuery = countQuery.in('project_id', projects);
  }

  // Build query for data
  let query = supabase
    .from('issues')
    .select(
      `
            id,
            title,
            status,
            priority,
            created_at
        `
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  if (filters.status) {
    const statuses = filters.status.split(',');
    query = query.in('status', statuses);
  }

  if (filters.project) {
    const projects = filters.project.split(',');
    query = query.in('project_id', projects);
  }

  const [{ data: issues, error }, { count }] = await Promise.all([query, countQuery]);

  if (error) {
    console.error('Error fetching issues:', error);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <IssueList issues={issues || []} />
      {totalPages > 1 && (
        <ListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          baseUrl="/issues"
          searchParams={filters as Record<string, string | undefined>}
        />
      )}
    </>
  );
}

async function FilterLoader() {
  await connection();
  const projects = await getProjects();

  return <IssuesFilter projects={projects} />;
}

function IssueListSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Stats skeleton */}
      <div className="flex items-center gap-6 border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-10 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="space-y-6 p-6">
        {[...Array(3)].map((_, groupIdx) => (
          <div key={groupIdx}>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-6 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="grid grid-cols-1 gap-3 pl-7 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="surface rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-4 w-4 animate-pulse rounded bg-muted" />
                    <div className="flex-1">
                      <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="flex gap-2">
                        <div className="h-5 w-14 animate-pulse rounded bg-muted" />
                        <div className="h-5 w-10 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  const filters = await searchParams;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ListTodo className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Issues</h1>
            <p className="text-xs text-muted-foreground">Track and manage your work</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={<div className="h-8 w-20" />}>
            <FilterLoader />
          </Suspense>
          <NewIssueModal />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-background">
        <Suspense fallback={<IssueListSkeleton />}>
          <IssueListLoader filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}
