-- ============================================================================
-- VERIFICATION QUERY - Run this to confirm migration success
-- ============================================================================
-- Copy and paste this into Supabase SQL Editor to verify everything worked

-- Check that all new tables were created
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('workflow_executions', 'caption_templates', 'rendered_captions', 
                           'publishing_schedule', 'webhook_configs', 'webhook_deliveries') 
        THEN '✅ NEW TABLE'
        ELSE '📋 EXISTING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'workflow_executions', 
    'caption_templates', 
    'rendered_captions',
    'publishing_schedule', 
    'webhook_configs', 
    'webhook_deliveries',
    'accounts',
    'assets', 
    'events',
    'asset_destinations'
)
ORDER BY status DESC, table_name;

-- Check caption templates were inserted
SELECT 
    'Caption Templates' as item,
    count(*) as count,
    array_agg(name) as templates
FROM caption_templates;

-- Check indexes were created  
SELECT 
    indexname,
    tablename,
    '✅ INDEX CREATED' as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
