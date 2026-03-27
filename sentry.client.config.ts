// This file configures the initialization of Sentry on the client (browser).
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring — 10% sample rate for low-volume internal app
    tracesSampleRate: 0.1,

    // Session Replay — only capture on errors (no passive recording)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [Sentry.replayIntegration()],
  });
}
