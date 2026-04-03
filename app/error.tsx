'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="rounded-full border border-red-500/20 bg-red-500/10 p-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="max-w-[500px] text-muted-foreground">
          An unexpected error occurred. Our team has been notified.
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
        <Button onClick={() => reset()} className="bg-primary hover:bg-primary/90">
          Try Again
        </Button>
      </div>
    </div>
  );
}
