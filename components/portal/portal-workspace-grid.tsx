'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, ArrowRight, Building2, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  'bg-primary/10 text-primary',
  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ------------------------------------------------------------------ */
/* Workspace Card                                                      */
/* ------------------------------------------------------------------ */

function WorkspaceCard({
  workspace,
  onClick,
}: {
  workspace: ClientWorkspace;
  onClick: () => void;
}) {
  const initial = workspace.name.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(workspace.name);
  const activeCount = workspace.projects.filter((p) => p.status === 'Active').length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-4 rounded-xl border border-border/50 bg-card px-5 py-4',
        'text-left transition-all duration-200',
        'hover:border-primary/20 hover:bg-primary/[0.02]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        'cursor-pointer'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
          avatarColor
        )}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
          {workspace.name}
        </h3>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FolderKanban className="h-3 w-3" aria-hidden="true" />
            {workspace.projectCount}
          </span>
          {activeCount > 0 && (
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              {activeCount} active
            </span>
          )}
          {workspace.portalUserId && (
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
              Portal
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground/20 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary/50"
        aria-hidden="true"
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Empty State                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground/20" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-foreground">
          {hasSearch ? 'No matching clients' : 'No clients yet'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasSearch
            ? 'Try a different search'
            : 'Link clients to projects in the CRM to see them here'}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grid                                                                */
/* ------------------------------------------------------------------ */

export function PortalWorkspaceGrid({ workspaces }: { workspaces: ClientWorkspace[] }) {
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
    <div className="space-y-5">
      {/* Header + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Workspaces</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {workspaces.length} client{workspaces.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
            aria-label="Search workspaces"
          />
        </div>
      </div>

      {/* Grid — row-based for cleaner look, not card grid */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={search.trim().length > 0} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={() => handleSelect(workspace)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
