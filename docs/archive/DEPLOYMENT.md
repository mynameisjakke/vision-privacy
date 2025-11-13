# Vision Privacy - Deployment Guide

## 🚀 Pre-Deployment Checklist

### ✅ Task 9: Deployment and Monitoring Setup - **COMPLETED**

All deployment infrastructure is now in place:
- ✅ Deployment scripts created
- ✅ CI/CD pipeline configured (GitHub Actions)
- ✅ Database migration scripts ready
- ✅ Environment setup scripts created
- ✅ Monitoring and observability system implemented
- ✅ Error tracking and logging configured
- ✅ Analytics and usage tracking ready
- ✅ Alerting system configured
- ✅ Health check endpoints enhanced

---

## 📋 What's Ready for Production

### 1. **Core Application** ✅
- Next.js 14 application fully configured
- TypeScript setup complete
- API routes implemented
- Widget system functional
- Consent management working

### 2. **Database** ✅
- Supabase configured and connected
- Migration files ready (`supabase/migrations/`)
- Seed data prepared
- Database schema defined

### 3. **Deployment Infrastructure** ✅
- Vercel configuration (`vercel.json`)
- GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Deployment scripts (`scripts/deploy.sh`)
- Database migration scripts (`scripts/migrate-db.sh`)
- Environment setup scripts (`scripts/setup-env.sh`)

### 4. **Monitoring & Observability** ✅
- Centralized logging system
- Performance monitoring
- Error tracking
- Analytics and usage metrics
- Alerting system
- Health check endpoints

### 5. **Security** ✅
- API authentication
- Rate limiting (Upstash Redis)
- CORS configuration
- Admin token validation
- Environment variable management

---

## 🔧 What You Need Before Deploying

### 1. **GitHub Repository**
Your code needs to be pushed to GitHub for Vercel deployment.

**Check current status:**
```bash
git remote -v
```

**If not connected to GitHub:**
```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/vision-privacy.git
git branch -M main
git add .
git commit -m "feat: complete deployment setup with monitoring"
git push -u origin main
```

### 2. **Vercel Account**
- Sign up at https://vercel.com (free tier available)
- Connect your GitHub account
- Import your repository

### 3. **Supabase Project** ✅
You already have this configured:
- URL: `https://imkypxypdkpqcqitziue.supabase.co`
- Keys are in `.env.local`

### 4. **Upstash Redis** (Optional but Recommended)
For rate limiting and caching:
- Sign up at https://upstash.com (free tier available)
- Create a Redis database
- Get REST URL and token

---

## 📦 Deployment Steps

### Step 1: Push Code to GitHub

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: complete Vision Privacy with deployment infrastructure

- Add deployment scripts and CI/CD pipeline
- Implement monitoring and observability system
- Add error tracking and analytics
- Configure alerting system
- Create demo page for testing
- Update documentation"

# Push to GitHub
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended for first deployment)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

4. Add Environment Variables (click "Environment Variables"):

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://imkypxypdkpqcqitziue.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
API_SECRET_KEY=<generate-secure-32-char-key>
NEXTAUTH_SECRET=<generate-secure-32-char-key>
ADMIN_API_TOKEN=<generate-secure-48-char-key>
NODE_ENV=production
```

**Optional (for full functionality):**
```
UPSTASH_REDIS_REST_URL=<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com
RATE_LIMIT_ENABLED=true
NEXT_PUBLIC_WIDGET_CDN_URL=https://your-vercel-url.vercel.app
NEXT_PUBLIC_API_URL=https://your-vercel-url.vercel.app
```

5. Click **Deploy**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Deploy to production
vercel --prod
```

### Step 3: Run Database Migrations

After deployment, run migrations on your Supabase database:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref imkypxypdkpqcqitziue

# Push migrations
supabase db push
```

Or use the migration script:
```bash
./scripts/migrate-db.sh migrate
```

### Step 4: Verify Deployment

1. **Health Check:**
   Visit: `https://your-app.vercel.app/api/health`
   
   Should return:
   ```json
   {
     "status": "healthy",
     "database": "healthy",
     "monitoring": { ... }
   }
   ```

2. **Demo Page:**
   Visit: `https://your-app.vercel.app/demo`
   
   Should show the cookie banner demo

3. **API Endpoints:**
   - `/api/sites/register` - Site registration
   - `/api/widget/[site_id]` - Widget configuration
   - `/api/consent` - Consent submission
   - `/api/admin/monitoring` - Monitoring dashboard
   - `/api/admin/analytics` - Analytics data

