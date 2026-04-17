'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

interface PortalClient {
  id: string;
  full_name: string | null;
  email: string | null;
  lastSignIn: string | null;
  isActive: boolean;
  projects: Array<{ id: string; name: string }>;
}

interface ClientAccessProps {
  workspaceId: string;
}

export function ClientAccess({ workspaceId }: ClientAccessProps) {
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [totalActive, setTotalActive] = useState(0);
  const [totalInactive, setTotalInactive] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { getPortalClientManagement } = await import('@/app/actions/client-portal');
      const result = await getPortalClientManagement();
      if (!result.success) {
        toast.error(result.error || 'Failed to load client data');
        setLoading(false);
        return;
      }
      const payload = result.data as {
        clients: Array<{
          id: string;
          full_name: string | null;
          email: string | null;
          lastSignIn: string | null;
          isActive: boolean;
          projects: Array<{ id: string; name: string }>;
        }>;
        totalActive: number;
        totalInactive: number;
      };
      setClients(payload.clients);
      setTotalActive(payload.totalActive);
      setTotalInactive(payload.totalInactive);
      setLoading(false);
    }
    load();
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
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {totalActive} active · {totalInactive} inactive
      </p>
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
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                  Last Login
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
                    {client.projects.length}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {client.lastSignIn
                      ? new Date(client.lastSignIn).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
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
    </div>
  );
}
