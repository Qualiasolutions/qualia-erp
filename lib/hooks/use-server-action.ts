'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/app/actions/shared';

interface UseServerActionOptions<T> {
  onSuccess?: (data?: T) => void;
  onError?: (error: string) => void;
  onOptimisticUpdate?: () => void;
  resetOnSuccess?: boolean;
}

export function useServerAction<T = unknown, TArgs extends unknown[] = unknown[]>(
  action: (...args: TArgs) => Promise<ActionResult>,
  options: UseServerActionOptions<T> = {}
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const execute = async (...args: TArgs) => {
    setError(null);
    setIsSuccess(false);

    // Optimistic update before action
    if (options.onOptimisticUpdate) {
      options.onOptimisticUpdate();
    }

    startTransition(async () => {
      const result = await action(...args);

      if (result.success) {
        setIsSuccess(true);
        if (options.onSuccess) {
          options.onSuccess(result.data as T);
        }
        if (options.resetOnSuccess) {
          setTimeout(() => setIsSuccess(false), 2000);
        }
      } else {
        const errorMsg = result.error || 'An error occurred';
        setError(errorMsg);
        if (options.onError) {
          options.onError(errorMsg);
        }
      }
    });
  };

  const reset = () => {
    setError(null);
    setIsSuccess(false);
  };

  return {
    execute,
    isPending,
    error,
    isSuccess,
    reset,
  };
}
