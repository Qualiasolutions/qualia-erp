'use client';

import { User, Users, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EntityAvatar } from '@/components/entity-avatar';
import { ProjectResources } from '@/components/project-resources';
import { ProjectFilesPanel } from '@/components/project-files-panel';
import { ProjectNotes } from '@/components/project-notes';
import { useProjectAssignments } from '@/lib/swr';
import { cn } from '@/lib/utils';

/* ======================================================================
   Types
   ====================================================================== */

interface LeadInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ClientInfo {
  id: string;
  name: string;
}

export interface RoadmapSideRailProps {
  projectId: string;
  workspaceId: string;
  lead: LeadInfo | null;
  client: ClientInfo | null;
  userRole: 'admin' | 'employee' | 'client';
}

/* ======================================================================
   Section header
   ====================================================================== */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

/* ======================================================================
   Skeleton placeholder
   ====================================================================== */

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3">
      <div className="h-6 w-6 rounded-lg bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-2.5 w-14 rounded bg-muted" />
      </div>
    </div>
  );
}

/* ======================================================================
   Lead + Client section
   ====================================================================== */

function PersonnelSection({ lead, client }: { lead: LeadInfo | null; client: ClientInfo | null }) {
  // Build initials for the client avatar tile
  const clientInitials = client
    ? client.name
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '';

  return (
    <div
      className="shrink-0 space-y-4 border-b border-border p-5"
      aria-label="Project lead and client"
      role="group"
    >
      {/* Client tile — v0 style: rounded-xl avatar + name + role */}
      {client && (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
            {clientInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{client.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Client</p>
          </div>
        </div>
      )}

      {/* Lead */}
      <div>
        <SectionLabel>Lead</SectionLabel>
        <div className="mt-2 flex items-center gap-3">
          <EntityAvatar
            src={lead?.avatar_url}
            fallbackIcon={<User className="h-3.5 w-3.5" />}
            size="sm"
            className="rounded-lg border border-border"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {lead?.full_name || 'Unassigned'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   Team section (read-only assigned employees)
   ====================================================================== */

function TeamSection({ projectId }: { projectId: string }) {
  const { data: assignments, isLoading, error } = useProjectAssignments(projectId);

  const activeAssignments = Array.isArray(assignments)
    ? assignments.filter((a: { removed_at?: string | null }) => !a.removed_at)
    : [];

  return (
    <div
      className="shrink-0 space-y-3 border-b border-border p-5"
      aria-label="Assigned team"
      role="group"
    >
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <SectionLabel>Assigned Team</SectionLabel>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2.5">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-500/10">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive/70" />
          <p className="text-xs text-destructive/70">Failed to load team</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && activeAssignments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4">
          <Users className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs text-muted-foreground">No team assigned</p>
        </div>
      )}

      {/* Team list — v0 style: avatar + name + "Since {date}" */}
      {!isLoading && !error && activeAssignments.length > 0 && (
        <div className="space-y-3">
          {activeAssignments.map(
            (assignment: {
              id: string;
              assigned_at?: string | null;
              employee?: {
                id?: string;
                full_name?: string | null;
                email?: string | null;
                avatar_url?: string | null;
              } | null;
            }) => (
              <div key={assignment.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={assignment.employee?.avatar_url || ''} />
                  <AvatarFallback className="text-xs font-semibold">
                    {assignment.employee?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {assignment.employee?.full_name || assignment.employee?.email || 'Unknown'}
                  </p>
                  {assignment.assigned_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Since{' '}
                      {new Date(assignment.assigned_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   Main export
   ====================================================================== */

export function RoadmapSideRail({
  projectId,
  workspaceId,
  lead,
  client,
  userRole,
}: RoadmapSideRailProps) {
  const isClient = userRole === 'client';

  return (
    <aside
      aria-label="Project details"
      className={cn(
        'flex flex-col border-l border-border bg-card/30',
        'lg:h-full lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto'
      )}
    >
      {/* Lead + Client */}
      <PersonnelSection lead={lead} client={client} />

      {/* Assigned Team — hidden from clients */}
      {!isClient && <TeamSection projectId={projectId} />}

      {/* Resources */}
      <section aria-label="Project resources" className="min-h-0 flex-1 border-b border-border p-1">
        <ProjectResources
          projectId={projectId}
          initialResources={[]}
          className="h-full rounded-none border-0"
        />
      </section>

      {/* Files */}
      <section aria-label="Project files" className="min-h-0 flex-1 border-b border-border p-1">
        <ProjectFilesPanel
          projectId={projectId}
          isClient={isClient}
          className="h-full rounded-none border-0"
        />
      </section>

      {/* Notes — hidden from clients */}
      {!isClient && (
        <section aria-label="Project notes" className="min-h-0 flex-1 p-1">
          <ProjectNotes
            projectId={projectId}
            workspaceId={workspaceId}
            className="h-full rounded-none border-0"
          />
        </section>
      )}
    </aside>
  );
}
