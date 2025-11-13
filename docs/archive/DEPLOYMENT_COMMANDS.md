# Policy System - Quick Deployment Commands

Quick reference for deployment commands. See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## Pre-Deployment

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Build application
npm run build

# Create database backup (if using Supabase CLI)
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

## Database Migration

```bash
# Run policy template migration
npm run migrate:policy-templates

# Or manually with psql
psql $DATABASE_URL -f supabase/migrations/006_cookie_policy_template.sql

# Verify migration
node src/scripts/verify-policy-templates.mjs
```

## Deployment

### Vercel (Recommended)

```bash
# Deploy to production
vercel --prod

# View deployment logs
vercel logs --follow

# Rollback if needed
vercel rollback
```

### Custom Server

```bash
# Build application
npm run build

# Start with PM2
pm2 start npm --name "vision-privacy" -- start
pm2 save

# View logs
pm2 logs vision-privacy

# Restart
pm2 restart vision-privacy

# Stop
pm2 stop vision-privacy
```

### Docker

```bash
# Build image
docker build -t vision-privacy:latest .

# Run container
docker run -d \
  --name vision-privacy \
  -p 3000:3000 \
  --env-file .env.production \
  vision-privacy:latest

# View logs
docker logs -f vision-privacy

# Stop container
docker stop vision-privacy
```

## Verification

```bash
# Test demo policy endpoints
curl https://your-domain.com/api/demo-policy/cookie | jq
curl https://your-domain.com/api/demo-policy/privacy | jq

# Test production policy endpoints (replace SITE_ID)
curl https://your-domain.com/api/policy/SITE_ID/cookie | jq
curl https://your-domain.com/api/policy/SITE_ID/privacy | jq

# Check response headers
curl -I https://your-domain.com/api/policy/SITE_ID/cookie

# Test error handling
curl https://your-domain.com/api/policy/invalid-id/cookie | jq
```

## Performance Testing

```bash
# Install Apache Bench
apt-get install apache2-utils  # Ubuntu/Debian
brew install ab                 # macOS

# Run load test
ab -n 1000 -c 10 https://your-domain.com/api/demo-policy/cookie

# Test cache performance
time curl https://your-domain.com/api/policy/SITE_ID/cookie > /dev/null
time curl https://your-domain.com/api/policy/SITE_ID/cookie > /dev/null
```

## Monitoring

```bash
# Vercel logs
vercel logs --follow
vercel logs YOUR_DEPLOYMENT_URL

# PM2 logs
pm2 logs vision-privacy
pm2 monit

# Docker logs
docker logs -f vision-privacy

# System logs
tail -f /var/log/vision-privacy/app.log
tail -f /var/log/vision-privacy/error.log
```

## Cache Management

```bash
# Clear Redis cache (if using Redis)
redis-cli FLUSHDB

# Clear specific cache keys
redis-cli DEL "policy:rendered:*"
redis-cli DEL "policy:template:*"

# View cache statistics
redis-cli INFO stats
```

## Database Queries

```bash
# Check policy templates
psql $DATABASE_URL -c "SELECT template_type, version, is_active FROM policy_templates;"

# Check site data
psql $DATABASE_URL -c "SELECT id, domain, company_name FROM sites LIMIT 10;"

# Check detected cookies
psql $DATABASE_URL -c "SELECT site_id, cookie_name, cookie_category FROM detected_cookies LIMIT 10;"

# Count templates
psql $DATABASE_URL -c "SELECT template_type, COUNT(*) FROM policy_templates GROUP BY template_type;"
```

## Rollback

```bash
# Rollback Vercel deployment
vercel rollback

# Rollback database migration
psql $DATABASE_URL << EOF
UPDATE policy_templates SET is_active = false WHERE version = '1.0.0';
UPDATE policy_templates SET is_active = true WHERE version = '0.9.0';
EOF

# Rollback to previous git tag
git checkout v1.0.0
npm run build
vercel --prod --force

# Restore widget files from backup
aws s3 sync s3://backup-bucket/widgets/ public/
```

## CDN Management (if applicable)

```bash
# Upload to S3
aws s3 sync public/ s3://your-cdn-bucket/widgets/ \
  --exclude "*" \
  --include "vision-privacy-*.js" \
  --include "vision-privacy-*.css" \
  --cache-control "public, max-age=3600"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/widgets/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --id INVALIDATION_ID
```

## Health Checks

```bash
# Check API health
curl https://your-domain.com/api/health

# Check database connection
curl https://your-domain.com/api/test-db

# Check all endpoints
for endpoint in cookie privacy; do
  echo "Testing $endpoint..."
  curl -s https://your-domain.com/api/demo-policy/$endpoint | jq '.success'
done
```

## Troubleshooting

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check environment variables
env | grep -E '(DATABASE_URL|SUPABASE|NEXT_PUBLIC)'

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep node

# Check port availability
lsof -i :3000
```

## Emergency Contacts

```bash
# Send alert to team (example using Slack webhook)
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"🚨 Policy System deployment issue detected!"}'

# Page on-call engineer (example using PagerDuty)
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_ROUTING_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Policy System deployment issue",
      "severity": "critical",
      "source": "deployment-script"
    }
  }'
```

## Useful Aliases

Add these to your `.bashrc` or `.zshrc`:

```bash
# Deployment aliases
alias vp-deploy='vercel --prod'
alias vp-logs='vercel logs --follow'
alias vp-rollback='vercel rollback'

# Testing aliases
alias vp-test='npm test'
alias vp-test-int='npm run test:integration'

# Database aliases
alias vp-db='psql $DATABASE_URL'
alias vp-migrate='npm run migrate:policy-templates'
alias vp-verify='node src/scripts/verify-policy-templates.mjs'

# Monitoring aliases
alias vp-health='curl https://your-domain.com/api/health'
alias vp-demo='curl https://your-domain.com/api/demo-policy/cookie | jq'
```

---

**Note**: Replace placeholders like `SITE_ID`, `YOUR_DISTRIBUTION_ID`, and `your-domain.com` with actual values.

For detailed explanations and troubleshooting, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).
