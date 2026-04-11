'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Eye, X, Loader2 } from 'lucide-react';
import { clearViewAs } from '@/app/actions/view-as';

interface ViewAsBannerProps {
  viewAsName: string;
  viewAsRole: string;
}

export function ViewAsBanner({ viewAsName, viewAsRole }: ViewAsBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStop = () => {
    startTransition(async () => {
      const result = await clearViewAs();
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-toast flex items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-500/20 dark:bg-amber-500/10"
    >
      <Eye className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <span className="text-amber-800 dark:text-amber-300">
        Viewing as <span className="font-semibold">{viewAsName}</span>
        <span className="ml-1 text-amber-600 dark:text-amber-400">({viewAsRole})</span>
      </span>
      <button
        onClick={handleStop}
        disabled={isPending}
        className="ml-2 inline-flex min-h-[32px] min-w-[32px] items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 transition-colors duration-150 hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
        aria-label="Stop viewing as another user"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        Stop
      </button>
    </div>
  );
}
