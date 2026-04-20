'use client';

import { User, Building2, Users, AlertCircle } from 'lucide-react';
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
    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
  return (
    <div
      className="shrink-0 space-y-3 border-b border-border p-4"
      aria-label="Project lead and client"
      role="group"
    >
      <SectionLabel>Lead</SectionLabel>
      <div className="flex items-center gap-3">
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
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Lead</p>
        </div>
      </div>
      {client && (
        <>
          <SectionLabel>Client</SectionLabel>
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-blue-500/10">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{client.name}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Client</p>
            </div>
          </div>
        </>
      )}
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
      className="shrink-0 space-y-3 border-b border-border p-4"
      aria-label="Assigned team"
      role="group"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-purple-500/10">
          <Users className="h-3.5 w-3.5 text-purple-400" />
        </div>
        <SectionLabel>Assigned Team</SectionLabel>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2.5">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {/* Error state — DESIGN.md inline error pattern */}
      {!isLoading && error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-500/10">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive/70" />
          <p className="text-xs text-destructive/70">Failed to load team</p>
        </div>
      )}

      {/* Empty state — DESIGN.md empty state pattern */}
      {!isLoading && !error && activeAssignments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4">
          <Users className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs text-muted-foreground">No team assigned</p>
        </div>
      )}

      {/* Team list */}
      {!isLoading && !error && activeAssignments.length > 0 && (
        <div className="space-y-2">
          {activeAssignments.map(
            (assignment: {
              id: string;
              employee?: {
                id?: string;
                full_name?: string | null;
                email?: string | null;
                avatar_url?: string | null;
              } | null;
            }) => (
              <div key={assignment.id} className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={assignment.employee?.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {assignment.employee?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {assignment.employee?.full_name || assignment.employee?.email || 'Unknown'}
                  </p>
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
      <section aria-label="Project resources" className="min-h-0 flex-1 border-b border-border">
        <ProjectResources
          projectId={projectId}
          initialResources={[]}
          className="h-full rounded-none border-0"
        />
      </section>

      {/* Files */}
      <section aria-label="Project files" className="min-h-0 flex-1 border-b border-border">
        <ProjectFilesPanel
          projectId={projectId}
          isClient={isClient}
          className="h-full rounded-none border-0"
        />
      </section>

      {/* Notes — hidden from clients */}
      {!isClient && (
        <section aria-label="Project notes" className="min-h-0 flex-1">
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
