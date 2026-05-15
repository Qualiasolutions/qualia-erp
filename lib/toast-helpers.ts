import { toast } from 'sonner';

export interface ToastErrorOptions {
  /** What the user was trying to do (verb phrase). Example: "save the comment" */
  action: string;
  /** Underlying error -- message extracted automatically */
  error?: string | Error | { message?: string } | null;
  /** If provided, toast shows a Retry button that calls this */
  onRetry?: () => void;
  /** Override duration (ms). Default 6000. */
  duration?: number;
}

function extractMessage(error: ToastErrorOptions['error']): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
}

/**
 * Standardized error toast with descriptive action, error detail, and optional retry.
 * Use this instead of toast.error("Failed to X") across the codebase.
 */
export function toastError({ action, error, onRetry, duration = 6000 }: ToastErrorOptions): void {
  const detail = extractMessage(error);
  toast.error(`Couldn't ${action}`, {
    description: detail,
    duration,
    action: onRetry ? { label: 'Retry', onClick: onRetry } : undefined,
  });
}

/**
 * Companion success toast for consistent voice. Optional.
 */
export function toastSuccess(message: string, opts?: { duration?: number }): void {
  toast.success(message, { duration: opts?.duration ?? 3000 });
}
