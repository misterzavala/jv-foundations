-- Unified Authentication System Migration
-- Creates comprehensive role-based access control across platform
-- Created: 2025-08-16

-- ============================================================================
-- USER PROFILES AND ROLES SYSTEM
-- ============================================================================

-- Create user roles enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'staff', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferences JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMPTZ,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- AUTHENTICATION FUNCTIONS
-- ============================================================================

-- Enhanced is_staff function
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'staff') 
        AND is_active = true
    );
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    );
END;
$$;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND is_active = true
        AND (
            role = 'admin' OR 
            permission_name = ANY(permissions)
        )
    );
END;
$$;

-- Function to get user profile
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID DEFAULT NULL)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    profile public.user_profiles;
BEGIN
    -- Use provided user_id or current user
    target_user_id := COALESCE(user_id, auth.uid());
    
    -- Check if user can view this profile
    IF target_user_id != auth.uid() AND NOT is_staff() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    SELECT * INTO profile 
    FROM public.user_profiles 
    WHERE id = target_user_id;
    
    RETURN profile;
END;
$$;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        role,
        permissions
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        CASE 
            WHEN NEW.email LIKE '%@zavala.ai' THEN 'admin'::user_role
            WHEN NEW.email LIKE '%@admin%' THEN 'admin'::user_role
            ELSE 'user'::user_role
        END,
        CASE 
            WHEN NEW.email LIKE '%@zavala.ai' OR NEW.email LIKE '%@admin%' THEN 
                ARRAY[
                    'content_engine.access',
                    'deal_tracker.access',
                    'workflows.manage',
                    'assets.manage',
                    'system.events.view',
                    'users.manage'
                ]
            ELSE 
                ARRAY[
                    'content_engine.access',
                    'deal_tracker.access',
                    'assets.manage'
                ]
        END
    );
    
    -- Log profile creation
    INSERT INTO public.events (
        entity_type,
        entity_id,
        event_type,
        event_data,
        security_level,
        created_by
    ) VALUES (
        'user_profile',
        NEW.id::TEXT,
        'auth.profile_created',
        jsonb_build_object(
            'email', NEW.email,
            'role', CASE 
                WHEN NEW.email LIKE '%@zavala.ai' THEN 'admin'
                WHEN NEW.email LIKE '%@admin%' THEN 'admin'
                ELSE 'user'
            END
        ),
        'info',
        NEW.id
    );
    
    RETURN NEW;
END;
$$;

-- Function to update last seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_profiles 
    SET last_seen_at = NOW()
    WHERE id = auth.uid();
    
    RETURN NULL;
END;
$$;

-- ============================================================================
-- PERMISSION SEEDS
-- ============================================================================

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
    -- Content Engine permissions
    ('content_engine.access', 'Access to content engine features', 'content_engine'),
    ('content_engine.create', 'Create new content assets', 'content_engine'),
    ('content_engine.edit', 'Edit existing content assets', 'content_engine'),
    ('content_engine.delete', 'Delete content assets', 'content_engine'),
    ('content_engine.publish', 'Publish content to platforms', 'content_engine'),
    
    -- Deal Tracker permissions
    ('deal_tracker.access', 'Access to deal tracking features', 'deal_tracker'),
    ('deal_tracker.create', 'Create new deals', 'deal_tracker'),
    ('deal_tracker.edit', 'Edit existing deals', 'deal_tracker'),
    ('deal_tracker.delete', 'Delete deals', 'deal_tracker'),
    ('deal_tracker.view_all', 'View all deals (not just own)', 'deal_tracker'),
    
    -- Workflow permissions
    ('workflows.view', 'View workflow executions', 'workflows'),
    ('workflows.create', 'Create and deploy workflows', 'workflows'),
    ('workflows.manage', 'Full workflow management access', 'workflows'),
    ('workflows.debug', 'Debug workflow executions', 'workflows'),
    
    -- Asset permissions
    ('assets.view', 'View assets', 'assets'),
    ('assets.create', 'Create new assets', 'assets'),
    ('assets.edit', 'Edit existing assets', 'assets'),
    ('assets.delete', 'Delete assets', 'assets'),
    ('assets.manage', 'Full asset management access', 'assets'),
    
    -- System permissions
    ('system.events.view', 'View system events and logs', 'system'),
    ('system.health.view', 'View system health metrics', 'system'),
    ('system.config.edit', 'Edit system configuration', 'system'),
    
    -- User management permissions
    ('users.view', 'View user profiles', 'users'),
    ('users.edit', 'Edit user profiles', 'users'),
    ('users.manage', 'Full user management access', 'users'),
    ('users.delete', 'Delete user accounts', 'users'),
    
    -- Analytics permissions
    ('analytics.view', 'View analytics and reports', 'analytics'),
    ('analytics.export', 'Export analytics data', 'analytics')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Trigger to update updated_at on profile changes
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update last_seen when user performs actions
CREATE OR REPLACE FUNCTION track_user_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update last_seen for authenticated users
    IF auth.uid() IS NOT NULL THEN
        UPDATE public.user_profiles 
        SET last_seen_at = NOW()
        WHERE id = auth.uid();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply activity tracking to key tables
