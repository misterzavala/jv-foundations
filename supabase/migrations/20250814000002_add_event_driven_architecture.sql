-- Event-Driven Architecture for Content Publishing
-- Based on N8N workflow requirements
-- Created: 2025-08-14

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
    sequence_number BIGSERIAL,
    
    -- Index for efficient querying
    INDEX idx_events_entity (entity_type, entity_id),
    INDEX idx_events_type (event_type),
    INDEX idx_events_created_at (created_at),
    INDEX idx_events_sequence (sequence_number)
);

-- ============================================================================
-- ENHANCED ASSET STATUS MANAGEMENT
-- ============================================================================

-- Update assets table to support the full state machine
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_status_check 
    CHECK (status IN ('draft', 'reviewing', 'ready', 'queued', 'publishing', 'published', 'failed', 'archived'));

-- Add workflow tracking fields
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS workflow_id UUID;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS n8n_execution_id TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS preflight_checks JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- PUBLISHING DESTINATIONS ENHANCEMENT
-- ============================================================================

-- Enhance destinations with more detailed status tracking
ALTER TABLE public.asset_destinations DROP CONSTRAINT IF EXISTS asset_destinations_status_check;
ALTER TABLE public.asset_destinations ADD CONSTRAINT asset_destinations_status_check 
    CHECK (status IN ('draft', 'ready', 'queued', 'publishing', 'published', 'failed', 'cancelled'));

-- Add platform-specific fields
ALTER TABLE public.asset_destinations ADD COLUMN IF NOT EXISTS platform_post_id TEXT;
ALTER TABLE public.asset_destinations ADD COLUMN IF NOT EXISTS platform_response JSONB;
ALTER TABLE public.asset_destinations ADD COLUMN IF NOT EXISTS publishing_attempts INTEGER DEFAULT 0;
ALTER TABLE public.asset_destinations ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- ============================================================================
-- WORKFLOW EXECUTION TRACKING
-- ============================================================================

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
    duration_ms INTEGER,
    
    INDEX idx_workflow_executions_asset (asset_id),
    INDEX idx_workflow_executions_status (status),
    INDEX idx_workflow_executions_type (workflow_type)
);

-- ============================================================================
-- CONTENT RENDERING AND PROCESSING
-- ============================================================================

-- Beat markers for video content (used in reel processing)
CREATE TABLE IF NOT EXISTS public.beat_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    timestamp_ms INTEGER NOT NULL,
    marker_type TEXT NOT NULL CHECK (marker_type IN ('beat', 'cut', 'highlight', 'text_overlay')),
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_beat_markers_asset (asset_id),
    INDEX idx_beat_markers_timestamp (timestamp_ms)
);

-- Caption templates and rendering
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

-- Rendered captions for each destination
CREATE TABLE IF NOT EXISTS public.rendered_captions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID REFERENCES public.asset_destinations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.caption_templates(id) ON DELETE SET NULL,
    rendered_text TEXT NOT NULL,
    hashtags TEXT[],
    mentions TEXT[],
    character_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_rendered_captions_destination (destination_id)
);

-- ============================================================================
-- SCHEDULING AND COLLISION DETECTION
-- ============================================================================

-- Publishing schedule with collision detection
CREATE TABLE IF NOT EXISTS public.publishing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    time_slot_duration INTEGER DEFAULT 15, -- minutes
    priority INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent scheduling conflicts
    CONSTRAINT unique_account_time_slot 
        UNIQUE (account_id, scheduled_time),
        
    INDEX idx_publishing_schedule_account (account_id),
    INDEX idx_publishing_schedule_time (scheduled_time),
    INDEX idx_publishing_schedule_asset (asset_id)
);

-- ============================================================================
-- WEBHOOK AND API INTEGRATION
-- ============================================================================

-- Webhook configurations for N8N integration
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_webhook_deliveries_config (webhook_config_id),
    INDEX idx_webhook_deliveries_status (status)
);

-- ============================================================================
-- TRIGGERS FOR EVENT SOURCING
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

-- Function to create destination events
CREATE OR REPLACE FUNCTION create_destination_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.events (entity_type, entity_id, event_type, event_data)
        VALUES ('destination', NEW.id, 'destination_created', row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO public.events (entity_type, entity_id, event_type, event_data)
        VALUES ('destination', NEW.id, 'destination_status_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'destination_data', row_to_json(NEW)::jsonb
            ));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS destination_events_trigger ON public.asset_destinations;
CREATE TRIGGER destination_events_trigger
    AFTER INSERT OR UPDATE ON public.asset_destinations
    FOR EACH ROW EXECUTE FUNCTION create_destination_event();

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caption_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendered_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view events for their assets" ON public.events
    FOR SELECT USING (
        entity_type = 'asset' AND EXISTS (
            SELECT 1 FROM public.assets WHERE id = events.entity_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Staff can view all events" ON public.events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND app_role IN ('admin', 'staff')
        )
    );

-- Workflow executions policies
CREATE POLICY "Users can view workflow executions for their assets" ON public.workflow_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assets 
            WHERE id = workflow_executions.asset_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Staff can view all workflow executions" ON public.workflow_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND app_role IN ('admin', 'staff')
        )
    );

-- Caption templates policies (staff only for management)
CREATE POLICY "Staff can manage caption templates" ON public.caption_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND app_role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Everyone can view active caption templates" ON public.caption_templates
    FOR SELECT USING (is_active = true);

-- Webhook configs (admin only)
CREATE POLICY "Admin can manage webhook configs" ON public.webhook_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND app_role = 'admin'
        )
    );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get asset state from events
CREATE OR REPLACE FUNCTION get_asset_state(asset_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_object_agg(event_type, event_data ORDER BY created_at DESC)
    INTO result
    FROM public.events
    WHERE entity_type = 'asset' AND entity_id = asset_uuid;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check scheduling conflicts
CREATE OR REPLACE FUNCTION check_scheduling_conflict(
    account_uuid UUID,
    scheduled_time TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO conflict_count
    FROM public.publishing_schedule
    WHERE account_id = account_uuid
    AND scheduled_time BETWEEN 
        scheduled_time - (duration_minutes || ' minutes')::INTERVAL
        AND scheduled_time + (duration_minutes || ' minutes')::INTERVAL;
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;