---

## 🔐 Security Checklist

Before going live, ensure:

- [ ] All environment variables are set in Vercel
- [ ] API secrets are strong (32+ characters)
- [ ] Admin tokens are secure (48+ characters)
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] Database RLS (Row Level Security) is configured in Supabase
- [ ] `.env.local` is in `.gitignore` (already done)
- [ ] No sensitive data in git history

---

## 📊 Post-Deployment Monitoring

### Access Monitoring Dashboards

1. **Vercel Dashboard:**
   - https://vercel.com/dashboard
   - View deployments, logs, analytics

2. **Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Monitor database, API usage

3. **Application Monitoring:**
   - Health: `https://your-app.vercel.app/api/health`
   - Monitoring: `https://your-app.vercel.app/api/admin/monitoring`
   - Analytics: `https://your-app.vercel.app/api/admin/analytics`
   - Alerts: `https://your-app.vercel.app/api/admin/alerts`

### Set Up Alerts

Configure alert rules via the API:
```bash
curl -X POST https://your-app.vercel.app/api/admin/alerts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_rule",
    "name": "High Error Rate",
    "metric": "error_rate",
    "condition": "greater_than",
    "threshold": 5,
    "severity": "high",
    "channels": [{"type": "webhook", "config": {"url": "YOUR_WEBHOOK"}}]
  }'
```

---

## 🔄 Continuous Deployment

### Automatic Deployments

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:

1. **On Pull Request:**
   - Runs tests
   - Creates preview deployment
   - Comments PR with preview URL

2. **On Push to Main:**
   - Runs tests
   - Deploys to production
   - Runs database migrations
   - Sends deployment notifications

### Manual Deployment

Use the deployment script:
```bash
# Deploy to preview
./scripts/deploy.sh preview

# Deploy to production
./scripts/deploy.sh production
```

---

## 🐛 Troubleshooting

### Build Fails

1. Check TypeScript errors:
   ```bash
   npm run type-check
   ```

2. Check linting:
   ```bash
   npm run lint
   ```

3. Test build locally:
   ```bash
   npm run build
   ```

### Database Connection Issues

1. Verify environment variables in Vercel
2. Check Supabase project status
3. Verify API keys are correct
4. Check database connection in Supabase dashboard

### API Errors

1. Check Vercel function logs
2. Verify environment variables
3. Check API authentication
4. Review error logs in monitoring dashboard

---

## 📝 Environment Variables Reference

### Required for Core Functionality
```env
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key
API_SECRET_KEY=                     # API authentication secret
NEXTAUTH_SECRET=                    # NextAuth secret
ADMIN_API_TOKEN=                    # Admin API token
NODE_ENV=production                 # Environment
```

### Optional for Enhanced Features
```env
UPSTASH_REDIS_REST_URL=            # Redis for rate limiting
UPSTASH_REDIS_REST_TOKEN=          # Redis token
CORS_ALLOWED_ORIGINS=              # Allowed CORS origins
RATE_LIMIT_ENABLED=true            # Enable rate limiting
NEXT_PUBLIC_WIDGET_CDN_URL=        # Widget CDN URL
NEXT_PUBLIC_API_URL=               # API base URL
LOG_WEBHOOK_URL=                   # External logging webhook
ANALYTICS_WEBHOOK_URL=             # Analytics webhook
```

---

## 🎯 Next Steps After Deployment

1. **Test All Endpoints:**
   - Use the demo page to test widget functionality
   - Test site registration
   - Test consent submission
   - Verify monitoring dashboards

2. **Configure WordPress Plugin:**
   - Update plugin to use production API URL
   - Test integration with real WordPress sites

3. **Set Up Monitoring Alerts:**
   - Configure error rate alerts
   - Set up performance monitoring
   - Enable uptime monitoring

4. **Documentation:**
   - Create API documentation
   - Write integration guides
   - Document admin features

5. **Performance Optimization:**
   - Enable CDN caching
   - Optimize database queries
   - Configure edge functions

---

## 📞 Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **GitHub Actions:** https://docs.github.com/actions

---

## ✅ Deployment Checklist Summary

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Repository imported to Vercel
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] Database migrations run
- [ ] Health check passing
- [ ] Demo page working
- [ ] API endpoints tested
- [ ] Monitoring dashboards accessible
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] WordPress plugin configured

---

**🎉 You're ready to deploy Vision Privacy to production!**

The application is production-ready with comprehensive monitoring, error tracking, and deployment automation. All infrastructure code has been implemented and tested.