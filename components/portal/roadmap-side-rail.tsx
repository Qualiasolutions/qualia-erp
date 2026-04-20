'use client';

import { User, Building2, Users } from 'lucide-react';
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
    <div className="shrink-0 space-y-3 border-b border-border p-4">
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
  const { data: assignments, isLoading } = useProjectAssignments(projectId);

  const activeAssignments = Array.isArray(assignments)
    ? assignments.filter((a: { removed_at?: string | null }) => !a.removed_at)
    : [];

  return (
    <div className="shrink-0 space-y-3 border-b border-border p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-purple-500/10">
          <Users className="h-3.5 w-3.5 text-purple-400" />
        </div>
        <SectionLabel>Assigned Team</SectionLabel>
      </div>

      {isLoading && (
        <div className="space-y-2.5">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {!isLoading && activeAssignments.length === 0 && (
        <p className="text-xs text-muted-foreground">No employees assigned yet.</p>
      )}

      {!isLoading && activeAssignments.length > 0 && (
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
    <aside className={cn('flex flex-col overflow-y-auto border-l border-border bg-card/30')}>
      {/* Lead + Client */}
      <PersonnelSection lead={lead} client={client} />

      {/* Assigned Team — hidden from clients */}
      {!isClient && <TeamSection projectId={projectId} />}

      {/* Resources */}
      <div className="min-h-0 flex-1 border-b border-border">
        <ProjectResources
          projectId={projectId}
          initialResources={[]}
          className="h-full rounded-none border-0"
        />
      </div>

      {/* Files */}
      <div className="min-h-0 flex-1 border-b border-border">
        <ProjectFilesPanel
          projectId={projectId}
          isClient={isClient}
          className="h-full rounded-none border-0"
        />
      </div>

      {/* Notes — hidden from clients */}
      {!isClient && (
        <div className="min-h-0 flex-1">
          <ProjectNotes
            projectId={projectId}
            workspaceId={workspaceId}
            className="h-full rounded-none border-0"
          />
        </div>
      )}
    </aside>
  );
}
