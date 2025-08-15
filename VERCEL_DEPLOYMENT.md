# Vercel Deployment Guide - Zavala AI Content Engine

## Prerequisites

✅ Vercel account connected to GitHub
✅ Production Supabase project with database migration applied
✅ N8N instance with webhook credentials configured

## Step 1: Database Setup

### Apply Database Migration

1. Log into your Supabase dashboard: https://supabase.com/dashboard
2. Select your production project
3. Go to **SQL Editor**
4. Run the migration script from: `scripts/direct-migration.sql`
5. Verify all tables are created successfully

### Configure Supabase Storage

1. In Supabase dashboard, go to **Storage**
2. Create a new bucket named: `assets`
3. Set bucket to **Public** (for file uploads)
4. Configure appropriate RLS policies for asset management

## Step 2: Environment Variables

### Required Environment Variables for Vercel

Add these to your Vercel project environment variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://fassrytpmwgxwxrrnerk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY

# N8N Webhook Integration
VITE_N8N_WEBHOOK_URL=https://lifemastery.app.n8n.cloud/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa
VITE_N8N_WEBHOOK_SECRET=your_webhook_secret_from_n8n

# Application Configuration
VITE_APP_ENV=production
VITE_DEBUG_MODE=false
VITE_STORAGE_BUCKET=assets
```

### How to Add Environment Variables in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add each variable with:
   - **Name**: Variable name (e.g., `VITE_SUPABASE_URL`)
   - **Value**: The actual value
   - **Environment**: Select all (Production, Preview, Development)

## Step 3: Deploy to Vercel

### Option A: Connect GitHub Repository

1. In Vercel dashboard, click **Add New Project**
2. Import your GitHub repository
3. Vercel will auto-detect Vite framework
4. Click **Deploy**

### Option B: Vercel CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel --prod
```

## Step 4: Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable HTTPS (automatic)

## Step 5: Verify Deployment

### Test Core Functionality

1. **Authentication**: Test login/signup
2. **Content Creation**: Create new assets
3. **File Uploads**: Test image/video uploads to Supabase Storage
4. **Publishing**: Test N8N webhook integration
5. **API Endpoints**: Verify `/api/webhook/n8n/callback` endpoint

### Monitor Deployment

- Check Vercel deployment logs
- Monitor Supabase real-time logs
- Test N8N webhook delivery

## Step 6: Security Configuration

### Webhook Security

Ensure your N8N webhook secret is:
- Stored securely in N8N credentials
- Referenced (not hardcoded) in workflows
- Added to Vercel environment variables

### Database Security

Verify Row Level Security (RLS) policies are active:
- `assets` table: Users can only access their own content
- `events` table: Proper event filtering
- `workflow_executions` table: Secure execution tracking

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check TypeScript errors
npm run type-check

# Check linting
npm run lint

# Test local build
npm run build
```

**API Route Issues:**
- Verify `/api` routes are properly configured in `vercel.json`
- Check function runtime settings
- Monitor Vercel function logs

**Environment Variable Issues:**
- Ensure all `VITE_` prefixed variables are set
- Check variable names match exactly
- Verify values don't contain special characters

### Debug Mode

For troubleshooting, temporarily enable:
```bash
VITE_DEBUG_MODE=true
```

This will show detailed error messages and API responses.

## Production Checklist

- [ ] Database migration applied successfully
- [ ] All environment variables configured
- [ ] Supabase Storage bucket created and configured
- [ ] N8N webhooks tested and working
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Authentication flow tested
- [ ] File upload functionality tested
- [ ] Publishing workflow tested
- [ ] Error monitoring configured

## Post-Deployment

1. **Monitor Performance**: Check Vercel analytics
2. **Set Up Alerts**: Configure error monitoring
3. **Test Workflows**: Verify N8N integration end-to-end
4. **User Training**: Prepare documentation for end users

Your Zavala AI Content Engine is now live! 🚀