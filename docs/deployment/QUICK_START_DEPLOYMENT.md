# Quick Start - Deploy Policy System in 10 Minutes

This is a streamlined guide to deploy the Policy System to production quickly. For detailed information, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Supabase project configured
- [ ] Environment variables set in `.env.local`
- [ ] Code tested locally (`npm test`)

## Step 1: Database Migration (2 minutes)

```bash
# Run the policy template migration
npm run migrate:policy-templates

# Verify it worked
node src/scripts/verify-policy-templates.mjs
```

**Expected output:**
```
✓ Found 2 policy templates
✓ Cookie policy template is active
✓ Privacy policy template is active
```

## Step 2: Deploy to Vercel (3 minutes)

```bash
# Deploy to production
vercel --prod

# Wait for deployment to complete
# Note the deployment URL
```

## Step 3: Quick Verification (2 minutes)

```bash
# Replace YOUR_DOMAIN with your actual domain
export DOMAIN="your-domain.com"

# Test demo endpoint
curl https://$DOMAIN/api/demo-policy/cookie | jq '.success'
# Should return: true

# Test with a real site_id (replace SITE_ID)
curl https://$DOMAIN/api/policy/SITE_ID/cookie | jq '.success'
# Should return: true
```

## Step 4: Smoke Test (3 minutes)

### Test Demo Widget

1. Open `https://your-domain.com/demo`
2. Click "Cookie Policy" link
3. Verify modal opens with content
4. Click "Privacy Policy" link
5. Verify navigation works
6. Close modal with X button

### Test Production Widget

1. Open a registered client site
2. Click "Cookie Policy" in banner
3. Verify site-specific content displays
4. Check company name and domain are correct
5. Test on mobile device (optional but recommended)

## Step 5: Monitor (Ongoing)

```bash
# Watch logs for errors
vercel logs --follow

# Check for any 500 errors
# Monitor response times
```

## Success Checklist

- ✅ Migration completed successfully
- ✅ Deployment completed without errors
- ✅ Demo endpoint returns success
- ✅ Production endpoint returns success
- ✅ Demo widget displays policies
- ✅ Production widget displays policies
- ✅ No errors in logs

## If Something Goes Wrong

### Migration Failed

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Try manual migration
psql $DATABASE_URL -f supabase/migrations/006_cookie_policy_template.sql
```

### Deployment Failed

```bash
# Check build logs
vercel logs

# Verify environment variables
vercel env ls

# Try redeploying
vercel --prod --force
```

### API Returns Errors

```bash
# Check specific error
curl https://your-domain.com/api/demo-policy/cookie | jq

# Common issues:
# - 404: Template not found → Re-run migration
# - 500: Rendering error → Check logs
# - Network error: Check deployment status
```

### Widget Not Working

1. Check browser console for errors
2. Verify widget JavaScript is loaded
3. Test API endpoint directly
4. Check CORS configuration

## Rollback (If Needed)

```bash
# Rollback Vercel deployment
vercel rollback

# Deactivate new templates
psql $DATABASE_URL -c "UPDATE policy_templates SET is_active = false WHERE version = '1.0.0';"
```

## Next Steps After Deployment

1. ✅ Monitor logs for 24 hours
2. ✅ Test on multiple client sites
3. ✅ Verify mobile display
4. ✅ Check performance metrics
5. ✅ Update client documentation
6. ✅ Notify team of deployment

## Need More Help?

- **Detailed Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Full Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **All Commands**: [DEPLOYMENT_COMMANDS.md](./DEPLOYMENT_COMMANDS.md)
- **API Docs**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Support**: oncall@visionprivacy.com

---

**Estimated Time**: 10 minutes
**Difficulty**: Easy
**Prerequisites**: Basic command line knowledge
