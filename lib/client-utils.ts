import type { LeadStatus } from '@/app/actions';
import { ToggleLeft, ToggleRight, Skull } from 'lucide-react';

export type ClientStatus = 'active_client' | 'inactive_client' | 'dead_lead';

export type Client = {
  id: string;
  display_name: string | null;
  phone: string | null;
  website: string | null;
  billing_address: string | null;
  lead_status: LeadStatus;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  logo_url: string | null;
  creator: { id: string; full_name: string | null; email: string | null } | null;
  assigned: { id: string; full_name: string | null; email: string | null } | null;
  projects?: { id: string }[];
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusConfig(status: LeadStatus) {
  switch (status) {
    case 'active_client':
      return {
        label: 'Active',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        hoverBg: 'hover:bg-emerald-500/20',
        icon: ToggleRight,
        iconBg: 'from-emerald-500/20 to-emerald-500/5',
      };
    case 'inactive_client':
      return {
        label: 'Inactive',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        hoverBg: 'hover:bg-amber-500/20',
        icon: ToggleLeft,
        iconBg: 'from-amber-500/20 to-amber-500/5',
      };
    case 'dead_lead':
      return {
        label: 'Dead Lead',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/10',
        hoverBg: 'hover:bg-red-500/20',
        icon: Skull,
        iconBg: 'from-red-500/20 to-red-500/5',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-muted-foreground',
        bg: 'bg-muted',
        hoverBg: 'hover:bg-muted/80',
        icon: ToggleLeft,
        iconBg: 'from-muted to-muted/50',
      };
  }
}

// Status priority for sorting (active first, then inactive, then dead)
export const statusPriority: Record<LeadStatus, number> = {
  active_client: 0,
  inactive_client: 1,
  dead_lead: 2,
  // These are filtered out but needed for type safety
  dropped: 3,
  cold: 4,
  hot: 5,
};
