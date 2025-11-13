# Policy System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Policy System Implementation to production. Follow these steps carefully to ensure a smooth deployment.

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All tests pass locally (`npm test`)
- [ ] Code has been reviewed and approved
- [ ] Environment variables are configured
- [ ] Database backup has been created
- [ ] Deployment window has been scheduled
- [ ] Rollback plan is documented
- [ ] Team members are notified

## Environment Variables

Ensure the following environment variables are set in production:

```bash
# Database
DATABASE_URL=your_supabase_connection_string
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
NEXT_PUBLIC_API_URL=https://your-domain.com
NODE_ENV=production

# Optional: Redis for caching
REDIS_URL=your_redis_url
```

## Deployment Steps

### Step 1: Database Migration

Run the policy template migration to seed the database with policy templates.

#### Option A: Using Migration Script (Recommended)

```bash
# Navigate to project root
cd /path/to/vision-privacy

# Run the migration script
npm run migrate:policy-templates
```

#### Option B: Manual Migration

```bash
# Connect to Supabase and run the migration
psql $DATABASE_URL -f supabase/migrations/006_cookie_policy_template.sql
```

#### Verification

Verify the migration was successful:

```bash
# Run verification script
node src/scripts/verify-policy-templates.mjs
```

Expected output:
```
✓ Found 2 policy templates
✓ Cookie policy template is active
✓ Privacy policy template is active
✓ Templates contain required variables
```

### Step 2: Deploy API Changes

Deploy the new API endpoints and template engine.

#### For Vercel Deployment

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Deploy to production
vercel --prod

# Or use the deployment script
npm run deploy
```

#### For Custom Server Deployment

```bash
# Build the application
npm run build

# Start the production server
npm start

# Or use PM2 for process management
pm2 start npm --name "vision-privacy" -- start
pm2 save
```

#### Verify API Deployment

Test the API endpoints:

```bash
# Test demo policy endpoint
curl https://your-domain.com/api/demo-policy/cookie