CREATE TRIGGER track_asset_activity 
    AFTER INSERT OR UPDATE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION track_user_activity();

CREATE TRIGGER track_event_activity 
    AFTER INSERT ON public.events
    FOR EACH ROW EXECUTE FUNCTION track_user_activity();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid() OR is_staff());

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid() OR is_admin());

CREATE POLICY "Only admins can delete profiles" ON public.user_profiles
    FOR DELETE USING (is_admin());

CREATE POLICY "Profiles created automatically" ON public.user_profiles
    FOR INSERT WITH CHECK (true); -- Handled by trigger

-- Permissions policies (read-only for most users)
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage permissions" ON public.permissions
    FOR ALL USING (is_admin());

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (user_id = auth.uid() OR is_staff());

CREATE POLICY "Users can manage own sessions" ON public.user_sessions
    FOR ALL USING (user_id = auth.uid() OR is_admin());

-- ============================================================================
-- ENHANCED EXISTING TABLE POLICIES
-- ============================================================================

-- Update existing policies to use new auth functions

-- Assets policies
DROP POLICY IF EXISTS "Users can view assets they created" ON public.assets;
DROP POLICY IF EXISTS "Users can manage own assets" ON public.assets;

CREATE POLICY "Users can view accessible assets" ON public.assets
    FOR SELECT USING (
        created_by = auth.uid() OR 
        is_staff() OR 
        has_permission('assets.view')
    );

CREATE POLICY "Users can manage assets with permission" ON public.assets
    FOR ALL USING (
        (created_by = auth.uid() AND has_permission('assets.manage')) OR
        is_staff() OR
        has_permission('assets.manage')
    );

-- Events policies - enhanced for better security
DROP POLICY IF EXISTS "Staff can view events" ON public.events;
DROP POLICY IF EXISTS "Staff can manage events" ON public.events;

CREATE POLICY "Authorized users can view events" ON public.events
    FOR SELECT USING (
        created_by = auth.uid() OR 
        is_staff() OR 
        has_permission('system.events.view')
    );

CREATE POLICY "System can create events" ON public.events
    FOR INSERT WITH CHECK (true); -- Events created by system/triggers

-- Webhook configs policies
CREATE POLICY "Staff can manage webhook configs" ON public.webhook_configs
    FOR ALL USING (is_staff() OR has_permission('workflows.manage'));

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON public.user_profiles(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON public.permissions(is_active);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;

GRANT EXECUTE ON FUNCTION is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- ============================================================================
-- VALIDATION AND TESTING
-- ============================================================================

-- Function to validate authentication setup
CREATE OR REPLACE FUNCTION validate_auth_setup()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if auth functions work
    RETURN QUERY
    SELECT 
        'auth_functions'::TEXT,
        CASE WHEN is_staff() IS NOT NULL THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Authentication functions are accessible'::TEXT;
    
    -- Check permission count
    RETURN QUERY
    SELECT 
        'permissions_seeded'::TEXT,
        CASE WHEN COUNT(*) >= 20 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('Found ' || COUNT(*) || ' permissions in system')::TEXT
    FROM public.permissions;
    
    -- Check RLS is enabled
    RETURN QUERY
    SELECT 
        'rls_enabled'::TEXT,
        CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('RLS enabled on ' || COUNT(*) || ' auth tables')::TEXT
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('user_profiles', 'permissions', 'user_sessions')
    AND c.relrowsecurity = true;
END;
$$;

-- Log migration completion
INSERT INTO public.events (
    entity_type,
    entity_id,
    event_type,
    event_data,
    security_level
) VALUES (
    'migration',
    '20250816000001',
    'system.auth_system_deployed',
    jsonb_build_object(
        'migration_version', '20250816000001',
        'completed_at', NOW(),
        'features_added', ARRAY[
            'user_profiles_table',
            'role_based_access_control',
            'granular_permissions_system',
            'session_tracking',
            'enhanced_rls_policies',
            'authentication_functions',
            'activity_tracking'
        ],
        'permissions_seeded', (SELECT COUNT(*) FROM public.permissions),
        'default_roles', ARRAY['admin', 'staff', 'user', 'viewer']
    ),
    'info'
);

-- Run validation
SELECT * FROM validate_auth_setup();