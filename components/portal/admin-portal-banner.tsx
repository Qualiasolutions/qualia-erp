'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewAsDialog } from './view-as-dialog';

interface AdminPortalBannerProps {
  userRole: string;
}

export function AdminPortalBanner({ userRole }: AdminPortalBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="shrink-0 border-b border-l-2 border-primary/[0.08] border-l-primary/30 bg-primary/[0.03] px-6 py-1.5 dark:border-primary/[0.12] dark:bg-primary/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-qualia-700 dark:text-primary">
              {userRole === 'admin' ? 'Admin' : 'Manager'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDialogOpen(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                'text-primary transition-colors duration-150',
                'hover:bg-primary/10',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                'cursor-pointer'
              )}
            >
              <Eye className="h-3 w-3" />
              View as
            </button>
            <button
              onClick={() => router.push('/')}
              className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Exit portal
            </button>
          </div>
        </div>
      </div>

      <ViewAsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
