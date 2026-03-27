// This file configures the initialization of Sentry for edge runtimes (middleware, edge API routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Performance monitoring — 10% sample rate
    tracesSampleRate: 0.1,
  });
}
