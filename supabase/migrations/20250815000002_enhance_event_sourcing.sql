-- Event Sourcing Enhancement Migration
-- Optimizes events table and adds comprehensive indexing for performance
-- Created: 2025-08-15

-- ============================================================================
-- EVENTS TABLE ENHANCEMENTS
-- ============================================================================

-- Add indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_events_entity_type_created_at ON public.events(entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_entity_id_created_at ON public.events(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_type_created_at ON public.events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_security_level_created_at ON public.events(security_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_by_created_at ON public.events(created_by, created_at DESC);

-- Composite indexes for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_events_entity_type_event_type ON public.events(entity_type, event_type);
CREATE INDEX IF NOT EXISTS idx_events_entity_type_security_level ON public.events(entity_type, security_level);

-- JSONB indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_events_metadata_correlation_id ON public.events USING GIN ((event_data->>'correlation_id'));
CREATE INDEX IF NOT EXISTS idx_events_metadata_trace_id ON public.events USING GIN ((event_data->>'trace_id'));
CREATE INDEX IF NOT EXISTS idx_events_metadata_source ON public.events USING GIN ((event_data->>'source'));

-- Full-text search index for event data
CREATE INDEX IF NOT EXISTS idx_events_event_data_gin ON public.events USING GIN (event_data);

-- ============================================================================
-- EVENT STATISTICS MATERIALIZED VIEW
-- ============================================================================

-- Create materialized view for fast event statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.event_statistics AS
SELECT 
    entity_type,
    event_type,
    security_level,
    COUNT(*) as event_count,
    MAX(created_at) as latest_event,
    MIN(created_at) as first_event,
    DATE_TRUNC('hour', created_at) as hour_bucket
FROM public.events
GROUP BY entity_type, event_type, security_level, DATE_TRUNC('hour', created_at);

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_event_stats_entity_type ON public.event_statistics(entity_type);
CREATE INDEX IF NOT EXISTS idx_event_stats_event_type ON public.event_statistics(event_type);
CREATE INDEX IF NOT EXISTS idx_event_stats_security_level ON public.event_statistics(security_level);
CREATE INDEX IF NOT EXISTS idx_event_stats_hour_bucket ON public.event_statistics(hour_bucket DESC);

-- ============================================================================
-- EVENT AGGREGATION FUNCTIONS
-- ============================================================================

-- Function to refresh event statistics
CREATE OR REPLACE FUNCTION refresh_event_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.event_statistics;
END;
$$;

-- Function to get hourly event distribution
CREATE OR REPLACE FUNCTION get_hourly_event_distribution(
    hours_back INTEGER DEFAULT 24,
    entity_type_filter TEXT DEFAULT NULL,
    security_level_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    hour_bucket TIMESTAMPTZ,
    event_count BIGINT,
    error_count BIGINT,
    critical_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('hour', e.created_at) as hour_bucket,
        COUNT(*) as event_count,
        COUNT(*) FILTER (WHERE e.security_level = 'error') as error_count,
        COUNT(*) FILTER (WHERE e.security_level = 'critical') as critical_count
    FROM public.events e
    WHERE 
        e.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
        AND (entity_type_filter IS NULL OR e.entity_type = entity_type_filter)
        AND (security_level_filter IS NULL OR e.security_level = security_level_filter)
    GROUP BY DATE_TRUNC('hour', e.created_at)
    ORDER BY hour_bucket DESC;
END;
$$;

-- Function to get top error events
CREATE OR REPLACE FUNCTION get_top_error_events(
    hours_back INTEGER DEFAULT 24,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    event_type TEXT,
    entity_type TEXT,
    error_count BIGINT,
    latest_occurrence TIMESTAMPTZ,
    sample_error_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.event_type,
        e.entity_type,
        COUNT(*) as error_count,
        MAX(e.created_at) as latest_occurrence,
        (ARRAY_AGG(e.event_data ORDER BY e.created_at DESC))[1] as sample_error_data
    FROM public.events e
    WHERE 
        e.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
        AND e.security_level IN ('error', 'critical')
    GROUP BY e.event_type, e.entity_type
    ORDER BY error_count DESC
    LIMIT limit_count;
END;
$$;

-- Function to get event trends
CREATE OR REPLACE FUNCTION get_event_trends(
    hours_back INTEGER DEFAULT 168, -- 1 week
    bucket_size TEXT DEFAULT 'hour' -- 'hour', 'day', 'week'
)
RETURNS TABLE (
    time_bucket TIMESTAMPTZ,
    total_events BIGINT,
    asset_events BIGINT,
    workflow_events BIGINT,
    security_events BIGINT,
    error_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bucket_interval TEXT;
BEGIN
    -- Set bucket interval based on bucket_size
    CASE bucket_size
        WHEN 'hour' THEN bucket_interval := 'hour';
        WHEN 'day' THEN bucket_interval := 'day';
        WHEN 'week' THEN bucket_interval := 'week';
        ELSE bucket_interval := 'hour';
    END CASE;

    RETURN QUERY
    EXECUTE format('
        SELECT 
            DATE_TRUNC(%L, e.created_at) as time_bucket,
            COUNT(*) as total_events,
            COUNT(*) FILTER (WHERE e.entity_type = ''asset'') as asset_events,
            COUNT(*) FILTER (WHERE e.entity_type = ''workflow'') as workflow_events,
            COUNT(*) FILTER (WHERE e.entity_type = ''security'') as security_events,
            ROUND(
                (COUNT(*) FILTER (WHERE e.security_level IN (''error'', ''critical''))::NUMERIC / 
                 NULLIF(COUNT(*), 0)::NUMERIC) * 100, 2
            ) as error_rate
        FROM public.events e
        WHERE e.created_at >= NOW() - (%L || '' hours'')::INTERVAL
        GROUP BY DATE_TRUNC(%L, e.created_at)
        ORDER BY time_bucket DESC',
        bucket_interval, hours_back, bucket_interval
    );
END;
$$;

-- ============================================================================
-- EVENT RETENTION POLICY
-- ============================================================================

-- Function to clean up old events based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_events(
    retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete events older than retention period
    WITH deleted AS (
        DELETE FROM public.events 
        WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log cleanup event
    INSERT INTO public.events (
        entity_type,
        entity_id,
        event_type,
        event_data,
        security_level
    ) VALUES (
        'system',
        'event_cleanup',
        'system.event_cleanup_completed',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'retention_days', retention_days,
            'cleanup_time', NOW()
        ),
        'info'
    );
    
    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR REAL-TIME STATISTICS
-- ============================================================================

-- Function to update statistics on new events
CREATE OR REPLACE FUNCTION update_event_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh statistics view periodically (every 1000 events)
    IF (SELECT COUNT(*) FROM public.events WHERE created_at > NOW() - INTERVAL '1 hour') % 1000 = 0 THEN
        PERFORM refresh_event_statistics();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic statistics updates
DROP TRIGGER IF EXISTS trigger_update_event_statistics ON public.events;
CREATE TRIGGER trigger_update_event_statistics
    AFTER INSERT ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_event_statistics();

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for system health monitoring
CREATE OR REPLACE VIEW public.system_health_summary AS
SELECT 
    COUNT(*) as total_events_24h,
    COUNT(*) FILTER (WHERE security_level = 'critical') as critical_events_24h,
    COUNT(*) FILTER (WHERE security_level = 'error') as error_events_24h,
    COUNT(*) FILTER (WHERE security_level = 'warning') as warning_events_24h,
    ROUND(
        (COUNT(*) FILTER (WHERE security_level IN ('error', 'critical'))::NUMERIC / 
         NULLIF(COUNT(*), 0)::NUMERIC) * 100, 2
    ) as error_rate_24h,
    COUNT(DISTINCT entity_type) as active_entity_types,
    MAX(created_at) as latest_event_time
FROM public.events
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- View for top active entities
CREATE OR REPLACE VIEW public.top_active_entities AS
SELECT 
    entity_type,
    entity_id,
    COUNT(*) as event_count,
    MAX(created_at) as latest_activity,
    COUNT(*) FILTER (WHERE security_level IN ('error', 'critical')) as error_count
FROM public.events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY entity_type, entity_id
ORDER BY event_count DESC
LIMIT 50;

-- ============================================================================
-- SCHEDULED MAINTENANCE
-- ============================================================================

-- Note: These would typically be set up with pg_cron extension
-- Schedule event cleanup (daily at 3 AM)
-- SELECT cron.schedule('event-cleanup', '0 3 * * *', 'SELECT cleanup_old_events();');

-- Schedule statistics refresh (every hour)
-- SELECT cron.schedule('stats-refresh', '0 * * * *', 'SELECT refresh_event_statistics();');

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for the event sourcing service
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT SELECT ON public.event_statistics TO authenticated;
GRANT SELECT ON public.system_health_summary TO authenticated;
GRANT SELECT ON public.top_active_entities TO authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_event_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_error_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_trends TO authenticated;

-- Grant admin functions to service role
GRANT EXECUTE ON FUNCTION cleanup_old_events TO service_role;
GRANT EXECUTE ON FUNCTION refresh_event_statistics TO service_role;

-- ============================================================================
-- INITIAL DATA AND SETUP
-- ============================================================================

-- Refresh initial statistics
SELECT refresh_event_statistics();

-- Log migration completion
INSERT INTO public.events (
    entity_type,
    entity_id,
    event_type,
    event_data,
    security_level
) VALUES (
    'migration',
    '20250815000002',
    'system.migration_completed',
    jsonb_build_object(
        'migration_version', '20250815000002',
        'completed_at', NOW(),
        'features_added', ARRAY[
            'event_table_optimization',
            'performance_indexes',
            'materialized_view_statistics',
            'event_aggregation_functions',
            'retention_policy',
            'real_time_monitoring'
        ]
    ),
    'info'
);