# 🚀 Zavala AI Content Engine - Vercel Deployment Guide

## Prerequisites Checklist
- ✅ Database migration applied in Supabase
- ✅ GitHub repository ready with latest code
- ✅ Vercel account connected to GitHub
- ✅ Production environment variables available

## Step 1: Vercel Project Setup

### Option A: New Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import from GitHub: `misterzavala/jv-foundations`
4. Select the repository and branch: `main`

### Option B: Update Existing Project
1. Go to your existing Vercel project
2. Settings → Git → Change Repository
3. Connect to `misterzavala/jv-foundations`

## Step 2: Build Configuration

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "nodeVersion": "18.x"
}
```

**In Vercel Dashboard:**
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci` (auto-detected)

## Step 3: Environment Variables

Add these in **Vercel → Project Settings → Environment Variables → Production**:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://fassrytpmwgxwxrrnerk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY

# N8N Integration
VITE_N8N_WEBHOOK_URL=https://lifemastery.app.n8n.cloud/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa
VITE_N8N_JWT_SECRET=Z@V@L@
VITE_N8N_WEBHOOK_SECRET=zbyHNp38TAvoGpTKP2MZzVdfJKWAxEc

# Application Configuration
VITE_APP_ENV=production
VITE_DEBUG_MODE=false
VITE_STORAGE_BUCKET=assets
```

**Important Settings:**
- Environment: **Production**
- Apply to: **Production, Preview, Development** (or just Production)

## Step 4: Deploy

1. **Trigger Deployment**:
   - Push to `main` branch (automatic)
   - Or click **"Deploy"** in Vercel dashboard

2. **Monitor Build**:
   - Watch build logs in Vercel dashboard
   - Look for successful completion: ✅ Build completed
   - Note the deployment URL

## Step 5: Post-Deployment Verification

### Basic Functionality Test
```bash
# Test endpoints
curl -I https://your-app.vercel.app/
curl -I https://your-app.vercel.app/content
```

### Application Testing
1. **Visit your deployment URL**
2. **Test login/authentication**
3. **Try asset upload**
4. **Test N8N webhook integration**
5. **Verify Supabase connection**

### Database Connection Test
Check browser console for:
- ✅ Supabase client initialized
- ✅ Authentication working
- ✅ No CORS errors
- ✅ Tables accessible

## Step 6: Domain Configuration (Optional)

If you have a custom domain:
1. Vercel → Project → Settings → Domains
2. Add your domain
3. Configure DNS records as shown
4. Wait for SSL certificate provisioning

## Step 7: Monitoring Setup

### Vercel Analytics
1. Enable **Vercel Analytics** in project settings
2. Configure **Web Vitals** monitoring
3. Set up **deployment notifications**

### Supabase Monitoring
1. Enable **Auth logs** in Supabase dashboard
2. Monitor **Database performance**
3. Watch **Storage usage**

## Rollback Plan

If deployment fails or issues arise:

```bash
# 1. Revert to previous version in Vercel
# 2. Or deploy specific commit
git checkout <previous-working-commit>
git push origin main --force
```

**Emergency contacts:**
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Supabase Support: [supabase.com/support](https://supabase.com/support)

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ Build completes without errors
- ✅ Application loads at deployment URL
- ✅ Authentication works
- ✅ Asset upload functions
- ✅ N8N webhooks respond correctly
- ✅ Database queries execute properly

## Next Steps

After successful deployment:
1. Test all major user workflows
2. Configure social media API credentials in N8N
3. Set up monitoring and alerting
4. Create user documentation
5. Plan feature rollout schedule

---

**🚀 Your Zavala AI Content Engine is now live!**
