-- Database Schema Unification Migration
-- Ensures all tables work together seamlessly for content engine and deal tracker
-- Created: 2025-08-15

-- ============================================================================
-- WORKFLOW EXECUTION TRACKING TABLE
-- ============================================================================

-- Create workflow_executions table if it doesn't exist (referenced in other code)
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('instagram_post', 'instagram_story', 'linkedin_post', 'facebook_post', 'youtube_video', 'multi_platform', 'custom')),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'deployed', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    workflow_data JSONB DEFAULT '{}',
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_details TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to workflow_executions if they don't exist
DO $$ 
BEGIN
    -- Add webhook_config_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_executions' AND column_name = 'webhook_config_id') THEN
        ALTER TABLE public.workflow_executions ADD COLUMN webhook_config_id UUID REFERENCES public.webhook_configs(id) ON DELETE SET NULL;
    END IF;
    
    -- Add security_metadata if not exists  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_executions' AND column_name = 'security_metadata') THEN
        ALTER TABLE public.workflow_executions ADD COLUMN security_metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add retry fields if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_executions' AND column_name = 'retry_count') THEN
        ALTER TABLE public.workflow_executions ADD COLUMN retry_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_executions' AND column_name = 'max_retries') THEN
        ALTER TABLE public.workflow_executions ADD COLUMN max_retries INTEGER DEFAULT 3;
    END IF;
END $$;

-- ============================================================================
-- SCHEMA CONSISTENCY FIXES
-- ============================================================================

-- Ensure assets table has workflow_id column for linking
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.workflow_executions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Ensure events table has all required columns for comprehensive logging
DO $$
BEGIN
    -- Add entity_type if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'entity_type') THEN
        ALTER TABLE public.events ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'unknown';
    END IF;
    
    -- Add entity_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'entity_id') THEN
        ALTER TABLE public.events ADD COLUMN entity_id TEXT NOT NULL DEFAULT 'unknown';
    END IF;
    
    -- Add sequence_number for ordered events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'sequence_number') THEN
        ALTER TABLE public.events ADD COLUMN sequence_number BIGSERIAL;
    END IF;
    
    -- Add created_by for user tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by') THEN
        ALTER TABLE public.events ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Ensure security columns exist (may have been added in previous migration)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'security_level') THEN
        ALTER TABLE public.events ADD COLUMN security_level TEXT DEFAULT 'info' CHECK (security_level IN ('info', 'warning', 'error', 'critical'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'client_ip') THEN
        ALTER TABLE public.events ADD COLUMN client_ip INET;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'user_agent') THEN
        ALTER TABLE public.events ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Update asset_destinations to include platform_post_id (external platform reference)
ALTER TABLE public.asset_destinations 
ADD COLUMN IF NOT EXISTS platform_post_id TEXT;

-- ============================================================================
-- DEAL TRACKING INTEGRATION TABLES
-- ============================================================================

-- Ensure deal tracking tables work with the unified system
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'qualified', 'negotiating', 'closed_won', 'closed_lost', 'archived')),
    value DECIMAL(12,2),
    currency TEXT DEFAULT 'USD',
    probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    actual_close_date DATE,
    source TEXT,
    contact_info JSONB DEFAULT '{}',
    property_details JSONB DEFAULT '{}',
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal activities/notes table
CREATE TABLE IF NOT EXISTS public.deal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'property_visit', 'document', 'status_change')),
    title TEXT NOT NULL,
    description TEXT,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    outcome TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents/attachments table for both deals and assets
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('asset', 'deal', 'deal_activity')),
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    mime_type TEXT,
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMPREHENSIVE INDEXING STRATEGY
-- ============================================================================

