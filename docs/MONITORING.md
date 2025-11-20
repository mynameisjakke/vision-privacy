# Vision Privacy Monitoring Guide

## Overview
Comprehensive monitoring setup for Vision Privacy serving 800+ client websites.

## 1. Sentry Error Tracking ✅

### Setup Complete
- ✅ Server-side error tracking (Next.js API)
- ✅ Client-side error tracking (Widget)
- ✅ Performance monitoring
- ✅ Release tracking

### What's Monitored
- Widget initialization failures
- API endpoint errors
- Consent save failures
- Policy generation errors
- Database connection issues

### Sentry Dashboard
- URL: https://sentry.io/organizations/[your-org]/projects/
- Check daily for new errors
- Set up alerts for critical errors

## 2. Health Check Endpoint ✅

### Endpoint
```
GET https://vision-privacy.vercel.app/api/health
```

### Response
```json
{
  "status": "healthy",
  "timestamp": "2025-11-20T10:00:00.000Z",
  "services": {
    "api": "operational",
    "database": "operational"
  },
  "performance": {
    "responseTime": "45ms"
  },
  "version": "abc1234"
}
```

### Use For
- Uptime monitoring (Better Uptime, UptimeRobot)
- Status page
- Automated health checks

## 3. Metrics Dashboard ✅

### Endpoint
```
GET https://vision-privacy.vercel.app/api/metrics
Authorization: Bearer YOUR_METRICS_API_KEY
```

### Response
```json
{
  "timestamp": "2025-11-20T10:00:00.000Z",
  "metrics": {
    "sites": {
      "active": 800,
      "total": 800
    },
    "consents": {
      "last24h": 15000,
      "perHour": 625
    },
    "scans": {
      "last24h": 3200,
      "perHour": 133
    },
    "policies": {
      "last7d": 450,
      "perDay": 64
    }
  },
  "health": "operational"
}
```

### Setup
1. Add to `.env.local`:
   ```
   METRICS_API_KEY=your-secure-random-key-here
   ```
2. Add to Vercel environment variables
3. Use for internal dashboards

## 4. Recommended Next Steps

### A. Set Up Uptime Monitoring
**Recommended: Better Uptime** (https://betteruptime.com)

Monitor these endpoints every 5 minutes:
- `https://vision-privacy.vercel.app/api/health`
- `https://vision-privacy.vercel.app/api/widget/script`

Alert channels:
- Email
- Slack
- SMS (for critical)

### B. Configure Sentry Alerts

Set up alerts for:
1. **Critical Errors** (immediate)
   - Database connection failures
   - Widget script load failures
   - API 500 errors

2. **Warning Errors** (daily digest)
   - Consent save failures
   - Policy generation issues
   - Cache misses

3. **Performance Issues**
   - API response time > 1s
   - Widget load time > 2s

### C. Create Monitoring Dashboard

Use the `/api/metrics` endpoint to build a dashboard showing:
- Active sites count
- Consent events per hour
- Error rate
- API response times
- Cache hit rates

Tools:
- Grafana (self-hosted)
- Datadog (paid)
- Custom Next.js dashboard

### D. Set Up Log Aggregation

**Vercel Log Drains** → Export to:
- Datadog
- Logtail
- Better Stack

## 5. Monitoring Checklist

### Daily
- [ ] Check Sentry for new errors
- [ ] Review uptime status
- [ ] Check metrics dashboard

### Weekly
- [ ] Review error trends
- [ ] Check performance metrics
- [ ] Review consent rates per site

### Monthly
- [ ] Analyze error patterns
- [ ] Review capacity planning
- [ ] Update alert thresholds

## 6. Alert Thresholds

### Critical (Immediate Alert)
- Health check fails
- Error rate > 5%
- Database connection fails
- API response time > 5s

### Warning (Daily Digest)
- Error rate > 1%
- API response time > 1s
- Cache hit rate < 80%

### Info (Weekly Report)
- New sites added
- Consent trends
- Performance improvements

## 7. Incident Response

### When Alert Fires
1. Check Sentry for error details
2. Check `/api/health` endpoint
3. Check Vercel deployment status
4. Check Supabase status
5. Review recent deployments

### Rollback Process
```bash
# Via Vercel Dashboard
1. Go to Deployments
2. Find last working deployment
3. Click "Promote to Production"

# Via CLI
vercel rollback
```

## 8. Performance Targets

### API Endpoints
- P50: < 100ms
- P95: < 500ms
- P99: < 1s

### Widget Load
- P50: < 200ms
- P95: < 1s
- P99: < 2s

### Uptime
- Target: 99.9% (43 minutes downtime/month)
- Acceptable: 99.5% (3.6 hours downtime/month)

## 9. Cost Estimates

### Sentry
- Free tier: 5k errors/month
- Team tier: $26/month (50k errors/month)
- **Recommended:** Team tier

### Better Uptime
- Free tier: 10 monitors, 3-minute checks
- Pro tier: $18/month, 1-minute checks
- **Recommended:** Pro tier

### Total Monthly Cost
- Sentry Team: $26
- Better Uptime Pro: $18
- **Total: ~$44/month**

## 10. Environment Variables

Add to Vercel:
```bash
# Sentry (auto-configured)
SENTRY_DSN=https://...
SENTRY_ORG=your-org
SENTRY_PROJECT=vision-privacy

# Metrics API
METRICS_API_KEY=generate-secure-random-key

# Optional: External monitoring
BETTER_UPTIME_API_KEY=your-key
```

## 11. Testing Monitoring

### Test Error Tracking
```bash
# Trigger test error
curl https://vision-privacy.vercel.app/api/test-error

# Check Sentry dashboard for error
```

### Test Health Check
```bash
curl https://vision-privacy.vercel.app/api/health
```

### Test Metrics
```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  https://vision-privacy.vercel.app/api/metrics
```

## 12. Support Contacts

### Vercel Support
- Dashboard: https://vercel.com/support
- Status: https://www.vercel-status.com/

### Sentry Support
- Dashboard: https://sentry.io/support/
- Status: https://status.sentry.io/

### Supabase Support
- Dashboard: https://supabase.com/dashboard/support
- Status: https://status.supabase.com/
