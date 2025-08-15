-- ============================================================================
-- SIMPLE PRODUCTION MIGRATION - ZAVALA AI CONTENT ENGINE
-- ============================================================================
-- Run this in Supabase SQL Editor - simplified version without IF NOT EXISTS

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE MISSING TABLES
-- ============================================================================

-- Workflow execution tracking
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('publish_reel', 'publish_carousel', 'schedule_post', 'batch_publish')),
    n8n_execution_id TEXT,
    status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'running', 'completed', 'failed', 'cancelled')),
    input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    error_details TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

-- Caption templates
CREATE TABLE IF NOT EXISTS public.caption_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    platform TEXT CHECK (platform IN ('instagram', 'tiktok', 'linkedin', 'facebook', 'youtube')),
    content_type TEXT CHECK (content_type IN ('reel', 'carousel', 'single_image', 'story')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rendered captions
CREATE TABLE IF NOT EXISTS public.rendered_captions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID REFERENCES public.asset_destinations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.caption_templates(id) ON DELETE SET NULL,
    rendered_text TEXT NOT NULL,
    hashtags TEXT[],
    mentions TEXT[],
    character_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publishing schedule
CREATE TABLE IF NOT EXISTS public.publishing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    time_slot_duration INTEGER DEFAULT 15,
    priority INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook configurations
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    event_types TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    headers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_config_id UUID REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    http_status INTEGER,
    request_payload JSONB,
    response_body TEXT,
    delivery_attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workflow_executions_asset ON public.workflow_executions(asset_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_type ON public.workflow_executions(workflow_type);
CREATE INDEX IF NOT EXISTS idx_rendered_captions_destination ON public.rendered_captions(destination_id);
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_account ON public.publishing_schedule(account_id);
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_time ON public.publishing_schedule(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_asset ON public.publishing_schedule(asset_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config ON public.webhook_deliveries(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caption_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendered_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- ============================================================================
-- INSERT DEFAULT CAPTION TEMPLATES
-- ============================================================================

INSERT INTO public.caption_templates (name, template, platform, content_type, variables) 
SELECT 
    'Real Estate Success - Instagram',
    '🏠 {{asset.title}}

{{asset.description}}

💰 Ready to start your real estate journey?
👉 Follow for more tips!

#RealEstate #Wholesale #Investment #Entrepreneur #Success #Motivation #RealEstateInvesting #WholesaleRealEstate #BusinessTips',
    'instagram',
    'reel',
    '[{"name": "asset.title", "type": "text", "required": true}, {"name": "asset.description", "type": "text", "required": false}]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.caption_templates 
    WHERE name = 'Real Estate Success - Instagram'
);

INSERT INTO public.caption_templates (name, template, platform, content_type, variables) 
SELECT 
    'Educational Hook - TikTok',
    '🔥 {{asset.title}}

Here''s what most people don''t know:

{{asset.description}}

💡 Want to learn more strategies like this?
📱 Comment "INFO" below!

#RealEstate #WholesaleStrategy #Education #RealEstateTips #Investing #fyp #viral',
    'tiktok',
    'reel',
    '[{"name": "asset.title", "type": "text", "required": true}, {"name": "asset.description", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.caption_templates 
    WHERE name = 'Educational Hook - TikTok'
);

INSERT INTO public.caption_templates (name, template, platform, content_type, variables) 
SELECT 
    'Professional LinkedIn Post',
    '{{asset.title}}

{{asset.description}}

What''s your experience with real estate investing? Share your thoughts in the comments.

#RealEstate #Investment #ProfessionalDevelopment',
    'linkedin',
    'single_image',
    '[{"name": "asset.title", "type": "text", "required": true}, {"name": "asset.description", "type": "text", "required": true}]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.caption_templates 
    WHERE name = 'Professional LinkedIn Post'
);

-- Success message
SELECT '✅ Simple migration completed successfully! Tables created and data preserved.' as result;