// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://4588a086de602e16078448e3434efa71@o4510396654747648.ingest.de.sentry.io/4510397061791824",

  // Set environment (development, staging, production)
  environment: process.env.NODE_ENV || 'development',

  // Enable Sentry in all environments (including development for testing)
  enabled: process.env.SENTRY_ENABLED !== 'false',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Sample rate for error events (100% = capture all errors)
  sampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false, // Changed to false for privacy

  // Add debug logging in development
  debug: process.env.NODE_ENV === 'development',
});
