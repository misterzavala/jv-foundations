-- ============================================================================
-- FIXED PRODUCTION MIGRATION - ZAVALA AI CONTENT ENGINE
-- ============================================================================
-- IMPORTANT: This version fixes data type compatibility issues
-- Run this in your Supabase SQL Editor instead of PRODUCTION_MIGRATION.sql

-- Enable required extensions (safe to re-run)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CHECK EXISTING SCHEMA FIRST
-- ============================================================================

-- Let's check the actual data types in existing tables
DO $$
DECLARE
    accounts_id_type text;
    assets_id_type text;
BEGIN
    -- Check accounts table id type
    SELECT data_type INTO accounts_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'accounts' 
    AND column_name = 'id';
    
    -- Check assets table id type  
    SELECT data_type INTO assets_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assets' 
    AND column_name = 'id';
    
    RAISE NOTICE 'accounts.id type: %', COALESCE(accounts_id_type, 'TABLE_NOT_FOUND');
    RAISE NOTICE 'assets.id type: %', COALESCE(assets_id_type, 'TABLE_NOT_FOUND');
END $$;

-- ============================================================================
-- COMPATIBLE TABLE DEFINITIONS
-- ============================================================================

-- Workflow execution tracking (using compatible types)
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id TEXT, -- Changed from UUID to TEXT for compatibility
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

-- Rendered captions (no foreign key constraint issues here)
CREATE TABLE IF NOT EXISTS public.rendered_captions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID, -- Will add FK constraint after checking compatibility
    template_id UUID REFERENCES public.caption_templates(id) ON DELETE SET NULL,
    rendered_text TEXT NOT NULL,
    hashtags TEXT[],
    mentions TEXT[],
    character_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publishing schedule with compatible account_id type
CREATE TABLE IF NOT EXISTS public.publishing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id TEXT, -- Changed from UUID to TEXT for compatibility
    asset_id TEXT,   -- Changed from UUID to TEXT for compatibility
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

-- Webhook delivery log (will handle events FK separately)
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_config_id UUID REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
    event_id UUID, -- Will add FK constraint after checking compatibility
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
-- ADD FOREIGN KEY CONSTRAINTS (AFTER CHECKING COMPATIBILITY)
-- ============================================================================

-- Add FK constraints only if compatible types exist
DO $$
DECLARE
    accounts_exists boolean;
    assets_exists boolean;
    events_exists boolean;
    asset_destinations_exists boolean;
BEGIN
    -- Check if referenced tables exist
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') INTO accounts_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') INTO assets_exists;  
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') INTO events_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'asset_destinations') INTO asset_destinations_exists;
    
    -- Add FK constraints if tables exist
    IF accounts_exists THEN
        BEGIN
            ALTER TABLE public.publishing_schedule 
            ADD CONSTRAINT publishing_schedule_account_id_fkey 
            FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added FK constraint: publishing_schedule -> accounts';
        EXCEPTION 
            WHEN others THEN 
                RAISE NOTICE '⚠️ Could not add FK constraint publishing_schedule -> accounts: %', SQLERRM;
        END;
    END IF;
    
    IF assets_exists THEN
        BEGIN
            ALTER TABLE public.workflow_executions 
            ADD CONSTRAINT workflow_executions_asset_id_fkey 
            FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added FK constraint: workflow_executions -> assets';
        EXCEPTION 
            WHEN others THEN 
                RAISE NOTICE '⚠️ Could not add FK constraint workflow_executions -> assets: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE public.publishing_schedule 
            ADD CONSTRAINT publishing_schedule_asset_id_fkey 
            FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added FK constraint: publishing_schedule -> assets';
        EXCEPTION 
            WHEN others THEN 
                RAISE NOTICE '⚠️ Could not add FK constraint publishing_schedule -> assets: %', SQLERRM;
        END;
    END IF;
    
    IF events_exists THEN
        BEGIN
            ALTER TABLE public.webhook_deliveries 
            ADD CONSTRAINT webhook_deliveries_event_id_fkey 
            FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added FK constraint: webhook_deliveries -> events';
        EXCEPTION 
            WHEN others THEN 
                RAISE NOTICE '⚠️ Could not add FK constraint webhook_deliveries -> events: %', SQLERRM;
        END;
    END IF;
    
    IF asset_destinations_exists THEN
        BEGIN
            ALTER TABLE public.rendered_captions 
            ADD CONSTRAINT rendered_captions_destination_id_fkey 
            FOREIGN KEY (destination_id) REFERENCES public.asset_destinations(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added FK constraint: rendered_captions -> asset_destinations';
        EXCEPTION 
            WHEN others THEN 
                RAISE NOTICE '⚠️ Could not add FK constraint rendered_captions -> asset_destinations: %', SQLERRM;
        END;
    END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES (Safe to re-run)
-- ============================================================================

-- Workflow executions indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_asset ON public.workflow_executions(asset_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_type ON public.workflow_executions(workflow_type);

-- Rendered captions indexes
CREATE INDEX IF NOT EXISTS idx_rendered_captions_destination ON public.rendered_captions(destination_id);

-- Publishing schedule indexes
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_account ON public.publishing_schedule(account_id);
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_time ON public.publishing_schedule(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_publishing_schedule_asset ON public.publishing_schedule(asset_id);

-- Webhook deliveries indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config ON public.webhook_deliveries(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caption_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendered_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Caption templates policies (drop and recreate to avoid conflicts)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Everyone can view active caption templates" ON public.caption_templates;
    DROP POLICY IF EXISTS "Staff can manage caption templates" ON public.caption_templates;
EXCEPTION 
    WHEN undefined_object THEN NULL;
END $$;

-- Create policies only if user_profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        CREATE POLICY "Everyone can view active caption templates" ON public.caption_templates
            FOR SELECT USING (is_active = true);

        CREATE POLICY "Staff can manage caption templates" ON public.caption_templates
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE user_id = auth.uid() AND app_role IN ('admin', 'staff')
                )
            );
        RAISE NOTICE '✅ Created RLS policies for caption_templates';
    ELSE
        RAISE NOTICE '⚠️ user_profiles table not found - skipping RLS policies';
    END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users and service role
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- ============================================================================
-- INSERT DEFAULT DATA (Only if not exists)
-- ============================================================================

-- Insert default caption templates
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

-- ============================================================================
-- FINAL SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 FIXED MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Tables created/updated: workflow_executions, caption_templates, rendered_captions, publishing_schedule, webhook_configs, webhook_deliveries';
    RAISE NOTICE 'Foreign key constraints added where compatible';
    RAISE NOTICE 'All existing data preserved - ready for Zavala AI Content Engine!';
END $$;
