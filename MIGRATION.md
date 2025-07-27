
# Project Migration Guide

This guide provides step-by-step instructions for migrating this Deal Tracking Dashboard project to a new GitHub repository.

## Overview

This project is a React-based dashboard application with Supabase backend integration. The migration process involves transferring code, database schema, environment configuration, and deployment settings.

## Pre-Migration Checklist

- [ ] Ensure all changes are committed to the current repository
- [ ] Verify all team members have necessary access
- [ ] Document any custom deployment configurations
- [ ] Export database schema and data if needed
- [ ] Note any external integrations or API keys

## Migration Steps

### 1. Repository Setup

#### Create New Repository
```bash
# On GitHub, create a new repository
# Choose appropriate visibility (private/public)
# Initialize with README if desired
```

#### Clone New Repository
```bash
git clone <new-repository-url>
cd <new-repository-name>
```

### 2. Code Transfer

#### Option A: Direct Copy
```bash
# Copy all files from old project to new repository
cp -r <old-project-path>/* <new-project-path>/
```

#### Option B: Git Migration (Preserves History)
```bash
# Clone old repository
git clone <old-repository-url> temp-migration
cd temp-migration

# Add new remote
git remote add new-origin <new-repository-url>

# Push to new repository
git push new-origin main
```

### 3. Environment Configuration

#### Copy Environment Template
```bash
cp .env.example .env.local
```

#### Update Environment Variables
Edit `.env.local` with your configuration:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Dependencies Installation

```bash
# Install Node.js dependencies
npm install

# Verify installation
npm run dev
```

### 5. Database Migration

#### Option A: New Supabase Project
1. Create new Supabase project
2. Run migration files in order:
   ```bash
   # Execute each file in supabase/migrations/ in chronological order
   ```

#### Option B: Export/Import Existing Database
```bash
# Export from old project (if using Supabase CLI)
supabase db dump -f backup.sql

# Import to new project
supabase db reset --file backup.sql
```

### 6. Supabase Configuration

#### Update Client Configuration
File: `src/integrations/supabase/client.ts`
```typescript
const SUPABASE_URL = "your_new_supabase_url";
const SUPABASE_PUBLISHABLE_KEY = "your_new_anon_key";
```

#### Run Database Migrations
Execute migrations in `supabase/migrations/` directory:
1. `20250609201510-b94bf651-85a1-4301-a95f-c39c9b92a474.sql`
2. `20250609213714-96308a69-b8e2-45c7-a3bb-740386335543.sql`
3. `20250609225336-348d765a-42ad-48cb-9382-80ab1438c58a.sql`
4. `20250609232035-40351b09-7431-4533-85ba-ff81d5103e65.sql`
5. `20250609235000_update_card_sizes.sql`

### 7. Project Configuration Updates

#### Update package.json
- Update project name
- Update repository URLs
- Update author information
- Update description

#### Update README.md
- Update repository URLs
- Update project-specific information
- Update team contact information

### 8. Deployment Setup

#### For Vercel:
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy

#### For Netlify:
1. Connect repository
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Set environment variables

#### For Custom Deployment:
1. Set up CI/CD pipeline
2. Configure environment variables
3. Set up domain and SSL

### 9. Testing Migration

#### Verify Functionality
- [ ] Application starts successfully (`npm run dev`)
- [ ] Database connections work
- [ ] All pages load correctly
- [ ] Dashboard cards display properly
- [ ] Deal tracking functionality works
- [ ] User preferences persist

#### Test Data Migration
- [ ] Existing deals display correctly
- [ ] Card preferences are maintained
- [ ] No data corruption

### 10. Post-Migration Tasks

#### Update Documentation
- [ ] Update API documentation
- [ ] Update deployment guides
- [ ] Update team onboarding docs

#### Notify Stakeholders
- [ ] Inform team of new repository URL
- [ ] Update bookmarks and shortcuts
- [ ] Update any automated systems

#### Archive Old Repository
- [ ] Archive old repository (don't delete immediately)
- [ ] Update old repository README with migration notice
- [ ] Redirect or update any external references

## Troubleshooting

### Common Issues

#### Environment Variables Not Loading
```bash
# Ensure .env.local is in root directory
# Check variable names match VITE_ prefix
# Restart development server
```

#### Database Connection Errors
- Verify Supabase URL and API key
- Check RLS policies are correctly applied
- Ensure migrations ran successfully

#### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build
```

#### Missing Dependencies
```bash
# Check for peer dependency warnings
npm audit
npm install --legacy-peer-deps
```

### Database Schema Verification

Run these queries to verify migration:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify card_preferences structure
\d card_preferences

-- Verify deals structure  
\d deals
```

## Rollback Plan

If migration fails:
1. Keep old repository active
2. Document issues encountered
3. Fix issues in staging environment
4. Retry migration process
5. Only archive old repository after successful verification

## Support

For migration assistance:
- Check project documentation
- Review error logs carefully
- Test in staging environment first
- Ensure all team members can access new repository

---

**Important**: Always test the migration in a staging environment before applying to production systems.
