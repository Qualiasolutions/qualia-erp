import { Suspense } from 'react';
import { connection } from 'next/server';
import { getTasks } from '@/app/actions/inbox';
import { getCurrentWorkspaceId } from '@/app/actions';
import { InboxViewToggle } from '@/components/inbox-view-toggle';
import { InboxKanbanView } from '@/components/inbox-kanban-view';
import { InboxListView } from '@/components/inbox-list-view';
import { NewTaskModal } from '@/components/new-task-modal';
import { Inbox } from 'lucide-react';

async function InboxLoader({ view }: { view: string }) {
  await connection();
  const workspaceId = await getCurrentWorkspaceId();
  const tasks = await getTasks(workspaceId);

  if (view === 'list') {
    return <InboxListView tasks={tasks} />;
  }

  // Default to kanban view
  return <InboxKanbanView tasks={tasks} />;
}

function InboxSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="w-48 h-4 bg-muted rounded animate-pulse" />
              <div className="w-32 h-3 bg-muted rounded animate-pulse" />
              <div className="flex gap-4 pt-1">
                <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                <div className="w-16 h-3 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view || 'kanban';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Inbox className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Inbox</h1>
            <p className="text-xs text-muted-foreground">Manage your tasks and to-dos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InboxViewToggle currentView={view} />
          <NewTaskModal />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<InboxSkeleton />}>
          <InboxLoader view={view} />
        </Suspense>
      </div>
    </div>
  );
}
