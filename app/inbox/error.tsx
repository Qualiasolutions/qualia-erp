'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Inbox } from 'lucide-react';

export default function InboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Inbox error:', error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="relative">
        <div className="rounded-full bg-red-500/10 p-4">
          <Inbox className="h-10 w-10 text-red-500" />
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-background bg-red-500 p-1">
          <AlertTriangle className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Failed to load inbox</h2>
        <p className="max-w-[400px] text-muted-foreground">
          We couldn&apos;t load your tasks. This might be a temporary issue.
          {error.digest && (
            <span className="mt-2 block font-mono text-xs opacity-50">
              Error ID: {error.digest}
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Page
        </Button>
        <Button onClick={() => reset()} className="bg-qualia-600 hover:bg-qualia-500">
          Try Again
        </Button>
      </div>
    </div>
  );
}
