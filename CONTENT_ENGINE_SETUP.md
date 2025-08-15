# Zavala AI Content Engine - Setup Guide

## Overview

The Zavala AI Content Engine is a sophisticated content management and publishing platform that integrates with N8N workflows for automated social media publishing. Based on the workflow from `misterzavala/nci-001`, this system provides a complete solution for managing and distributing content across multiple social media platforms.

## Architecture

### Core Components

1. **Event-Driven Architecture**: Append-only event sourcing for complete audit trails
2. **Multi-Platform Publishing**: Instagram, TikTok, LinkedIn, Facebook, YouTube support
3. **N8N Workflow Integration**: Automated publishing workflows
4. **Caption Rendering**: Template-based caption generation
5. **Scheduling System**: Collision detection and smart scheduling
6. **Security Layer**: HMAC request signing and validation

### Database Schema

The system uses an enhanced database schema with the following key tables:

- `assets`: Core content assets with workflow state machine
- `events`: Append-only event log for complete audit trail
- `workflow_executions`: N8N workflow execution tracking
- `caption_templates`: Template-based caption generation
- `publishing_schedule`: Smart scheduling with collision detection
- `webhook_configs`: Secure webhook management

## Setup Instructions

### 1. Database Migration

Apply the database migrations to your Supabase instance:

```sql
-- Apply main content management schema
-- File: supabase/migrations/20250814000001_integrate_content_management.sql

-- Apply event-driven architecture enhancement
-- File: supabase/migrations/20250814000002_add_event_driven_architecture.sql
```

### 2. Supabase Storage Setup

Create a storage bucket for file uploads:

1. Go to Supabase Dashboard > Storage
2. Create a new bucket named `assets`
3. Set the bucket to public if you want direct file access
4. Configure RLS policies as needed

### 3. Environment Variables

Add the following environment variables to your `.env.local`:

```env
# N8N Integration
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_WEBHOOK_SECRET=your-secure-webhook-secret

# Social Media API Keys
NEXT_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Security
WEBHOOK_SIGNING_SECRET=your-secure-signing-secret
```

### 4. N8N Workflow Configuration

Configure your N8N instance with the workflows from the repository:

1. Import the workflow from `WF - fullengine - 250814-013641.txt`
2. Configure webhook endpoints to point to your platform:
   - Webhook URL: `https://your-domain.com/api/webhook/n8n/callback`
   - Secret: Use the same secret from your environment variables
3. Set up the required N8N nodes for each platform

### 5. Platform API Setup

#### Instagram (Meta Business)
1. Create a Facebook App at developers.facebook.com
2. Add Instagram Basic Display and Instagram Graph API products
3. Configure webhook endpoints for real-time updates
4. Obtain necessary permissions for publishing

#### LinkedIn
1. Create a LinkedIn App at developer.linkedin.com
2. Request publishing permissions
3. Configure OAuth redirect URLs
4. Set up webhook endpoints

#### TikTok
1. Apply for TikTok for Business API access
2. Configure OAuth and webhook settings
3. Obtain content publishing permissions

## Usage Guide

### Creating and Publishing Content

1. **Create Asset**: Use the Create Asset modal to upload media and set basic information
2. **Configure Destinations**: Set up publishing destinations for each platform
3. **Generate Captions**: Use template-based caption generation
4. **Schedule or Publish**: Either schedule for later or publish immediately

### N8N Workflow Triggers

The system can trigger N8N workflows in several ways:

```typescript
// Trigger a publishing workflow
const executionId = await n8nService.triggerWorkflow(
  assetId, 
  'publish_reel', 
  {
    destinations: ['dest-1', 'dest-2'],
    scheduledTime: '2025-08-15T10:00:00Z',
    priority: 1
  }
)
```

### Manual Publishing

For direct publishing without N8N:

```typescript
// Direct platform publishing
const result = await multiPlatformPublisher.publishToPlatform({
  assetId: 'asset-123',
  destinationId: 'dest-456',
  mediaUrls: 'https://storage.url/video.mp4',
  contentType: 'reel',
  caption: 'Generated caption text'
})
```

### Caption Generation

Use the caption rendering service for platform-specific captions:

```typescript
// Generate caption from template
const rendered = await captionRenderer.renderCaption(
  templateId,
  {
    asset: assetData,
    creator: { name: 'Creator Name' },
    business: { name: 'Wholesale Mastery' }
  },
  'instagram'
)
```

## API Endpoints

### Publishing
- `POST /api/publish/[assetId]` - Publish an asset
- `GET /api/publish/[assetId]` - Get publishing status

### Webhooks
- `POST /api/webhook/n8n/callback` - N8N workflow callbacks

### Example API Usage

```javascript
// Publish an asset via N8N workflow
const response = await fetch('/api/publish/asset-123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    publishMethod: 'n8n',
    destinations: ['instagram-dest', 'tiktok-dest'],
    scheduledTime: '2025-08-15T15:00:00Z'
  })
})

// Check publishing status
const status = await fetch('/api/publish/asset-123')
const data = await status.json()
```

## Workflow States

The system implements a comprehensive state machine:

1. **draft** → **reviewing** → **ready** → **queued** → **publishing** → **published**
2. **failed** (from any state)
3. **archived** (final state)

Each state transition creates an event in the events table for complete audit trails.

## Security Features

### HMAC Request Signing
All webhook communications use HMAC-SHA256 signing:

```typescript
// Generate signed request headers
const headers = securityService.generateRequestHeaders(
  JSON.stringify(payload),
  webhookSecret
)
```

### Rate Limiting
Built-in rate limiting prevents API abuse:

```typescript
const rateLimit = securityService.checkRateLimit(clientIP, 100, 15)
if (!rateLimit.allowed) {
  // Handle rate limit exceeded
}
```

## Monitoring and Analytics

### Event Tracking
All system events are tracked in the events table:

```sql
-- Get asset publishing history
SELECT * FROM events 
WHERE entity_type = 'asset' 
AND entity_id = 'asset-123'
ORDER BY created_at DESC;
```

### Workflow Monitoring
Monitor N8N workflow executions:

```sql
-- Get workflow execution status
SELECT * FROM workflow_executions 
WHERE asset_id = 'asset-123'
ORDER BY started_at DESC;
```

## Troubleshooting

### Common Issues

1. **White Screen**: Check browser console for JavaScript errors
2. **Upload Failures**: Ensure Supabase storage bucket is configured
3. **Publishing Failures**: Verify platform API credentials and permissions
4. **Webhook Failures**: Check HMAC signatures and endpoint configurations

### Debug Mode

Enable detailed logging by setting:
```env
DEBUG_MODE=true
LOG_LEVEL=debug
```

## Platform-Specific Notes

### Instagram
- Requires Business or Creator account
- Video uploads require processing time
- Stories have different API endpoints

### TikTok
- Limited API access (application required)
- Different content guidelines
- Hashtag optimization important

### LinkedIn
- Professional content focus
- Different image size requirements
- Limited hashtag usage

## Future Enhancements

1. **AI-Powered Caption Generation**: Integration with OpenAI/Claude for dynamic captions
2. **Advanced Scheduling**: Optimal posting time recommendations
3. **Analytics Dashboard**: Comprehensive performance metrics
4. **Bulk Operations**: Mass upload and publishing tools
5. **Content Templates**: Pre-defined content structures

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review event logs in the database
3. Check N8N workflow execution logs
4. Contact the development team

---

This content engine provides a complete solution for automated social media content management and publishing, integrating seamlessly with your existing N8N workflows and providing the foundation for scalable content operations.