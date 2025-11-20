/**
 * Sentry Widget Error Tracking
 * Lightweight error tracking for the Vision Privacy widget
 */

export function generateWidgetSentryScript(sentryDsn: string): string {
  return `
// Vision Privacy Widget - Sentry Error Tracking
(function() {
  'use strict';
  
  // Initialize Sentry for widget error tracking
  if (typeof window !== 'undefined') {
    window.VisionPrivacySentry = {
      captureException: function(error, context) {
        try {
          // Send error to Sentry via beacon API (non-blocking)
          const payload = {
            message: error.message || String(error),
            stack: error.stack,
            context: context || {},
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            siteId: window.VP_SITE_ID || 'unknown'
          };
          
          // Use sendBeacon for reliable error reporting
          if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon('${sentryDsn}/api/error', blob);
          } else {
            // Fallback to fetch
            fetch('${sentryDsn}/api/error', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              keepalive: true
            }).catch(function() {
              // Silently fail - don't break the widget
            });
          }
        } catch (e) {
          // Silently fail - don't break the widget
          console.error('[VP] Error reporting failed:', e);
        }
      },
      
      captureMessage: function(message, level, context) {
        this.captureException(new Error(message), { level: level || 'info', ...context });
      }
    };
    
    // Global error handler for widget errors
    window.addEventListener('error', function(event) {
      if (event.filename && event.filename.includes('vision-privacy')) {
        window.VisionPrivacySentry.captureException(event.error || new Error(event.message), {
          level: 'error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
      window.VisionPrivacySentry.captureException(event.reason, {
        level: 'error',
        type: 'unhandledrejection'
      });
    });
  }
})();
  `.trim();
}
