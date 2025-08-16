-- Webhook Security Enhancement Migration
-- Adds comprehensive webhook configuration and security tables
-- Created: 2025-08-15

-- ============================================================================
-- WEBHOOK SECURITY TABLES
-- ============================================================================

-- Webhook configurations for secure N8N communication
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    secret_salt TEXT NOT NULL,
    allowed_origins TEXT[] DEFAULT '{"*"}',
    rate_limit_requests INTEGER DEFAULT 100,
    rate_limit_window_minutes INTEGER DEFAULT 15,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Indexes for performance
    CONSTRAINT valid_rate_limit CHECK (rate_limit_requests > 0 AND rate_limit_window_minutes > 0)
);

-- Create indexes for webhook_configs
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON public.webhook_configs(active);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_workflow_type ON public.webhook_configs(workflow_type);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_expires_at ON public.webhook_configs(expires_at);

-- Webhook request logs for monitoring and security
CREATE TABLE IF NOT EXISTS public.webhook_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_config_id UUID REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
    request_ip INET,
    user_agent TEXT,
    request_method TEXT,
    request_path TEXT,
    request_headers JSONB,
    payload_size INTEGER,
    response_status INTEGER,
    response_time_ms INTEGER,
    validation_result TEXT, -- 'success', 'signature_failed', 'rate_limited', etc.
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for webhook_request_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_config_id ON public.webhook_request_logs(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_validation ON public.webhook_request_logs(validation_result);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_ip ON public.webhook_request_logs(request_ip);

-- ============================================================================
-- ENHANCED WORKFLOW EXECUTION TRACKING
-- ============================================================================

-- Add webhook security fields to existing workflow_executions table
ALTER TABLE public.workflow_executions 
ADD COLUMN IF NOT EXISTS webhook_config_id UUID REFERENCES public.webhook_configs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS security_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- Add index for webhook security lookups
CREATE INDEX IF NOT EXISTS idx_workflow_executions_webhook_config ON public.workflow_executions(webhook_config_id);

-- ============================================================================
-- ENHANCED EVENTS TABLE
-- ============================================================================

-- Add security event types and improve indexing
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'info' CHECK (security_level IN ('info', 'warning', 'error', 'critical')),
ADD COLUMN IF NOT EXISTS client_ip INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create indexes for security monitoring
CREATE INDEX IF NOT EXISTS idx_events_security_level ON public.events(security_level);
CREATE INDEX IF NOT EXISTS idx_events_client_ip ON public.events(client_ip);
CREATE INDEX IF NOT EXISTS idx_events_entity_type_id ON public.events(entity_type, entity_id);

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

-- Function to clean up old webhook logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.webhook_request_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Log cleanup event
    INSERT INTO public.events (
        entity_type,
        entity_id,
        event_type,
        event_data
    ) VALUES (
        'system',
        'webhook_cleanup',
        'logs_cleaned',
        jsonb_build_object(
            'cleaned_at', NOW(),
            'retention_days', 30
        )
    );
END;
$$;

-- Function to get webhook security statistics
CREATE OR REPLACE FUNCTION get_webhook_security_stats(
    config_id UUID DEFAULT NULL,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    rate_limited_requests BIGINT,
    unique_ips BIGINT,
    avg_response_time NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE validation_result = 'success') as successful_requests,
        COUNT(*) FILTER (WHERE validation_result != 'success') as failed_requests,
        COUNT(*) FILTER (WHERE validation_result = 'rate_limited') as rate_limited_requests,
        COUNT(DISTINCT request_ip) as unique_ips,
        ROUND(AVG(response_time_ms), 2) as avg_response_time
    FROM public.webhook_request_logs
    WHERE 
        (config_id IS NULL OR webhook_config_id = config_id)
        AND created_at >= NOW() - (hours_back || ' hours')::INTERVAL;
END;
$$;

-- Function to detect suspicious webhook activity
CREATE OR REPLACE FUNCTION detect_suspicious_webhook_activity(
    hours_back INTEGER DEFAULT 1
)
RETURNS TABLE (
    suspicious_ip INET,
    request_count BIGINT,
    failed_count BIGINT,
    failure_rate NUMERIC,
    risk_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ip_stats AS (
        SELECT 
            request_ip,
            COUNT(*) as total_requests,
            COUNT(*) FILTER (WHERE validation_result != 'success') as failed_requests
        FROM public.webhook_request_logs
        WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL
        GROUP BY request_ip
        HAVING COUNT(*) > 10 -- Only consider IPs with significant activity
    )
    SELECT 
        ip_stats.request_ip,
        ip_stats.total_requests,
        ip_stats.failed_requests,
        ROUND((ip_stats.failed_requests::NUMERIC / ip_stats.total_requests::NUMERIC) * 100, 2) as failure_rate,
        CASE 
            WHEN (ip_stats.failed_requests::NUMERIC / ip_stats.total_requests::NUMERIC) > 0.8 THEN 'HIGH'
            WHEN (ip_stats.failed_requests::NUMERIC / ip_stats.total_requests::NUMERIC) > 0.5 THEN 'MEDIUM'
            WHEN ip_stats.total_requests > 100 THEN 'WATCH'
            ELSE 'LOW'
        END as risk_level
    FROM ip_stats
    ORDER BY failure_rate DESC, total_requests DESC;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on webhook tables
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_request_logs ENABLE ROW LEVEL SECURITY;

-- Webhook configs - only creators and admins can manage
CREATE POLICY "webhook_configs_access" ON public.webhook_configs
    FOR ALL USING (
        auth.uid() = created_by 
        OR auth.uid() IN (
            SELECT auth.uid() FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Webhook logs - read-only for creators and admins
CREATE POLICY "webhook_logs_read" ON public.webhook_request_logs
    FOR SELECT USING (
        webhook_config_id IN (
            SELECT id FROM public.webhook_configs 
            WHERE created_by = auth.uid()
        )
        OR auth.uid() IN (
            SELECT auth.uid() FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- ============================================================================
-- SCHEDULED TASKS
-- ============================================================================

-- Note: These would typically be set up with pg_cron extension
-- For now, we'll document the intended schedule

-- Schedule webhook log cleanup (daily at 2 AM)
-- SELECT cron.schedule('webhook-log-cleanup', '0 2 * * *', 'SELECT cleanup_webhook_logs();');

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create default webhook configuration for N8N
INSERT INTO public.webhook_configs (
    id,
    workflow_type,
    secret_hash,
    secret_salt,
    allowed_origins,
    rate_limit_requests,
    rate_limit_window_minutes,
    active
) VALUES (
    'default-n8n-webhook',
    'default',
    '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', -- sha256 of 'default-secret'
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', -- salt
    ARRAY['*'],
    100,
    15,
    true
) ON CONFLICT (id) DO NOTHING;

-- Log migration completion
INSERT INTO public.events (
    entity_type,
    entity_id,
    event_type,
    event_data
) VALUES (
    'migration',
    '20250815000001',
    'webhook_security_migration_completed',
    jsonb_build_object(
        'migration_version', '20250815000001',
        'completed_at', NOW(),
        'features_added', ARRAY[
            'webhook_configs_table',
            'webhook_request_logs_table',
            'security_functions',
            'suspicious_activity_detection',
            'rate_limiting_enhancement'
        ]
    )
);