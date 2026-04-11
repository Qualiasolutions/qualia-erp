'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PortalClient {
  id: string;
  full_name: string | null;
  email: string | null;
  projectCount: number;
  isActive: boolean;
}

interface ClientAccessProps {
  workspaceId: string;
}

export function ClientAccess({ workspaceId }: ClientAccessProps) {
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      if (!workspaceId) return;

      try {
        const supabase = createClient();

        // Get client_projects with associated profiles
        const { data: assignments, error: assignError } = await supabase
          .from('client_projects')
          .select('client_id, project_id');

        if (assignError) {
          throw assignError;
        }

        if (!assignments || assignments.length === 0) {
          setClients([]);
          setLoading(false);
          return;
        }

        // Count projects per client
        const projectCounts = new Map<string, number>();
        for (const a of assignments) {
          projectCounts.set(a.client_id, (projectCounts.get(a.client_id) ?? 0) + 1);
        }

        const uniqueClientIds = [...projectCounts.keys()];

        // Fetch profiles for these clients
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, updated_at')
          .in('id', uniqueClientIds)
          .eq('role', 'client');

        if (profileError) {
          throw profileError;
        }

        const portalClients: PortalClient[] = (profiles ?? []).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          projectCount: projectCounts.get(p.id) ?? 0,
          // Consider active if they have been updated (logged in) recently
          isActive: true,
        }));

        // Sort by name
        portalClients.sort((a, b) =>
          (a.full_name ?? a.email ?? '').localeCompare(b.full_name ?? b.email ?? '')
        );

        setClients(portalClients);
      } catch (error) {
        console.error('Failed to fetch portal clients:', error);
        toast.error('Failed to load client data');
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Users className="h-6 w-6 text-muted-foreground/30" />
        </div>
        <p className="mt-3 text-base font-medium text-foreground">No portal clients</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No clients currently have portal access.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Projects
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client, index) => (
              <tr
                key={client.id}
                className={
                  index < clients.length - 1
                    ? 'border-b border-border/40 transition-colors duration-150 hover:bg-muted/20'
                    : 'transition-colors duration-150 hover:bg-muted/20'
                }
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {(client.full_name ?? client.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">
                      {client.full_name ?? 'Unnamed Client'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{client.email ?? '-'}</td>
                <td className="px-4 py-3 text-center tabular-nums text-foreground">
                  {client.projectCount}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      client.isActive
                        ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'
                    }
                  >
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