-- Workflow execution indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_asset_id ON public.workflow_executions(asset_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_type ON public.workflow_executions(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON public.workflow_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_webhook_config ON public.workflow_executions(webhook_config_id);

-- Enhanced assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_workflow_id ON public.assets(workflow_id);

-- Enhanced events indexes (additional to existing)
CREATE INDEX IF NOT EXISTS idx_events_sequence_number ON public.events(sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

-- Deal tracking indexes
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON public.deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_created_by ON public.deals(created_by);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON public.deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(created_at DESC);

-- Deal activities indexes
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON public.deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_activity_type ON public.deal_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_deal_activities_activity_date ON public.deal_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_by ON public.deal_activities(created_by);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON public.attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON public.attachments(created_at DESC);

-- ============================================================================
-- UPDATED TRIGGERS FOR CONSISTENCY
-- ============================================================================

-- Add updated_at triggers for new tables
CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON public.workflow_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_activities_updated_at BEFORE UPDATE ON public.deal_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON public.attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENHANCED SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Workflow executions policies (staff only)
CREATE POLICY "Staff can view workflow executions" ON public.workflow_executions FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage workflow executions" ON public.workflow_executions FOR ALL USING (is_staff());

-- Deal policies (users can manage their own deals, staff can see all)
CREATE POLICY "Users can view own deals" ON public.deals FOR SELECT USING (created_by = auth.uid() OR assigned_to = auth.uid() OR is_staff());
CREATE POLICY "Users can manage own deals" ON public.deals FOR ALL USING (created_by = auth.uid() OR is_staff());

-- Deal activities policies
CREATE POLICY "Users can view deal activities" ON public.deal_activities FOR SELECT USING (
    deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid() OR assigned_to = auth.uid()) OR is_staff()
);
CREATE POLICY "Users can manage deal activities" ON public.deal_activities FOR ALL USING (
    deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid() OR assigned_to = auth.uid()) OR is_staff()
);

-- Attachments policies
CREATE POLICY "Users can view attachments" ON public.attachments FOR SELECT USING (
    uploaded_by = auth.uid() OR is_staff() OR
    (entity_type = 'deal' AND entity_id::UUID IN (SELECT id FROM public.deals WHERE created_by = auth.uid() OR assigned_to = auth.uid()))
);
CREATE POLICY "Users can manage own attachments" ON public.attachments FOR ALL USING (uploaded_by = auth.uid() OR is_staff());

-- ============================================================================
-- UNIFIED DATABASE FUNCTIONS
-- ============================================================================

-- Function to get comprehensive entity stats
CREATE OR REPLACE FUNCTION get_platform_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'assets', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.assets),
            'by_status', (
                SELECT jsonb_object_agg(status, count)
                FROM (
                    SELECT status, COUNT(*) as count
                    FROM public.assets
                    GROUP BY status
                ) status_counts
            ),
            'by_content_type', (
                SELECT jsonb_object_agg(content_type, count)
                FROM (
                    SELECT content_type, COUNT(*) as count
                    FROM public.assets
                    GROUP BY content_type
                ) content_counts
            )
        ),
        'workflows', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.workflow_executions),
            'by_status', (
                SELECT jsonb_object_agg(status, count)
                FROM (
                    SELECT status, COUNT(*) as count
                    FROM public.workflow_executions
                    GROUP BY status
                ) workflow_counts
            ),
            'by_type', (
                SELECT jsonb_object_agg(workflow_type, count)
                FROM (
                    SELECT workflow_type, COUNT(*) as count
                    FROM public.workflow_executions
                    GROUP BY workflow_type
                ) type_counts
            )
        ),
        'deals', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.deals),
            'by_status', (
                SELECT jsonb_object_agg(status, count)
                FROM (
                    SELECT status, COUNT(*) as count
                    FROM public.deals
                    GROUP BY status
                ) deal_counts
            ),
            'total_value', (SELECT COALESCE(SUM(value), 0) FROM public.deals WHERE status NOT IN ('closed_lost', 'archived'))
        ),
        'events', jsonb_build_object(
            'total_24h', (SELECT COUNT(*) FROM public.events WHERE created_at >= NOW() - INTERVAL '24 hours'),
            'by_security_level', (
                SELECT jsonb_object_agg(security_level, count)
                FROM (
                    SELECT security_level, COUNT(*) as count
                    FROM public.events
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                    GROUP BY security_level
                ) security_counts
            )
        ),
        'last_updated', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Function to create cross-platform event
