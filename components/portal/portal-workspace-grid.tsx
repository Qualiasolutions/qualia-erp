'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronRight, Building2, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';

/* ------------------------------------------------------------------ */
/* Avatar color palette                                                */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  'bg-primary/15 text-primary',
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ------------------------------------------------------------------ */
/* Status badge colors                                                 */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Launched: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Demos: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Delayed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  Done: 'bg-primary/10 text-primary border-primary/20',
};

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface PortalWorkspaceGridProps {
  workspaces: ClientWorkspace[];
}

/* ------------------------------------------------------------------ */
/* WorkspaceCard                                                       */
/* ------------------------------------------------------------------ */

function WorkspaceCard({
  workspace,
  onClick,
  index,
}: {
  workspace: ClientWorkspace;
  onClick: () => void;
  index: number;
}) {
  const initial = workspace.name.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(workspace.name);
  const maxPills = 3;
  const visibleProjects = workspace.projects.slice(0, maxPills);
  const remainingCount = workspace.projects.length - maxPills;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col rounded-xl border border-border bg-card p-6 text-left',
        'transition-all duration-200 ease-out',
        'hover:border-primary/20 hover:shadow-md',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
        'cursor-pointer'
      )}
      style={{
        animationDelay: `${index * 30}ms`,
        animationFillMode: 'both',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + Info */}
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
              avatarColor
            )}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
              {workspace.name}
            </h3>
            {workspace.email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{workspace.email}</p>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/30 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary/60"
          aria-hidden="true"
        />
      </div>

      {/* Project count + portal status */}
      <div className="mt-4 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
          {workspace.projectCount} project{workspace.projectCount !== 1 ? 's' : ''}
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              workspace.portalUserId ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            )}
            aria-hidden="true"
          />
          {workspace.portalUserId ? 'Portal active' : 'No portal'}
        </span>
      </div>

      {/* Project pills */}
      {visibleProjects.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {visibleProjects.map((project) => (
            <Badge
              key={project.id}
              variant="secondary"
              className={cn(
                'max-w-[180px] truncate border px-2 py-0.5 text-[11px] font-normal',
                STATUS_COLORS[project.status ?? ''] ??
                  'border-border/50 bg-muted/50 text-muted-foreground'
              )}
            >
              {project.name}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge
              variant="secondary"
              className="border-border/50 bg-muted/50 px-2 py-0.5 text-[11px] font-normal text-muted-foreground"
            >
              +{remainingCount} more
            </Badge>
          )}
        </div>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
        <p className="mt-3 text-base font-medium text-foreground">
          {hasSearch ? 'No matching clients' : 'No clients with projects yet'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasSearch
            ? 'Try a different search term'
            : 'Once you link clients to projects in the CRM, they will appear here'}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PortalWorkspaceGrid (exported)                                      */
/* ------------------------------------------------------------------ */

export function PortalWorkspaceGrid({ workspaces }: PortalWorkspaceGridProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return workspaces;
    const q = search.toLowerCase();
    return workspaces.filter(
      (ws) =>
        ws.name.toLowerCase().includes(q) ||
        ws.email?.toLowerCase().includes(q) ||
        ws.projects.some((p) => p.name.toLowerCase().includes(q))
    );
  }, [workspaces, search]);

  const handleSelect = (workspace: ClientWorkspace) => {
    const params = new URLSearchParams();
    params.set('workspace', workspace.id);
    params.set('wname', workspace.name);
    router.push(`/portal?${params.toString()}`);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Client Workspaces</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select a client to view their portal</p>
      </header>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search clients or projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search client workspaces"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={search.trim().length > 0} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((workspace, i) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={() => handleSelect(workspace)}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Count footer */}
      {workspaces.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {workspaces.length} client{workspaces.length !== 1 ? 's' : ''}
          {search.trim() ? ' matching' : ''}
        </p>
      )}
    </div>
  );
}
