# 🚀 Zavala AI Content Engine - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Database Migration
- [ ] **Apply SQL Migration**: Run `scripts/direct-migration.sql` in your Supabase SQL Editor
  - Copy the entire contents of the file
  - Paste into Supabase Dashboard > SQL Editor
  - Click "Run" to execute
  - Verify success message appears

### 2. Supabase Storage Setup
- [ ] **Create Storage Bucket**:
  ```sql
  -- Run in Supabase SQL Editor
  INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
  VALUES (
    'assets',
    'assets', 
    true,
    ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/mov','video/avi','video/quicktime'],
    524288000 -- 500MB
  );
  ```

- [ ] **Configure Storage Policies**:
  ```sql
  -- Allow authenticated users to upload files
  CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assets' AND 
    auth.role() = 'authenticated'
  );

  -- Allow public access to view files  
  CREATE POLICY "Public can view files" ON storage.objects
  FOR SELECT USING (bucket_id = 'assets');

  -- Allow users to delete their own files
  CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'assets' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
  ```

### 3. Environment Variables
Create/update your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# N8N Integration
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=your-secure-webhook-secret

# Social Media Platform APIs
NEXT_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Security
WEBHOOK_SIGNING_SECRET=your-secure-signing-secret
NEXTAUTH_SECRET=your-nextauth-secret
```

### 4. N8N Workflow Configuration
- [ ] **Update N8N Webhook URLs**:
  - Production webhook: `https://your-domain.com/api/webhook/n8n/callback`
  - Update all webhook nodes in your N8N workflows
  - Ensure webhook secret matches environment variable

- [ ] **Test N8N Connection**:
  ```bash
  curl -X POST https://your-domain.com/api/webhook/n8n/callback \
    -H "Content-Type: application/json" \
    -H "X-Signature: test-signature" \
    -H "X-Timestamp: $(date +%s)" \
    -d '{"test": "connection"}'
  ```

### 5. Platform API Setup

#### Instagram Business API
- [ ] Facebook App created and configured
- [ ] Instagram Business Account connected
- [ ] Graph API permissions obtained
- [ ] Test publishing with sample content

#### LinkedIn API
- [ ] LinkedIn App created
- [ ] OAuth flow configured
- [ ] Publishing permissions granted
- [ ] Test connection and posting

#### TikTok API (Future)
- [ ] TikTok for Business API access requested
- [ ] Development credentials obtained

## 🧪 Testing Checklist

### Core Functionality Tests

#### 1. File Upload Test
- [ ] Navigate to `/content/assets`
- [ ] Click "Create Asset" 
- [ ] Upload image/video files
- [ ] Verify files appear in Supabase Storage `assets` bucket
- [ ] Check asset appears in assets table

#### 2. Asset Management Test  
- [ ] Create multiple assets with different types (reel, carousel, image)
- [ ] Edit asset title and description
- [ ] Preview assets in modal
- [ ] Verify asset status updates

#### 3. Publishing Test
- [ ] Create test asset
- [ ] Add publishing destinations
- [ ] Test manual publishing
- [ ] Verify N8N workflow triggers
- [ ] Check workflow execution status

#### 4. Batch Operations Test
- [ ] Select multiple assets
- [ ] Test batch publishing
- [ ] Verify staggered scheduling
- [ ] Monitor progress tracking

#### 5. Dashboard Test
- [ ] View Overview tab with KPIs
- [ ] Check Publishing Workflows tab
- [ ] Verify real-time status updates
- [ ] Test time period filters

#### 6. Caption Templates Test
- [ ] Access template management
- [ ] Create new caption template
- [ ] Test template rendering with variables
- [ ] Preview platform-specific captions

## 🔧 Production Configuration

### Performance Optimization
- [ ] Enable Supabase connection pooling
- [ ] Configure CDN for file uploads
- [ ] Set up proper caching headers
- [ ] Monitor API rate limits

### Security Configuration
- [ ] Enable HTTPS everywhere
- [ ] Configure proper CORS settings
- [ ] Secure webhook endpoints with HMAC
- [ ] Set up proper RLS policies
- [ ] Enable audit logging

### Monitoring Setup
- [ ] Configure error tracking (Sentry/LogRocket)
- [ ] Set up performance monitoring
- [ ] Create health check endpoints
- [ ] Configure alerting for failures

## 📊 Verification Commands

### Database Verification
```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('assets', 'events', 'workflow_executions', 'caption_templates');

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('assets', 'events', 'workflow_executions');

-- Check default caption templates
SELECT name, platform, content_type 
FROM caption_templates 
WHERE is_active = true;
```

### Storage Verification
```sql
-- Check storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'assets';

-- List storage policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects';
```

### Application Health Check
```bash
# Test main routes
curl https://your-domain.com/content
curl https://your-domain.com/content/assets

# Test API endpoints
curl https://your-domain.com/api/publish/test-asset-id

# Check webhook endpoint
curl -X POST https://your-domain.com/api/webhook/n8n/callback \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 🎯 Post-Deployment Tasks

### 1. Create Admin User
- [ ] Sign up first user through app
- [ ] Update user profile to admin role:
  ```sql
  UPDATE user_profiles 
  SET app_role = 'admin' 
  WHERE user_id = 'your-user-uuid';
  ```

### 2. Configure Social Media Accounts
- [ ] Add Instagram Business accounts
- [ ] Connect LinkedIn company pages
- [ ] Test publishing to each platform

### 3. Set Up Content Templates
- [ ] Create platform-specific caption templates
- [ ] Test template rendering
- [ ] Configure default templates for team

### 4. N8N Workflow Integration
- [ ] Update N8N workflows with production URLs
- [ ] Test end-to-end publishing flow
- [ ] Verify webhook callbacks work correctly

## 🚨 Troubleshooting

### Common Issues

#### White Screen / React Errors
- Check browser console for JavaScript errors
- Verify all environment variables are set
- Ensure Supabase connection is working

#### File Upload Failures
- Verify storage bucket exists and is configured
- Check RLS policies on storage.objects
- Confirm file size and type restrictions

#### Publishing Failures
- Verify platform API credentials
- Check webhook secret configuration
- Monitor N8N workflow execution logs

#### Database Connection Issues
- Confirm Supabase URL and keys
- Verify RLS policies don't block access
- Check user permissions and roles

### Debug Commands
```bash
# Check environment variables
npm run env:check

# Test database connection
npm run db:test

# Verify API endpoints
npm run api:test

# Run full test suite
npm run test:integration
```

## ✅ Final Verification

Before going live:
- [ ] All core features tested and working
- [ ] Database migration applied successfully
- [ ] File uploads working to Supabase Storage
- [ ] N8N workflows connecting properly
- [ ] Social media publishing tested
- [ ] Security measures in place
- [ ] Monitoring and alerting configured
- [ ] Team trained on new system

## 🎉 Go Live!

Once all checklist items are complete:
1. Deploy to production environment
2. Update DNS/domain settings
3. Monitor system closely for first 24 hours
4. Gather user feedback
5. Iterate and improve based on usage

---

**Need Help?** 
- Check the `CONTENT_ENGINE_SETUP.md` for detailed technical setup
- Review component documentation in `/src/components/content-engine/`
- Monitor logs and error tracking for issues