CREATE OR REPLACE FUNCTION log_cross_platform_event(
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}',
    p_security_level TEXT DEFAULT 'info',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO public.events (
        entity_type,
        entity_id,
        event_type,
        event_data,
        security_level,
        created_by,
        created_at
    ) VALUES (
        p_entity_type,
        p_entity_id,
        p_event_type,
        p_event_data,
        p_security_level,
        COALESCE(p_created_by, auth.uid()),
        NOW()
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$;

-- ============================================================================
-- DATA INTEGRITY CHECKS
-- ============================================================================

-- Function to validate schema consistency
CREATE OR REPLACE FUNCTION validate_schema_consistency()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check for orphaned workflow executions
    RETURN QUERY
    SELECT 
        'orphaned_workflow_executions'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('Found ' || COUNT(*) || ' workflow executions without valid assets')::TEXT
    FROM public.workflow_executions we
    LEFT JOIN public.assets a ON we.asset_id = a.id
    WHERE a.id IS NULL;
    
    -- Check for orphaned asset destinations
    RETURN QUERY
    SELECT 
        'orphaned_asset_destinations'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('Found ' || COUNT(*) || ' asset destinations without valid assets')::TEXT
    FROM public.asset_destinations ad
    LEFT JOIN public.assets a ON ad.asset_id = a.id
    WHERE a.id IS NULL;
    
    -- Check event data integrity
    RETURN QUERY
    SELECT 
        'events_data_integrity'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('Found ' || COUNT(*) || ' events with invalid security levels')::TEXT
    FROM public.events
    WHERE security_level NOT IN ('info', 'warning', 'error', 'critical');
    
    -- Check for deals without activities in last 30 days for active deals
    RETURN QUERY
    SELECT 
        'stale_active_deals'::TEXT,
        'INFO'::TEXT,
        ('Found ' || COUNT(*) || ' active deals without activity in 30+ days')::TEXT
    FROM public.deals d
    WHERE d.status NOT IN ('closed_won', 'closed_lost', 'archived')
    AND d.id NOT IN (
        SELECT DISTINCT deal_id 
        FROM public.deal_activities 
        WHERE created_at >= NOW() - INTERVAL '30 days'
    );
END;
$$;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attachments TO authenticated;

GRANT EXECUTE ON FUNCTION get_platform_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION log_cross_platform_event TO authenticated;
GRANT EXECUTE ON FUNCTION validate_schema_consistency() TO service_role;

-- ============================================================================
-- INITIAL DATA AND VALIDATION
-- ============================================================================

-- Run initial schema validation
SELECT * FROM validate_schema_consistency();

-- Log migration completion
INSERT INTO public.events (
    entity_type,
    entity_id,
    event_type,
    event_data,
    security_level
) VALUES (
    'migration',
    '20250815000003',
    'system.schema_unification_completed',
    jsonb_build_object(
        'migration_version', '20250815000003',
        'completed_at', NOW(),
        'features_added', ARRAY[
            'workflow_executions_table_unified',
            'deal_tracking_integration',
            'comprehensive_indexing_strategy',
            'cross_platform_event_logging',
            'schema_consistency_validation',
            'unified_security_policies',
            'attachments_system'
        ],
        'tables_unified', ARRAY[
            'assets',
            'workflow_executions', 
            'events',
            'deals',
            'deal_activities',
            'attachments',
            'webhook_configs',
            'asset_destinations'
        ]
    ),
    'info'
);

-- Update platform statistics
SELECT get_platform_statistics();