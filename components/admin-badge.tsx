'use client';

import { Shield, ShieldCheck } from 'lucide-react';
import { useAdminContext } from './admin-provider';
import { cn } from '@/lib/utils';

export function AdminBadge() {
  const { isAdmin, isSuperAdmin, loading } = useAdminContext();

  if (loading || (!isAdmin && !isSuperAdmin)) {
    return null;
  }

  return (
    <div
      className={cn(
        'admin-badge flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-300',
        isSuperAdmin ? 'border-qualia-500/30 text-qualia-400' : 'border-amber-500/30 text-amber-400'
      )}
    >
      {isSuperAdmin ? (
        <>
          <ShieldCheck className="h-3 w-3" />
          <span>Super Admin</span>
        </>
      ) : (
        <>
          <Shield className="h-3 w-3" />
          <span>Admin</span>
        </>
      )}
    </div>
  );
}