# Test production policy endpoint (replace with actual site_id)
curl https://your-domain.com/api/policy/YOUR_SITE_ID/cookie
```

Expected response:
```json
{
  "success": true,
  "data": {
    "title": "Cookiepolicy",
    "content": "<div class=\"policy-content\">...</div>",
    "lastUpdated": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Step 3: Deploy Frontend Changes

Deploy the updated widget JavaScript files.

#### Static Files

Ensure these files are deployed:
- `public/vision-privacy-widget.js` (updated with policy modal)
- `public/vision-privacy-floating-button.js`
- `public/vision-privacy-floating-button.css`

#### CDN Deployment (if applicable)

```bash
# Upload to CDN
aws s3 sync public/ s3://your-cdn-bucket/widgets/ \
  --exclude "*" \
  --include "vision-privacy-*.js" \
  --include "vision-privacy-*.css" \
  --cache-control "public, max-age=3600"

# Invalidate CDN cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/widgets/*"
```

#### Verify Widget Deployment

Test the widget on a test site:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
</head>
<body>
  <h1>Test Page</h1>
  
  <!-- Load widget -->
  <script src="https://your-domain.com/vision-privacy-widget.js"></script>
  <script>
    VisionPrivacy.init({
      siteId: 'YOUR_TEST_SITE_ID',
      position: 'bottom-right'
    });
  </script>
</body>
</html>
```

### Step 4: Smoke Tests

Run smoke tests to verify the deployment.

#### Automated Smoke Tests

```bash
# Run integration tests against production
NEXT_PUBLIC_API_URL=https://your-domain.com npm run test:integration
```

#### Manual Smoke Tests

1. **Test Demo Widget**
   - Navigate to `https://your-domain.com/demo`
   - Click "Cookie Policy" link
   - Verify modal opens with policy content
   - Verify all template variables are replaced
   - Click "Privacy Policy" link
   - Verify cross-policy navigation works
   - Click settings link
   - Verify cookie settings modal opens

2. **Test Production Widget**
   - Navigate to a registered client site
   - Accept/reject cookies in banner
   - Click "Cookie Policy" link in banner
   - Verify modal displays site-specific content
   - Verify company name, domain, and cookies are correct
   - Test on mobile device
   - Test keyboard navigation

3. **Test API Endpoints**
   ```bash
   # Test cookie policy
   curl https://your-domain.com/api/policy/SITE_ID/cookie | jq
   
   # Test privacy policy
   curl https://your-domain.com/api/policy/SITE_ID/privacy | jq
   
   # Test demo endpoint
   curl https://your-domain.com/api/demo-policy/cookie | jq
   ```

4. **Test Error Handling**
   ```bash
   # Test invalid site_id
   curl https://your-domain.com/api/policy/invalid-id/cookie
   
   # Expected: 404 with error message
   ```

### Step 5: Monitor Error Logs

Monitor application logs for errors after deployment.

#### Vercel Logs

```bash
# View real-time logs
vercel logs --follow

# View logs for specific deployment
vercel logs YOUR_DEPLOYMENT_URL
```

#### Custom Server Logs

```bash
# View PM2 logs
pm2 logs vision-privacy

# View application logs
tail -f /var/log/vision-privacy/app.log

# View error logs
tail -f /var/log/vision-privacy/error.log
```

#### Key Metrics to Monitor

- **API Response Times**: Should be < 200ms for cached requests
- **Error Rate**: Should be < 1% of total requests
- **Cache Hit Rate**: Should be > 80% after warm-up period
- **Database Query Time**: Should be < 100ms for policy fetches

#### Set Up Alerts

Configure alerts for:
- API error rate > 5%
- Response time > 1 second
- Database connection failures
- Template rendering errors

### Step 6: Performance Verification

Verify caching and performance optimizations.

#### Test Cache Headers

```bash
# Check cache headers
curl -I https://your-domain.com/api/policy/SITE_ID/cookie

# Expected headers:
# Cache-Control: public, max-age=300
```

#### Test Cache Behavior

```bash
# First request (cache miss)
time curl https://your-domain.com/api/policy/SITE_ID/cookie > /dev/null

# Second request (cache hit - should be faster)
time curl https://your-domain.com/api/policy/SITE_ID/cookie > /dev/null
```

#### Load Testing (Optional)

```bash
# Install Apache Bench
apt-get install apache2-utils

# Run load test
ab -n 1000 -c 10 https://your-domain.com/api/demo-policy/cookie

# Expected results:
# - 99% of requests complete in < 500ms
# - No failed requests
# - Consistent response times
```

## Post-Deployment Tasks

### 1. Update Documentation

- [ ] Update API documentation with production URLs
- [ ] Update client integration guides
- [ ] Update internal wiki/knowledge base

### 2. Notify Stakeholders

- [ ] Send deployment notification to team
- [ ] Notify client-facing teams of new features
- [ ] Update status page if applicable

### 3. Monitor for 24 Hours

- [ ] Check error logs every 2 hours
- [ ] Monitor performance metrics
- [ ] Review user feedback/support tickets
- [ ] Check database performance

### 4. Client Communication

- [ ] Notify clients of new policy features
- [ ] Provide updated integration examples
- [ ] Offer support for any issues

## Rollback Procedure

If issues are detected, follow this rollback procedure:

### Step 1: Identify the Issue

Determine if the issue is:
- API-related (endpoints returning errors)
- Frontend-related (widget not working)
- Database-related (migration issues)

### Step 2: Execute Rollback

#### Rollback API Deployment

```bash
# Vercel rollback
vercel rollback

# Or redeploy previous version
vercel --prod --force
```

#### Rollback Database Migration

```bash
# Create rollback migration
psql $DATABASE_URL << EOF
-- Deactivate new templates
UPDATE policy_templates 
SET is_active = false 
WHERE version = '1.0.0';

-- Reactivate old templates if they exist
UPDATE policy_templates 
SET is_active = true 
WHERE version = '0.9.0';
EOF
```

#### Rollback Frontend Changes

```bash
# Restore previous widget files from backup
aws s3 sync s3://your-backup-bucket/widgets/ public/

# Or redeploy previous version
git checkout previous-release-tag
npm run build
npm run deploy
```

### Step 3: Verify Rollback

- Test API endpoints
- Test widget functionality
- Check error logs
- Verify no new errors

### Step 4: Investigate and Fix

- Review error logs
- Identify root cause
- Create fix
- Test thoroughly
- Redeploy when ready

## Troubleshooting

### Issue: Templates Not Found

**Symptoms**: API returns 404 "Policy template not found"

**Solution**:
```bash
# Verify templates exist
node src/scripts/verify-policy-templates.mjs

# If missing, re-run migration
npm run migrate:policy-templates
```

### Issue: Variables Not Replaced

**Symptoms**: Policy content shows `{{VARIABLE_NAME}}` instead of actual values

**Solution**:
1. Check site data exists in database
2. Verify template engine is working:
   ```bash
   npm run test src/__tests__/lib/policy-template.test.ts
   ```
3. Check API logs for rendering errors

### Issue: Cache Not Working

**Symptoms**: Every request hits database, slow response times

**Solution**:
1. Verify Redis connection (if using Redis)
2. Check cache configuration in code
3. Monitor cache hit/miss rates
4. Clear cache and let it rebuild:
   ```bash
   # If using Redis
   redis-cli FLUSHDB
   ```

### Issue: Widget Not Loading Policies

**Symptoms**: Modal opens but shows loading spinner indefinitely

**Solution**:
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check CORS configuration
4. Test API endpoint directly:
   ```bash
   curl https://your-domain.com/api/policy/SITE_ID/cookie
   ```

### Issue: Mobile Display Issues

**Symptoms**: Policy modal not responsive on mobile

**Solution**:
1. Verify CSS file is loaded
2. Check viewport meta tag
3. Test on actual devices
4. Review responsive CSS rules

## Success Criteria

Deployment is considered successful when:

- ✅ All smoke tests pass
- ✅ No critical errors in logs
- ✅ API response times < 200ms (cached)
- ✅ Cache hit rate > 80%
- ✅ Widget works on test sites
- ✅ Demo page functions correctly
- ✅ Mobile display is correct
- ✅ Accessibility features work
- ✅ Cross-policy navigation works
- ✅ Settings link opens cookie modal

## Support Contacts

- **DevOps Lead**: devops@visionprivacy.com
- **Backend Lead**: backend@visionprivacy.com
- **Frontend Lead**: frontend@visionprivacy.com
- **On-Call**: oncall@visionprivacy.com

## Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Manual Testing Guide](./.kiro/specs/policy-system-implementation/MANUAL_TESTING_GUIDE.md)
- [Design Document](./.kiro/specs/policy-system-implementation/design.md)
- [Requirements Document](./.kiro/specs/policy-system-implementation/requirements.md)

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
