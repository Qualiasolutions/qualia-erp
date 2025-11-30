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
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4 text-center">
      <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="text-muted-foreground max-w-[500px]">
          An unexpected error occurred. Our team has been notified.
          {error.digest && <span className="block mt-2 font-mono text-xs opacity-50">Error ID: {error.digest}</span>}
        </p>
      </div>
      <div className="flex gap-4">
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Reload Page
        </Button>
        <Button
          onClick={() => reset()}
          className="bg-qualia-600 hover:bg-qualia-500"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
