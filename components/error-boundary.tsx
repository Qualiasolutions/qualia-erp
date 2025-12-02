'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component to catch and display errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service in production
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="text-center">
            <h3 className="font-semibold text-destructive">Something went wrong</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline error display for non-critical errors
 */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Full page error display
 */
export function PageError({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-6">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive">{title}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh page
        </Button>
      </div>
    </div>
  );
}
