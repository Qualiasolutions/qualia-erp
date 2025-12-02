'use client';

import { useEffect } from 'react';

/**
 * Global error boundary for root layout errors
 * This handles errors in the root layout itself
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '1.5rem',
            padding: '1rem',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#141414',
            color: '#fff',
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Application Error
            </h1>
            <p style={{ color: '#999', maxWidth: '400px' }}>
              A critical error occurred. Please try refreshing the page.
            </p>
            {error.digest && (
              <p
                style={{
                  marginTop: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  opacity: 0.5,
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #333',
                backgroundColor: 'transparent',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: '#00A4AC',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
