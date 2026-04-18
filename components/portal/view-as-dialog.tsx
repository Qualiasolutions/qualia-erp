'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, Users, UserCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getViewableUsers, setViewAsUser } from '@/app/actions/view-as';
import type { ViewAsUser } from '@/app/actions/view-as';

interface GroupedUsers {
  clients: ViewAsUser[];
  employees: ViewAsUser[];
}

interface ViewAsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_CONFIG = {
  employees: {
    label: 'Employees',
    icon: UserCircle,
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  clients: {
    label: 'Clients',
    icon: Users,
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  },
} as const;

export function ViewAsDialog({ open, onOpenChange }: ViewAsDialogProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [grouped, setGrouped] = useState<GroupedUsers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // Fetch users when dialog opens
  useEffect(() => {
    if (!open) {
      setSearch('');
      setError(null);
      setSelectingId(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getViewableUsers().then((result) => {
      if (cancelled) return;
      setLoading(false);

      if (result.success && result.data) {
        setGrouped(result.data as GroupedUsers);
      } else {
        setError(result.error || 'Failed to load users');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Filter users by search query
  const filtered = useMemo(() => {
    if (!grouped) return null;
    const q = search.toLowerCase().trim();
    if (!q) return grouped;

    const filterGroup = (users: ViewAsUser[]) =>
      users.filter(
        (u) =>
          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      );

    return {
      clients: filterGroup(grouped.clients),
      employees: filterGroup(grouped.employees),
    };
  }, [grouped, search]);

  const handleSelect = (userId: string) => {
    setSelectingId(userId);
    startTransition(async () => {
      const result = await setViewAsUser(userId);
      if (result.success) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to switch view');
        setSelectingId(null);
      }
    });
  };

  const totalResults = filtered ? filtered.clients.length + filtered.employees.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            View as another user
          </DialogTitle>
          <DialogDescription>
            See the portal exactly as this user would. Select a user to switch perspective.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search users"
            autoFocus
          />
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && filtered && totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">No users found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search ? 'Try a different search term' : 'No other users exist'}
              </p>
            </div>
          )}

          {!loading && !error && filtered && totalResults > 0 && (
            <div className="space-y-4">
              {(Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>).map((roleKey) => {
                const users = filtered[roleKey];
                if (users.length === 0) return null;
                const config = ROLE_CONFIG[roleKey];
                const Icon = config.icon;

                return (
                  <section key={roleKey}>
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {config.label}
                      </h3>
                      <span className="text-[10px] tabular-nums text-muted-foreground/40">
                        {users.length}
                      </span>
                    </div>
                    <ul className="space-y-0.5" role="listbox" aria-label={`${config.label} users`}>
                      {users.map((u) => {
                        const isSelecting = selectingId === u.id && isPending;
                        return (
                          <li key={u.id} role="option" aria-selected={false}>
                            <button
                              onClick={() => handleSelect(u.id)}
                              disabled={isPending}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`View as ${u.full_name || u.email}`}
                            >
                              {/* Avatar initial */}
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
                                {isSelecting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  (u.full_name || u.email || '?').charAt(0).toUpperCase()
                                )}
                              </div>

                              {/* Name and email */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {u.full_name || 'Unnamed'}
                                </p>
                                <p className="truncate text-xs text-muted-foreground/60">
                                  {u.email || 'No email'}
                                </p>
                              </div>

                              {/* Role badge */}
                              <Badge
                                variant="outline"
                                className={`shrink-0 text-[10px] ${config.badgeClass}`}
                              >
                                {u.role}
                              </Badge>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
