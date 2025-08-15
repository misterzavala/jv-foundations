-- Direct SQL Migration Script
-- Run this directly in your Supabase SQL Editor
-- This combines both migration files into one executable script

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for app roles (staff vs partners)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'staff', 'partner', 'user');
    END IF;
END $$;

-- ============================================================================
-- CORE CONTENT MANAGEMENT TABLES
-- ============================================================================

-- Main assets table for content management
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('reel', 'carousel', 'single_image', 'story')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'ready', 'queued', 'publishing', 'published', 'failed', 'archived')),
    thumbnail_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    workflow_id UUID,
    n8n_execution_id TEXT,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    preflight_checks JSONB DEFAULT '{}'::jsonb
);

-- Accounts table for social media platforms
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'linkedin', 'facebook', 'youtube')),
    account_name TEXT NOT NULL,
    account_handle TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    account_metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset destinations for publishing
CREATE TABLE IF NOT EXISTS public.asset_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'queued', 'publishing', 'published', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    external_post_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    platform_post_id TEXT,
    platform_response JSONB,
    publishing_attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ
);

-- User profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    app_role app_role DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EVENT SOURCING TABLES
-- ============================================================================

-- Events table for append-only event sourcing
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('asset', 'destination', 'workflow')),
    entity_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sequence_number BIGSERIAL
);

-- Create indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_entity ON public.events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_sequence ON public.events(sequence_number);

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

-- Create indexes for workflow executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_asset ON public.workflow_executions(asset_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_type ON public.workflow_executions(workflow_type);

-- ============================================================================
-- CAPTION MANAGEMENT TABLES
-- ============================================================================

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

-- Create index for rendered captions
CREATE INDEX IF NOT EXISTS idx_rendered_captions_destination ON public.rendered_captions(destination_id);

-- ============================================================================
-- SCHEDULING AND WEBHOOK TABLES
-- ============================================================================

-- Publishing schedule with collision detection
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

-- Create indexes and constraints for publishing schedule
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_account ON public.publishing_schedule(account_id);
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_time ON public.publishing_schedule(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_asset ON public.publishing_schedule(asset_id);

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

-- Create indexes for webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config ON public.webhook_deliveries(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caption_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendered_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Assets policies
CREATE POLICY IF NOT EXISTS "Users can view own assets" ON public.assets
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "Users can create assets" ON public.assets
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "Users can update own assets" ON public.assets
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "Staff can view all assets" ON public.assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND app_role IN ('admin', 'staff')
        )
    );

-- Events policies
CREATE POLICY IF NOT EXISTS "Users can view events for their assets" ON public.events
    FOR SELECT USING (
        entity_type = 'asset' AND EXISTS (
            SELECT 1 FROM public.assets WHERE id = events.entity_id AND created_by = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Staff can view all events" ON public.events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND app_role IN ('admin', 'staff')
        )
    );

-- Caption templates policies
CREATE POLICY IF NOT EXISTS "Everyone can view active caption templates" ON public.caption_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Staff can manage caption templates" ON public.caption_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND app_role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to create events automatically
CREATE OR REPLACE FUNCTION create_asset_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert event for asset changes
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.events (entity_type, entity_id, event_type, event_data, created_by)
        VALUES ('asset', NEW.id, 'asset_created', row_to_json(NEW)::jsonb, NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only create event if status changed
        IF OLD.status != NEW.status THEN
            INSERT INTO public.events (entity_type, entity_id, event_type, event_data, created_by)
            VALUES ('asset', NEW.id, 'status_changed', 
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'asset_data', row_to_json(NEW)::jsonb
                ), 
                NEW.created_by);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS asset_events_trigger ON public.assets;
CREATE TRIGGER asset_events_trigger
    AFTER INSERT OR UPDATE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION create_asset_event();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS assets_updated_at ON public.assets;
CREATE TRIGGER assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS accounts_updated_at ON public.accounts;
CREATE TRIGGER accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS destinations_updated_at ON public.asset_destinations;
CREATE TRIGGER destinations_updated_at
    BEFORE UPDATE ON public.asset_destinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users and service role
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- ============================================================================
-- INSERT DEFAULT DATA
-- ============================================================================

-- Insert default caption templates
INSERT INTO public.caption_templates (name, template, platform, content_type, variables) 
VALUES 
    (
        'Real Estate Success - Instagram',
        '🏠 {{asset.title}}

{{asset.description}}

💰 Ready to start your real estate journey?
👉 Follow for more tips!

#RealEstate #Wholesale #Investment #Entrepreneur #Success #Motivation #RealEstateInvesting #WholesaleRealEstate #BusinessTips',
        'instagram',
        'reel',
        '[{"name": "asset.title", "type": "text", "required": true}, {"name": "asset.description", "type": "text", "required": false}]'::jsonb
    ),
    (
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
    ),
    (
        'Professional LinkedIn Post',
        '{{asset.title}}

{{asset.description}}

What''s your experience with real estate investing? Share your thoughts in the comments.

#RealEstate #Investment #ProfessionalDevelopment',
        'linkedin',
        'single_image',
        '[{"name": "asset.title", "type": "text", "required": true}, {"name": "asset.description", "type": "text", "required": true}]'::jsonb
    )
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set up Supabase Storage bucket named "assets"';
    RAISE NOTICE '2. Configure your environment variables';
    RAISE NOTICE '3. Test file uploads and publishing workflows';
END $$;