-- Asset Comments and Approval System Migration
-- Creates comprehensive commenting and approval workflow for assets
-- Created: 2025-08-16

-- ============================================================================
-- ASSET COMMENTS SYSTEM
-- ============================================================================

-- Create comment types enum
DO $$ BEGIN
    CREATE TYPE comment_type AS ENUM ('general', 'approval_request', 'approval_response', 'revision_request');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create comment status enum
DO $$ BEGIN
    CREATE TYPE comment_status AS ENUM ('active', 'resolved', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create asset comments table
CREATE TABLE IF NOT EXISTS public.asset_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.asset_comments(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    comment_type comment_type NOT NULL DEFAULT 'general',
    status comment_status NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- APPROVAL REQUESTS SYSTEM
-- ============================================================================

-- Create approval types enum
DO $$ BEGIN
    CREATE TYPE approval_type AS ENUM ('content_review', 'final_approval', 'legal_review', 'brand_review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create approval status enum
DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create priority enum
DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create approval requests table
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_from UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    approval_type approval_type NOT NULL,
    status approval_status NOT NULL DEFAULT 'pending',
    priority priority_level NOT NULL DEFAULT 'medium',
    deadline TIMESTAMPTZ,
    notes TEXT,
    decision_notes TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ASSET COLLABORATION ENHANCEMENTS
-- ============================================================================

-- Add collaboration fields to assets table
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS collaboration_status TEXT DEFAULT 'open' CHECK (collaboration_status IN ('open', 'review', 'approved', 'locked')),
ADD COLUMN IF NOT EXISTS last_comment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- ============================================================================
-- FUNCTIONS FOR COMMENT SYSTEM
-- ============================================================================

-- Function to update last_comment_at when comments are added
CREATE OR REPLACE FUNCTION update_asset_last_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.assets 
    SET last_comment_at = NOW()
    WHERE id = NEW.asset_id;
    
    RETURN NEW;
END;
$$;

-- Function to get comment thread depth
CREATE OR REPLACE FUNCTION get_comment_thread_depth(comment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    depth INTEGER := 0;
    current_id UUID := comment_id;
    parent_id UUID;
BEGIN
    LOOP
        SELECT parent_comment_id INTO parent_id 
        FROM public.asset_comments 
        WHERE id = current_id;
        
        EXIT WHEN parent_id IS NULL;
        
        depth := depth + 1;
        current_id := parent_id;
        
        -- Prevent infinite loops
        EXIT WHEN depth > 10;
    END LOOP;
    
    RETURN depth;
END;
$$;

-- Function to get asset collaboration summary
CREATE OR REPLACE FUNCTION get_asset_collaboration_summary(p_asset_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'asset_id', p_asset_id,
        'comments', jsonb_build_object(
            'total', (
                SELECT COUNT(*) 
                FROM public.asset_comments 
                WHERE asset_id = p_asset_id AND status = 'active'
            ),
            'unresolved', (
                SELECT COUNT(*) 
                FROM public.asset_comments 
                WHERE asset_id = p_asset_id 
                AND status = 'active' 
                AND comment_type != 'general'
            ),
            'by_type', (
                SELECT jsonb_object_agg(comment_type, count)
                FROM (
                    SELECT comment_type, COUNT(*) as count
                    FROM public.asset_comments
                    WHERE asset_id = p_asset_id AND status = 'active'
                    GROUP BY comment_type
                ) type_counts
            )
        ),
        'approvals', jsonb_build_object(
            'total', (
                SELECT COUNT(*) 
                FROM public.approval_requests 
                WHERE asset_id = p_asset_id
            ),
            'pending', (
                SELECT COUNT(*) 
                FROM public.approval_requests 
                WHERE asset_id = p_asset_id AND status = 'pending'
            ),
            'by_status', (
                SELECT jsonb_object_agg(status, count)
                FROM (
                    SELECT status, COUNT(*) as count
                    FROM public.approval_requests
                    WHERE asset_id = p_asset_id
                    GROUP BY status
                ) status_counts
            )
        ),
        'last_activity', (
            SELECT GREATEST(
                COALESCE(MAX(ac.created_at), '1970-01-01'::timestamptz),
                COALESCE(MAX(ar.created_at), '1970-01-01'::timestamptz)
            )
            FROM public.asset_comments ac
            FULL OUTER JOIN public.approval_requests ar ON ac.asset_id = ar.asset_id
            WHERE COALESCE(ac.asset_id, ar.asset_id) = p_asset_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update last_comment_at on asset when comments are added
CREATE TRIGGER update_asset_last_comment_trigger
    AFTER INSERT ON public.asset_comments
    FOR EACH ROW EXECUTE FUNCTION update_asset_last_comment();

-- Trigger to update updated_at on comments
CREATE TRIGGER update_asset_comments_updated_at 
    BEFORE UPDATE ON public.asset_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on approval requests
CREATE TRIGGER update_approval_requests_updated_at 
    BEFORE UPDATE ON public.approval_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log comment events
CREATE OR REPLACE FUNCTION log_comment_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log comment creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.events (
            entity_type,
            entity_id,
            event_type,
            event_data,
            security_level,
            created_by
        ) VALUES (
            'asset_comment',
            NEW.id::TEXT,
            'comment.created',
            jsonb_build_object(
                'asset_id', NEW.asset_id,
                'comment_type', NEW.comment_type,
                'has_parent', NEW.parent_comment_id IS NOT NULL
            ),
            CASE NEW.comment_type 
                WHEN 'revision_request' THEN 'warning'
                WHEN 'approval_request' THEN 'info'
                ELSE 'info'
            END,
            NEW.user_id
        );
        
        RETURN NEW;
    END IF;
    
    -- Log comment updates
    IF TG_OP = 'UPDATE' THEN
        -- Only log if status changed or text changed
        IF OLD.status != NEW.status OR OLD.comment_text != NEW.comment_text THEN
            INSERT INTO public.events (
                entity_type,
                entity_id,
                event_type,
                event_data,
                security_level,
                created_by
            ) VALUES (
                'asset_comment',
                NEW.id::TEXT,
                CASE 
                    WHEN OLD.status != NEW.status THEN 'comment.status_changed'
                    ELSE 'comment.updated'
                END,
                jsonb_build_object(
                    'asset_id', NEW.asset_id,
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'comment_type', NEW.comment_type
                ),
                'info',
                NEW.user_id
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Trigger to log approval events
CREATE OR REPLACE FUNCTION log_approval_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log approval creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.events (
            entity_type,
            entity_id,
            event_type,
            event_data,
            security_level,
            created_by
        ) VALUES (
            'approval_request',
            NEW.id::TEXT,
            'approval.requested',
            jsonb_build_object(
                'asset_id', NEW.asset_id,
                'approval_type', NEW.approval_type,
                'priority', NEW.priority,
                'requested_from', NEW.requested_from
            ),
            CASE NEW.priority 
                WHEN 'urgent' THEN 'warning'
                WHEN 'high' THEN 'info'
                ELSE 'info'
            END,
            NEW.requested_by
        );
        
        RETURN NEW;
    END IF;
    
    -- Log approval updates
    IF TG_OP = 'UPDATE' THEN
        -- Only log if status changed
        IF OLD.status != NEW.status THEN
            INSERT INTO public.events (
                entity_type,
                entity_id,
                event_type,
                event_data,
                security_level,
                created_by
            ) VALUES (
                'approval_request',
                NEW.id::TEXT,
                'approval.' || NEW.status::TEXT,
                jsonb_build_object(
                    'asset_id', NEW.asset_id,
                    'approval_type', NEW.approval_type,
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'decision_notes', NEW.decision_notes
                ),
                CASE NEW.status 
                    WHEN 'rejected' THEN 'warning'
                    WHEN 'approved' THEN 'info'
                    ELSE 'info'
                END,
                auth.uid()
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Apply event logging triggers
CREATE TRIGGER log_comment_events_trigger
    AFTER INSERT OR UPDATE ON public.asset_comments
    FOR EACH ROW EXECUTE FUNCTION log_comment_events();

CREATE TRIGGER log_approval_events_trigger
    AFTER INSERT OR UPDATE ON public.approval_requests
    FOR EACH ROW EXECUTE FUNCTION log_approval_events();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Asset comments indexes
CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_id ON public.asset_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_user_id ON public.asset_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_parent_id ON public.asset_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_type_status ON public.asset_comments(comment_type, status);
CREATE INDEX IF NOT EXISTS idx_asset_comments_created_at ON public.asset_comments(created_at DESC);

-- Approval requests indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_asset_id ON public.approval_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_from ON public.approval_requests(requested_from);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_priority ON public.approval_requests(priority);
CREATE INDEX IF NOT EXISTS idx_approval_requests_deadline ON public.approval_requests(deadline);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_approval_requests_user_pending ON public.approval_requests(requested_from, status) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_active ON public.asset_comments(asset_id, status) 
    WHERE status = 'active';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.asset_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Asset comments policies
CREATE POLICY "Users can view comments on accessible assets" ON public.asset_comments
    FOR SELECT USING (
        asset_id IN (
            SELECT id FROM public.assets 
            WHERE created_by = auth.uid() 
            OR assignee_id = auth.uid()
            OR collaboration_status = 'open'
        ) OR is_staff()
    );

CREATE POLICY "Users can add comments to accessible assets" ON public.asset_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND (
            asset_id IN (
                SELECT id FROM public.assets 
                WHERE created_by = auth.uid() 
                OR assignee_id = auth.uid()
                OR collaboration_status = 'open'
            ) OR is_staff()
        )
    );

CREATE POLICY "Users can update own comments" ON public.asset_comments
    FOR UPDATE USING (user_id = auth.uid() OR is_staff());

CREATE POLICY "Users can delete own comments" ON public.asset_comments
    FOR DELETE USING (user_id = auth.uid() OR is_staff());

-- Approval requests policies
CREATE POLICY "Users can view relevant approval requests" ON public.approval_requests
    FOR SELECT USING (
        requested_by = auth.uid() 
        OR requested_from = auth.uid() 
        OR asset_id IN (
            SELECT id FROM public.assets 
            WHERE created_by = auth.uid() OR assignee_id = auth.uid()
        )
        OR is_staff()
    );

CREATE POLICY "Users can create approval requests for accessible assets" ON public.approval_requests
    FOR INSERT WITH CHECK (
        requested_by = auth.uid() AND (
            asset_id IN (
                SELECT id FROM public.assets 
                WHERE created_by = auth.uid() OR assignee_id = auth.uid()
            ) OR is_staff()
        )
    );

CREATE POLICY "Users can respond to their approval requests" ON public.approval_requests
    FOR UPDATE USING (requested_from = auth.uid() OR is_staff());

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;

GRANT EXECUTE ON FUNCTION get_comment_thread_depth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_asset_collaboration_summary(UUID) TO authenticated;

-- ============================================================================
-- INITIAL DATA AND VALIDATION
-- ============================================================================

-- Create sample comment types for reference
INSERT INTO public.events (
    entity_type,
    entity_id,
    event_type,
    event_data,
    security_level
) VALUES (
    'migration',
    '20250816000002',
    'system.comments_approval_system_deployed',
    jsonb_build_object(
        'migration_version', '20250816000002',
        'completed_at', NOW(),
        'features_added', ARRAY[
            'asset_comments_table',
            'approval_requests_table',
            'threaded_comment_system',
            'approval_workflow_management',
            'collaboration_status_tracking',
            'comment_event_logging',
            'approval_event_logging',
            'comprehensive_rls_policies'
        ],
        'comment_types', ARRAY['general', 'approval_request', 'approval_response', 'revision_request'],
        'approval_types', ARRAY['content_review', 'final_approval', 'legal_review', 'brand_review'],
        'priority_levels', ARRAY['low', 'medium', 'high', 'urgent']
    ),
    'info'
);

-- Log migration completion
SELECT 'Asset Comments and Approval System migration completed successfully' as status;