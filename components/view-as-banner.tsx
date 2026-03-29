'use client';

import { useAdminContext } from '@/components/admin-provider';
import { Eye, X } from 'lucide-react';

export function ViewAsBanner() {
  const { isViewingAs, userRole, stopViewAs } = useAdminContext();

  if (!isViewingAs) return null;

  return (
    <div className="sticky top-0 z-toast flex items-center justify-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 backdrop-blur-sm">
      <Eye className="size-3.5 text-amber-600 dark:text-amber-400" />
      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
        Viewing platform as <span className="font-bold capitalize">{userRole}</span>
      </span>
      <button
        type="button"
        onClick={stopViewAs}
        className="ml-1 flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-300"
      >
        <X className="size-3" />
        Exit
      </button>
    </div>
  );
}
