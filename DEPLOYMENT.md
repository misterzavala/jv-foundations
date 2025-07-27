
# Deployment Guide

This guide covers deployment options for the Deal Tracking Dashboard project.

## Overview

The project is a static React application that can be deployed to various hosting platforms. It requires environment variables for Supabase integration.

## Deployment Platforms

### Vercel (Recommended)

#### Automatic Deployment
1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Deploy**
   - Click "Deploy"
   - Automatic deployments on push to main branch

#### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify

#### Via Git Integration
1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your repository

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**
   - Go to Site settings > Environment variables
   - Add Supabase credentials

#### Manual Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### AWS S3 + CloudFront

#### Setup S3 Bucket
```bash
# Create S3 bucket
aws s3 mb s3://your-bucket-name

# Configure for static website hosting
aws s3 website s3://your-bucket-name \
  --index-document index.html \
  --error-document index.html
```

#### Build and Upload
```bash
# Build project
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name
```

#### CloudFront Configuration
1. Create CloudFront distribution
2. Set origin to S3 bucket
3. Configure custom error pages for SPA routing
4. Set up SSL certificate

### GitHub Pages

#### Setup
1. **Enable GitHub Pages**
   - Go to repository Settings
   - Pages section
   - Source: GitHub Actions

2. **Create GitHub Action**
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

3. **Set Secrets**
   - Go to repository Settings > Secrets
   - Add Supabase environment variables

## Environment Variables

### Required Variables
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Platform-Specific Setup

#### Vercel
- Dashboard: Project Settings > Environment Variables
- CLI: `vercel env add`

#### Netlify
- Dashboard: Site Settings > Environment Variables
- CLI: `netlify env:set`

#### AWS
- Use AWS Systems Manager Parameter Store
- Configure in build process or container

## Custom Domain Setup

### DNS Configuration
```
# A record
@ -> your-hosting-ip

# CNAME record  
www -> your-app.vercel.app
```

### SSL Certificate
Most platforms provide automatic SSL:
- Vercel: Automatic
- Netlify: Automatic
- AWS: Use Certificate Manager

## Performance Optimization

### Build Optimization
```bash
# Analyze bundle size
npm run build -- --analyze

# Environment-specific builds
NODE_ENV=production npm run build
```

### CDN Configuration
- Enable compression (gzip/brotli)
- Set cache headers
- Configure static asset caching

### Supabase Optimization
- Enable connection pooling
- Configure row-level security
- Use database indexes appropriately

## Monitoring & Analytics

### Error Tracking
Consider integrating:
- Sentry
- LogRocket
- Bugsnag

### Performance Monitoring
- Google Analytics
- Vercel Analytics
- Web Vitals tracking

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run test
    - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run build
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

#### Environment Variable Issues
- Ensure variables start with `VITE_`
- Check variable names are exact match
- Verify values are correctly set in platform

#### Routing Issues (SPA)
Configure server to serve `index.html` for all routes:

**Netlify**: Create `_redirects`
```
/*    /index.html   200
```

**Vercel**: `vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Supabase Connection Issues
- Verify URL and API key
- Check RLS policies
- Ensure database is accessible

## Security Considerations

### Environment Variables
- Never commit `.env.local`
- Use platform-specific secret management
- Rotate keys regularly

### Content Security Policy
Add CSP headers:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

### HTTPS
- Always use HTTPS in production
- Configure HSTS headers
- Use secure cookie settings

---

For specific deployment issues, consult the platform documentation or contact support.
