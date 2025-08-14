# Zavala AI Content Engine & Deal Tracking Platform

A unified business platform combining real estate deal tracking with advanced AI-powered content management and multi-platform publishing automation.

## Platform Overview

This application provides a comprehensive solution for real estate professionals to:
- **Track and manage deals** through a complete pipeline
- **Create and publish content** across multiple social media platforms  
- **Automate publishing workflows** using N8N integration
- **Monitor performance** through real-time dashboards and analytics

## 🚀 Key Features

### 🎯 Content Engine (Zavala AI)
- **Multi-Platform Publishing**: Instagram, LinkedIn, Facebook, YouTube, TikTok
- **N8N Workflow Integration**: Automated content publishing via webhook triggers
- **AI Caption Generation**: Platform-specific caption optimization and templates
- **Batch Publishing**: Schedule and publish multiple assets with collision detection
- **Real-time Monitoring**: Live workflow status tracking and execution monitoring
- **Event-Driven Architecture**: Append-only event sourcing for complete audit trails

### 🏘️ Deal Tracking System
- **Complete Pipeline Management**: 8-stage deal progression from lead to closing
- **Interactive Dashboard**: Customizable card-based layout with drag-and-drop
- **Performance Analytics**: Revenue tracking, partnership metrics, activity monitoring
- **Enhanced Timeline**: Visual deal progression with interactive status stepper
- **Mobile Optimized**: Responsive design for all devices

### 🔧 Technical Architecture
- **Event Sourcing**: All actions recorded as immutable events
- **Webhook Security**: HMAC signature verification for N8N callbacks
- **Real-time Updates**: Live data synchronization across all components
- **Platform Abstraction**: Unified publishing interface for multiple social platforms
- **Row Level Security**: Database-level security policies and access control

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** + **shadcn/ui** for modern UI components
- **React Query** for efficient data fetching and caching
- **React Router v6** for client-side routing

### Backend & Database
- **Supabase** (PostgreSQL) with real-time subscriptions
- **Row Level Security (RLS)** for data protection
- **Event-driven architecture** with append-only event logs
- **Automated triggers** for event sourcing and audit trails

### Integrations
- **N8N Workflows** for automated content publishing
- **Instagram Graph API** for Instagram publishing
- **LinkedIn API** for professional content sharing
- **Facebook Graph API** for Facebook page management
- **YouTube Data API** for video content publishing

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                          # shadcn/ui base components
│   ├── content-engine/              # Content management components
│   │   ├── assets/                  # Asset management (upload, preview, edit)
│   │   ├── batch/                   # Batch publishing operations
│   │   ├── dashboard/               # Real-time monitoring dashboard
│   │   ├── layout/                  # Content engine layout components
│   │   └── templates/               # Caption template management
│   └── deal-tracking/               # Deal management components
├── services/
│   ├── n8n-integration.ts           # N8N webhook integration
│   ├── platform-publisher.ts       # Multi-platform publishing abstraction
│   ├── instagram-api.ts            # Instagram Graph API implementation
│   ├── caption-renderer.ts         # Caption generation and templates
│   └── security.ts                 # HMAC signing and verification
├── pages/
│   ├── content-engine/              # Content management pages
│   ├── api/                         # API routes for webhooks
│   ├── deal-tracking/               # Deal management pages
│   └── Index.tsx                    # Unified dashboard homepage
├── integrations/
│   └── supabase/
│       ├── client.ts                # Supabase configuration
│       ├── types.ts                 # Generated database types
│       └── types-enhanced.ts        # Extended types for content engine
└── scripts/
    ├── apply-migrations.ts          # Database migration utilities
    ├── direct-migration.sql         # Production-ready migration
    └── setup-storage.ts             # Supabase storage configuration
```

## 💾 Database Schema

### Core Tables

#### Content Engine
- **`assets`**: Media files, metadata, and publishing status
- **`events`**: Event sourcing log for all platform actions
- **`workflow_executions`**: N8N workflow tracking and status
- **`caption_templates`**: Platform-specific caption templates
- **`platform_accounts`**: Connected social media accounts
- **`publishing_schedules`**: Scheduled content publishing queue

#### Deal Tracking
- **`deals`**: Deal lifecycle and property information
- **`card_preferences`**: Dashboard customization settings

#### Event Types
- `asset.created`, `asset.updated`, `workflow.triggered`
- `publishing.scheduled`, `publishing.completed`, `publishing.failed`
- `caption.generated`, `template.applied`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- N8N instance (for workflow automation)

### Installation

1. **Clone and Install**
```bash
git clone https://github.com/misterzavala/jv-foundations.git
cd jv-foundations
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
```

Required environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
VITE_N8N_WEBHOOK_SECRET=your_webhook_secret
```

3. **Database Setup**
```bash
# Apply all migrations to your Supabase instance
npm run apply-migrations

# Or run the direct migration script in Supabase SQL Editor
# Copy contents from: scripts/direct-migration.sql
```

4. **Development Server**
```bash
npm run dev
```

Access the platform at `http://localhost:8082`

## 🔗 N8N Integration Setup

### Webhook Endpoints
Configure these webhook URLs in your N8N workflows:

- **Content Publishing**: `https://your-domain.vercel.app/api/webhook/n8n/callback`
- **Status Updates**: `https://your-domain.vercel.app/api/publish/[assetId]`

### Workflow Types
- `instagram_post` - Single Instagram post
- `instagram_story` - Instagram story publishing  
- `linkedin_post` - LinkedIn professional content
- `facebook_post` - Facebook page posting
- `youtube_video` - YouTube video upload
- `multi_platform` - Cross-platform publishing

### Security
All webhooks use HMAC-SHA256 signature verification for security.

## 📱 Platform Features

### Content Engine Dashboard
- Real-time workflow monitoring
- Publishing success rates and analytics
- Asset library with search and filtering
- Batch publishing operations
- Caption template management

### Deal Tracking Dashboard  
- Interactive deal pipeline visualization
- Customizable card layout with preferences
- Partnership performance analytics
- Revenue tracking and reporting

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

### Supabase Production Setup
1. Create production Supabase project
2. Run migration: `scripts/direct-migration.sql`
3. Configure RLS policies and storage buckets
4. Update environment variables

### N8N Workflow Setup
1. Import workflows from `misterzavala/nci-001`
2. Configure webhook endpoints and secrets
3. Set up social media API credentials in N8N
4. Test webhook connections

## 🔒 Security Features

- **HMAC Webhook Verification**: All N8N callbacks verified
- **Row Level Security**: Database-level access control
- **Event Sourcing**: Complete audit trail of all actions
- **Secure Credential Storage**: API keys stored securely in N8N
- **Environment Variable Protection**: No secrets in frontend code

## 📊 Monitoring & Analytics

- Real-time workflow execution status
- Publishing success/failure rates
- Platform-specific engagement metrics
- Deal pipeline conversion tracking
- System performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

---

## 🆘 Support

For technical support:
- Check the troubleshooting guides in `/docs`
- Review the operation audit logs
- Contact the development team

**Built with ❤️ using React, TypeScript, Supabase, and N8N automation**

---

*Last updated: August 2025 - Zavala AI Content Engine v2.0*